'use strict';

// Pasta checkout e pasta up2 devem ficar lado a lado.
const CONFIG = {
  apiBase: '../checkout/',
  // Cole aqui o link do entregável, se quiser redirecionar após a aprovação.
  afterPaidUrl: '',
  amount: 7132,
};

const byId = id => document.getElementById(id);
const form = byId('payment-form');
const dialog = byId('pix-dialog');
const payButton = byId('pay-button');
const fields = ['nome', 'email', 'cpf', 'telefone'];
const paymentKey = 'checkout-up2-pix:' + location.pathname;
let activePayment = null;
let timer = null;
let polling = false;
let creating = false;
let previousFocus = null;
const documentData = { nascimento: '', municipio: '', uf: '' };

function readStored(storage, key) {
  try {
    let value = JSON.parse(storage.getItem(key) || 'null');
    if (typeof value === 'string') value = JSON.parse(value || 'null');
    return value;
  } catch { return null; }
}
function storePayment(payment) {
  try {
    if (payment) sessionStorage.setItem(paymentKey, JSON.stringify(payment));
    else sessionStorage.removeItem(paymentKey);
  } catch { /* A cobrança continua disponível na página sem armazenamento. */ }
}
function pageMessage(text, error = false) {
  byId('page-message').textContent = text;
  byId('page-message').className = 'message' + (error ? ' error' : '');
  byId('page-message').hidden = !text;
}
async function requestJson(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);
  try {
    let response = await fetch(new URL(path, new URL(CONFIG.apiBase, location.href)), {
      credentials: 'same-origin', cache: 'no-store', ...options, signal: controller.signal,
    });
    if (!response.ok && response.status === 404) {
      let functionPath = path;
      if (path.includes('verificar.php')) {
        const queryIndex = path.indexOf('?');
        functionPath = '/.netlify/functions/verificar' + (queryIndex !== -1 ? path.slice(queryIndex) : '');
      } else if (path.includes('pagamento-upsell2.php')) {
        functionPath = '/.netlify/functions/pagamento-upsell2';
      } else if (path.includes('dados-cliente.php')) {
        functionPath = '/.netlify/functions/dados-cliente';
      }
      if (functionPath !== path) {
        response = await fetch(functionPath, {
          cache: 'no-store', ...options, signal: controller.signal,
        });
      }
    }
    let data;
    try { data = await response.json(); }
    catch { throw new Error('O servidor não retornou uma resposta válida. Confira os arquivos da pasta checkout.'); }
    if (!response.ok || data.success !== true) throw new Error(data.message || 'Não foi possível concluir a solicitação.');
    return data;
  } finally { clearTimeout(timeout); }
}
function normalizeCustomer(value) {
  if (!value || typeof value !== 'object') return null;
  const data = value.customer || value.cliente || value.DADOS || value.dados || value;
  const address = data.address || data.endereco || {};
  return {
    nome: data.nome || data.NOME || data.name || data.fullName || '',
    email: data.email || data.EMAIL || '',
    cpf: data.cpf || data.CPF || data.document || data.documento || '',
    telefone: data.telefone || data.TELEFONE || data.phone || data.celular || '',
    nascimento: data.nascimento || data.NASC || data.NASCIMENTO || data.data_nascimento || data.dataNascimento || data.birthDate || '',
    municipio: data.municipio || data.MUNICIPIO || data.cidade || data.CIDADE || data.city || address.city || address.cidade || '',
    uf: data.uf || data.UF || data.estado || data.ESTADO || data.state || address.state || address.uf || '',
  };
}
function populateCustomer(value) {
  const customer = normalizeCustomer(value);
  if (!customer) return;
  for (const key of fields) {
    if (!byId(key).value && typeof customer[key] === 'string') byId(key).value = customer[key];
  }
  for (const key of Object.keys(documentData)) {
    if (!documentData[key] && typeof customer[key] === 'string') documentData[key] = customer[key];
  }
  renderDocument();
}
function formattedBirth(value) {
  const text = String(value || '').trim();
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|[ T])/);
  const brazilian = text.match(/^(\d{2})[\/.-](\d{2})[\/.-](\d{4})$/);
  if (iso) return iso[3] + '/' + iso[2] + '/' + iso[1];
  if (brazilian) return brazilian[1] + '/' + brazilian[2] + '/' + brazilian[3];
  return 'Não informado';
}
function renderDocument() {
  byId('document-name').textContent = byId('nome').value.trim().toLocaleUpperCase('pt-BR') || 'Não informado';
  byId('document-birth').textContent = formattedBirth(documentData.nascimento);
  byId('document-city').textContent = [documentData.municipio, documentData.uf].filter(Boolean).join(' / ').toLocaleUpperCase('pt-BR') || 'Não informado';
  byId('document-issued').textContent = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' }).format(new Date());
}
byId('nome').addEventListener('input', renderDocument);
renderDocument();
function legacyCustomer() {
  // Compatibilidade com dados que a página anterior já tenha salvo no navegador.
  for (const storageName of ['sessionStorage', 'localStorage']) {
    let storage;
    try { storage = window[storageName]; } catch { continue; }
    for (const key of ['checkoutCliente', 'desenrola.pagamento', 'cdt_esa', 'customerData', 'checkoutData', 'dadosCliente', 'cliente', 'customer']) {
      populateCustomer(readStored(storage, key));
    }
    for (const key of fields) {
      try { if (!byId(key).value) byId(key).value = storage.getItem(key) || ''; } catch {}
    }
    const additional = {};
    for (const key of ['nascimento', 'NASC', 'NASCIMENTO', 'data_nascimento', 'dataNascimento', 'municipio', 'MUNICIPIO', 'cidade', 'CIDADE', 'uf', 'UF', 'estado']) {
      try { additional[key] = storage.getItem(key) || ''; } catch {}
    }
    populateCustomer(additional);
    try { if (!byId('cpf').value) byId('cpf').value = storage.getItem('cd_esa') || ''; } catch {}
  }
}
function trackingData() {
  const names = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'utm_id', 'xcod', 'sck', 'src', 'fbclid', 'gclid', 'ttclid'];
  const query = new URLSearchParams(location.search);
  const data = {};
  let saved = null;
  try { saved = readStored(sessionStorage, 'desenrola.pagamento'); } catch {}
  for (const name of names) {
    let value = query.get(name) || (saved && saved[name]);
    try { value = value || localStorage.getItem(name); } catch {}
    if (value) data[name] = value;
  }
  return data;
}
function openDialog() {
  previousFocus = document.activeElement;
  if (!dialog.open) dialog.showModal();
}
function closeDialog() {
  dialog.close();
  if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus();
}
byId('close-dialog').addEventListener('click', closeDialog);
dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const rect = dialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeDialog();
});
byId('qr-image').addEventListener('error', () => {
  byId('qr-image').hidden = true;
  byId('qr-message').textContent = 'Não foi possível exibir a imagem. Use o código PIX copia e cola abaixo.';
  byId('qr-message').hidden = false;
});
function renderPayment(payment) {
  byId('pix-code').value = payment.pixCode;
  byId('qr-image').hidden = !payment.qrCodeUrl;
  byId('qr-message').hidden = Boolean(payment.qrCodeUrl);
  byId('qr-message').textContent = 'Use o código PIX copia e cola abaixo para pagar.';
  if (payment.qrCodeUrl) byId('qr-image').src = payment.qrCodeUrl;
  byId('pix-status').innerHTML = '<span class="dot"></span>Aguardando pagamento';
  byId('expires').textContent = '';
  if (payment.expiresAt) {
    const date = new Date(payment.expiresAt.includes('T') ? payment.expiresAt : payment.expiresAt.replace(' ', 'T'));
    if (!Number.isNaN(date.getTime())) byId('expires').textContent = 'Válido até ' + date.toLocaleString('pt-BR');
  }
  payButton.textContent = 'Emitir meu novo título online';
}
function stopPolling() { if (timer) clearTimeout(timer); timer = null; }
function confirmed() {
  stopPolling();
  activePayment = null;
  storePayment(null);
  if (dialog.open) closeDialog();
  form.hidden = true;
  byId('paid-panel').hidden = false;
  if (CONFIG.afterPaidUrl) {
    const destination = new URL(CONFIG.afterPaidUrl, location.href);
    const current = new URLSearchParams(location.search);
    for (const [key, value] of current) if (!destination.searchParams.has(key)) destination.searchParams.set(key, value);
    byId('continue-link').href = destination.href;
    byId('continue-link').hidden = false;
    setTimeout(() => location.assign(destination.href), 1500);
  }
}
async function pollPayment() {
  if (!activePayment || polling) return;
  polling = true;
  const code = activePayment.paymentCode;
  try {
    const data = await requestJson('verificar.php?id=' + encodeURIComponent(code));
    if (!activePayment || activePayment.paymentCode !== code) return;
    if (data.paid === true || data.status === 'approved') { confirmed(); return; }
    if (['expired', 'cancelled', 'canceled', 'refused', 'failed'].includes(data.status)) {
      stopPolling();
      activePayment = null;
      storePayment(null);
      if (dialog.open) closeDialog();
      payButton.textContent = 'Clique aqui para efetuar o pagamento';
      pageMessage('Este PIX não está mais disponível. Clique no botão para emitir outro.', true);
      return;
    }
    byId('pix-status').innerHTML = '<span class="dot"></span>Aguardando pagamento';
  } catch {
    byId('pix-status').textContent = 'Aguardando confirmação. Consultando novamente…';
  } finally {
    polling = false;
    if (activePayment) timer = setTimeout(pollPayment, 5000);
  }
}
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (creating) return;
  if (activePayment) { renderPayment(activePayment); openDialog(); return; }
  if (!form.checkValidity()) {
    document.querySelector('.customer-details').open = true;
    form.reportValidity();
    return;
  }
  const customer = Object.fromEntries(fields.map(key => [key, byId(key).value.trim()]));
  const cpf = customer.cpf.replace(/\D/g, '');
  const phone = customer.telefone.replace(/\D/g, '');
  if (![11, 14].includes(cpf.length)) { pageMessage('Confira o CPF ou CNPJ.', true); byId('cpf').focus(); return; }
  if (phone.length < 10 || phone.length > 15) { pageMessage('Confira o celular com DDD.', true); byId('telefone').focus(); return; }
  creating = true;
  payButton.disabled = true;
  payButton.textContent = 'Gerando pagamento…';
  pageMessage('');
  try {
    const data = await requestJson('pagamento-upsell2.php', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...customer, ...trackingData() }),
    });
    if (Number(data.amount) !== CONFIG.amount || !data.paymentCode || !(data.pixCode || data.pixCopiaECola)) {
      throw new Error('Os dados do pagamento retornaram incompletos. Confira a configuração do UP2.');
    }
    activePayment = {
      paymentCode: data.paymentCode, pixCode: data.pixCode || data.pixCopiaECola,
      qrCodeUrl: data.qrCodeUrl || '', expiresAt: data.expiresAt || '', amount: data.amount,
    };
    storePayment(activePayment);
    try { sessionStorage.setItem('checkoutCliente', JSON.stringify({ ...customer, ...documentData })); } catch {}
    renderPayment(activePayment);
    openDialog();
    stopPolling();
    pollPayment();
  } catch (error) {
    pageMessage(error.name === 'AbortError' ? 'O servidor demorou para responder. Confira sua conexão antes de tentar novamente.' : error.message, true);
    payButton.textContent = 'Clique aqui para efetuar o pagamento';
  } finally { creating = false; payButton.disabled = false; }
});
byId('copy-button').addEventListener('click', async () => {
  const text = byId('pix-code').value;
  if (!text) return;
  let copied = false;
  try { await navigator.clipboard.writeText(text); copied = true; }
  catch { byId('pix-code').select(); copied = document.execCommand('copy'); }
  byId('copy-button').textContent = copied ? 'Código PIX copiado!' : 'Selecione o código acima para copiar';
  setTimeout(() => { byId('copy-button').textContent = 'Copiar código PIX'; }, 2500);
});
async function initialize() {
  payButton.disabled = true;
  const query = new URLSearchParams(location.search);
  populateCustomer({
    nome: query.get('nome') || query.get('name') || '',
    cpf: query.get('cpf') || '',
    email: query.get('email') || '',
    telefone: query.get('telefone') || query.get('phone') || '',
    nascimento: query.get('nascimento') || query.get('data_nascimento') || query.get('NASC') || '',
    municipio: query.get('municipio') || query.get('cidade') || '',
    uf: query.get('uf') || '',
  });
  try {
    const data = await requestJson('dados-cliente.php');
    populateCustomer(data.customer);
  } catch { /* Permite preencher os dados se a sessão anterior não estiver disponível. */ }
  legacyCustomer();
  renderDocument();
  payButton.disabled = false;
  let saved;
  try { saved = readStored(sessionStorage, paymentKey); } catch {}
  if (saved && saved.amount === CONFIG.amount && typeof saved.paymentCode === 'string' && saved.pixCode) {
    activePayment = saved;
    renderPayment(saved);
    pollPayment();
  }
}
window.addEventListener('pagehide', stopPolling);
window.addEventListener('pageshow', event => { if (event.persisted && activePayment) pollPayment(); });
initialize();
