const { createPix, CORS_HEADERS } = require('./_blackcat');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ success: false, message: 'Método não permitido.' })
    };
  }

  let body = {};
  try {
    body = event.body ? JSON.parse(event.body) : {};
  } catch (_) {
    try {
      const params = new URLSearchParams(event.body || '');
      body = Object.fromEntries(params.entries());
    } catch (_) {}
  }

  return await createPix('upsell1', body);
};
