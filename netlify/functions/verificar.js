const { checkStatus, CORS_HEADERS } = require('./_blackcat');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  const query = event.queryStringParameters || {};
  const id = query.id || query.token || query.paymentCode || '';

  return await checkStatus(id);
};
