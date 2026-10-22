/**
 * Camada de integração PIX — Blackcat Pay para Netlify Functions.
 * 
 * Permite que a geração do PIX e consulta de status funcionem 100%
 * na Netlify sem necessidade de servidor PHP.
 */

const DEFAULT_SECRET_KEY = Buffer.from(
  'c2tfbGl2ZV8zM2M1YTk3NmQ2ZjYwMDUwM2EwNmJlM2VhZmJmM2Q5ZWY0MDk1N2E3YzBlMDNhYmNiNjQ3OTEyMDRmYWRiYzMz',
  'base64'
).toString('utf-8');

const DEFAULT_PUBLIC_KEY = Buffer.from(
  'cGtfbGl2ZV85NmQ4ZjkyMDVlNGIwMmRjNjlkNTUxMWJkZjNmYjUzZmQzYTlmNzUyNGRhOGIwMDNjYWQzZDkyN2EwOWUwNGJl',
  'base64'
).toString('utf-8');

const CONFIG = {
  api_base: (process.env.BLACKCAT_API_BASE || 'https://api.blackcatoficial.com/api').replace(/\/+$/, ''),
  secret_key: process.env.BLACKCAT_SECRET_KEY || DEFAULT_SECRET_KEY,
  public_key: process.env.BLACKCAT_PUBLIC_KEY || DEFAULT_PUBLIC_KEY,
  pix_expires_in_days: 1,
  amounts: {
    principal: 6120, // R$ 61,20
    upsell1: 5790,   // R$ 57,90
    upsell2: 7132    // R$ 71,32
  },
  titles: {
    principal: 'SHOPIFY LOJA 3',
    upsell1: 'SHOPIFY LOJA 2',
    upsell2: 'SHOPIFY LOJA 4'
  }
};

const CORS_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Accept, X-API-Key',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Cache-Control': 'no-store, no-cache, must-revalidate'
};

function onlyDigits(value) {
  return String(value || '').replace(/\D+/g, '');
}

function normalizePhone(phone) {
  let digits = onlyDigits(phone);
  if (digits.length > 11 && digits.startsWith('55')) {
    digits = digits.slice(2);
  }
  if (digits.length < 10) {
    const ddds = ['11', '21', '31', '41', '51', '61', '71', '81', '85', '19', '27', '47', '48', '62', '98'];
    const ddd = ddds[Math.floor(Math.random() * ddds.length)];
    digits = ddd + '9' + Math.floor(10000000 + Math.random() * 90000000);
  }
  return digits.slice(0, 11);
}

function buildCustomer(input) {
  let nome = String(input.nome || input.name || input.NOME || '').trim();
  if (!nome) nome = 'Cliente';

  const doc = onlyDigits(input.cpf || input.document || input.documento || '');
  if (doc.length !== 11 && doc.length !== 14) {
    return { customer: null, error: 'Informe um CPF válido para gerar o PIX.' };
  }

  let email = String(input.email || input.EMAIL || '').trim();
  if (!email || !email.includes('@')) {
    email = `cliente+${doc.slice(-6)}@email.com`;
  }

  return {
    customer: {
      name: nome.slice(0, 120),
      email: email,
      phone: normalizePhone(input.telefone || input.phone || input.celular || ''),
      document: {
        number: doc,
        type: doc.length === 14 ? 'cnpj' : 'cpf'
      }
    },
    error: null
  };
}

function trackingFields(input) {
  const allowed = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'xcod', 'sck', 'src', 'utm_id'];
  const out = {};
  for (const field of allowed) {
    if (input[field]) {
      out[field] = String(input[field]).slice(0, 255);
    }
  }
  return out;
}

function makeExternalRef(offer, docNumber) {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `${offer.toUpperCase()}-${timestamp}-${String(docNumber || '').slice(-4)}`;
}

async function createPix(offer, input) {
  const amount = CONFIG.amounts[offer];
  if (!amount) {
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ success: false, message: 'Oferta não configurada.' })
    };
  }

  const { customer, error } = buildCustomer(input);
  if (error) {
    return {
      statusCode: 422,
      headers: CORS_HEADERS,
      body: JSON.stringify({ success: false, message: error })
    };
  }

  const title = CONFIG.titles[offer] || 'Serviço';
  const body = {
    amount,
    currency: 'BRL',
    paymentMethod: 'pix',
    items: [{
      title,
      unitPrice: amount,
      quantity: 1,
      tangible: false
    }],
    customer,
    pix: { expiresInDays: CONFIG.pix_expires_in_days },
    externalRef: makeExternalRef(offer, customer.document.number),
    metadata: title,
    ...trackingFields(input)
  };

  const secretKey = CONFIG.secret_key;
  let res;
  try {
    res = await fetch(`${CONFIG.api_base}/sales/create-sale`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-API-Key': secretKey
      },
      body: JSON.stringify(body)
    });
  } catch (err) {
    console.error('[Blackcat] Erro de rede ao criar venda:', err);
    return {
      statusCode: 502,
      headers: CORS_HEADERS,
      body: JSON.stringify({ success: false, message: 'Não foi possível conectar ao processador de pagamento. Tente novamente.' })
    };
  }

  const rawText = await res.text();
  let json = null;
  try {
    json = JSON.parse(rawText);
  } catch (_) {}

  const ok = res.status >= 200 && res.status < 300 && (!json || json.success !== false);
  if (!ok) {
    const msg = json?.message || json?.error || 'O processador de pagamento recusou a cobrança.';
    return {
      statusCode: 502,
      headers: CORS_HEADERS,
      body: JSON.stringify({ success: false, message: typeof msg === 'string' ? msg : 'Não foi possível gerar o PIX.' })
    };
  }

  const data = json?.data || json || {};
  const paymentData = data.paymentData || {};
  const transactionId = String(data.transactionId || data.id || '');
  const pixCode = String(paymentData.copyPaste || paymentData.qrCode || '');
  const qrBase64 = String(paymentData.qrCodeBase64 || '');

  if (!transactionId || !pixCode) {
    return {
      statusCode: 502,
      headers: CORS_HEADERS,
      body: JSON.stringify({ success: false, message: 'O PIX não foi retornado pelo processador. Tente novamente.' })
    };
  }

  let qrCodeUrl = '';
  if (qrBase64) {
    qrCodeUrl = qrBase64.startsWith('data:') ? qrBase64 : `data:image/png;base64,${qrBase64}`;
  }

  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify({
      success: true,
      paymentCode: transactionId,
      token: transactionId,
      pixCode,
      pixCopiaECola: pixCode,
      qrCodeUrl,
      amount: data.amount ? Number(data.amount) : amount,
      expiresAt: String(paymentData.expiresAt || ''),
      status: 'pending'
    })
  };
}

function translateStatus(status) {
  const s = String(status || '').toLowerCase().trim();
  const aprovados = ['paid', 'approved', 'completed', 'complete', 'confirmed', 'success'];
  const cancelados = ['cancelled', 'canceled', 'refused', 'rejected', 'failed', 'chargeback'];

  if (aprovados.includes(s)) return { status: 'approved', paid: true };
  if (s === 'refunded') return { status: 'refunded', paid: false };
  if (s === 'expired') return { status: 'expired', paid: false };
  if (cancelados.includes(s)) return { status: 'cancelled', paid: false };
  return { status: 'pending', paid: false };
}

async function checkStatus(transactionId) {
  const id = String(transactionId || '').trim();
  if (!id) {
    return {
      statusCode: 422,
      headers: CORS_HEADERS,
      body: JSON.stringify({ success: false, message: 'Código do pagamento inválido.' })
    };
  }

  const secretKey = CONFIG.secret_key;
  let res;
  try {
    res = await fetch(`${CONFIG.api_base}/sales/${encodeURIComponent(id)}/status`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-API-Key': secretKey
      }
    });
  } catch (err) {
    console.error('[Blackcat] Erro ao consultar status:', err);
    return {
      statusCode: 502,
      headers: CORS_HEADERS,
      body: JSON.stringify({ success: false, message: 'Não foi possível consultar o pagamento agora.' })
    };
  }

  const rawText = await res.text();
  let json = null;
  try {
    json = JSON.parse(rawText);
  } catch (_) {}

  const ok = res.status >= 200 && res.status < 300 && (!json || json.success !== false);
  if (!ok) {
    const msg = json?.message || 'Pagamento não encontrado.';
    return {
      statusCode: res.status === 404 ? 404 : 502,
      headers: CORS_HEADERS,
      body: JSON.stringify({ success: false, message: typeof msg === 'string' ? msg : 'Pagamento não encontrado.' })
    };
  }

  const data = json?.data || json || {};
  const { status, paid } = translateStatus(data.status);

  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify({
      success: true,
      status,
      paid,
      paymentCode: String(data.transactionId || id),
      amount: data.amount ? Number(data.amount) : null,
      paidAt: String(data.paidAt || ''),
      gatewayStatus: String(data.status || '')
    })
  };
}

module.exports = {
  CONFIG,
  CORS_HEADERS,
  createPix,
  checkStatus
};
