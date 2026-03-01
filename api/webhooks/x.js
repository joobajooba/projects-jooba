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
  const fromQuery = req.query?.crc_token;
  if (fromQuery != null) {
    const s = Array.isArray(fromQuery) ? fromQuery[0] : fromQuery;
    return typeof s === 'string' ? s.trim() : '';
  }
  if (req.url) {
    try {
      const url = new URL(req.url, 'https://localhost');
      return (url.searchParams.get('crc_token') || '').trim();
    } catch (_) {}
  }
  return '';
}

module.exports = function handler(req, res) {
  if (req.method === 'GET') {
    const crcToken = getCrcToken(req);
    const rawSecret = process.env.X_CONSUMER_SECRET;
    const consumerSecret = typeof rawSecret === 'string' ? rawSecret.trim() : '';

    if (!crcToken || !consumerSecret) {
      return res.status(400).json({
        error: crcToken ? 'X_CONSUMER_SECRET not set or empty' : 'Missing crc_token',
      });
    }

    const hmac = crypto
      .createHmac('sha256', consumerSecret)
      .update(crcToken, 'utf8')
      .digest('base64');
    const responseToken = `sha256=${hmac}`;

    return res.status(200).setHeader('Content-Type', 'application/json').json({ response_token: responseToken });
  }

  if (req.method === 'POST') {
    // Actual webhook events from X (e.g. account activity) will POST here.
    return res.status(200).send();
  }

  return res.status(405).send('Method Not Allowed');
}
