const crypto = require('crypto');

/**
 * X (Twitter) webhook endpoint for CRC (Challenge-Response Check).
 * Register webhook URL as: https://www.j00ba.xyz/api/webhooks/x
 *
 * Vercel env: X_CONSUMER_SECRET must be the app's Consumer Secret (API Key Secret).
 * In X Developer Portal: your app → Keys and tokens → "Consumer Keys" → "API Key Secret"
 * (NOT the OAuth 2.0 "Client Secret").
 */
function getCrcToken(req) {
  try {
    const fromQuery = req && req.query && req.query.crc_token;
    if (fromQuery != null) {
      const s = Array.isArray(fromQuery) ? fromQuery[0] : fromQuery;
      return typeof s === 'string' ? s.trim() : '';
    }
    if (req && req.url) {
      const url = new URL(req.url, 'https://localhost');
      return (url.searchParams.get('crc_token') || '').trim();
    }
  } catch (_) {}
  return '';
}

function sendJson(res, statusCode, body) {
  const bodyStr = JSON.stringify(body);
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(bodyStr);
}

module.exports = function handler(req, res) {
  try {
    if (!req || !res) {
      if (res && typeof res.writeHead === 'function') res.writeHead(500).end();
      return;
    }
    const method = (req.method || 'GET').toUpperCase();

    if (method === 'GET') {
      const crcToken = getCrcToken(req);
      const rawSecret = process.env.X_CONSUMER_SECRET;
      const consumerSecret = typeof rawSecret === 'string' ? rawSecret.trim() : '';

      if (!crcToken || !consumerSecret) {
        sendJson(res, 400, {
          error: crcToken ? 'X_CONSUMER_SECRET not set or empty' : 'Missing crc_token',
        });
        return;
      }

      const hmac = crypto
        .createHmac('sha256', consumerSecret)
        .update(crcToken, 'utf8')
        .digest('base64');
      const responseToken = `sha256=${hmac}`;
      sendJson(res, 200, { response_token: responseToken });
      return;
    }

    if (method === 'POST') {
      res.writeHead(200).end();
      return;
    }

    sendJson(res, 405, { error: 'Method Not Allowed' });
  } catch (err) {
    try {
      if (res && typeof res.writeHead === 'function') {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal error' }));
      }
    } catch (_) {}
  }
}
