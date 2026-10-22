const { CORS_HEADERS } = require('./_blackcat');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  // Na arquitetura serverless estática, os dados do cliente são persistidos
  // no localStorage/sessionStorage pelo navegador (função legacyCustomer do front).
  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify({
      success: false,
      message: 'Consultando armazenamento local do navegador.'
    })
  };
};
