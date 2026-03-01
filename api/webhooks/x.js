import crypto from 'crypto';

/**
 * X (Twitter) webhook endpoint for CRC (Challenge-Response Check).
 * Register webhook URL as: https://www.j00ba.xyz/api/webhooks/x
 *
 * Vercel env: X_CONSUMER_SECRET = your app's Consumer Secret (API Key Secret).
 * In X Developer Portal: Keys and tokens → Consumer Keys → API Key Secret.
 */
function computeCrcResponse(crcToken, consumerSecret) {
  const hmac = crypto
    .createHmac('sha256', consumerSecret)
    .update(crcToken, 'utf8')
    .digest('base64');
  return `sha256=${hmac}`;
}

async function handleGet(request) {
  const url = request.url ? new URL(request.url) : null;
  const crcToken = url ? (url.searchParams.get('crc_token') || '').trim() : '';
  const rawSecret = process.env.X_CONSUMER_SECRET;
  const consumerSecret = typeof rawSecret === 'string' ? rawSecret.trim() : '';

  if (!crcToken || !consumerSecret) {
    return new Response(
      JSON.stringify({
        error: crcToken ? 'X_CONSUMER_SECRET not set or empty' : 'Missing crc_token',
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const responseToken = computeCrcResponse(crcToken, consumerSecret);
  return new Response(JSON.stringify({ response_token: responseToken }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function GET(request) {
  try {
    return await handleGet(request);
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function POST() {
  return new Response(null, { status: 200 });
}
