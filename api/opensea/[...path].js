/**
 * Server-side OpenSea proxy for Vercel (avoids browser CORS on api.opensea.io).
 * Client requests: /api/opensea/api/v2/... → forwarded to https://api.opensea.io/api/v2/...
 *
 * Env: VITE_OPENSEA_API_KEY or OPENSEA_API_KEY (set in Vercel → Environment Variables, then redeploy).
 */
export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.status(405).setHeader('Allow', 'GET, HEAD').end();
    return;
  }

  const raw = process.env.OPENSEA_API_KEY || process.env.VITE_OPENSEA_API_KEY;
  const apiKey = raw ? String(raw).trim() : '';
  if (!apiKey) {
    res.status(503).json({
      errors: [
        'OpenSea proxy: add VITE_OPENSEA_API_KEY (or OPENSEA_API_KEY) in Vercel Environment Variables and redeploy.',
      ],
    });
    return;
  }

  let segments = req.query.path;
  if (segments == null) {
    res.status(400).json({ errors: ['Missing path'] });
    return;
  }
  if (!Array.isArray(segments)) segments = [segments];
  if (segments.length === 0) {
    res.status(400).json({ errors: ['Empty path'] });
    return;
  }

  const openSeaPath = `/${segments.join('/')}`;
  const host = req.headers.host || 'localhost';
  const incoming = new URL(req.url, `http://${host}`);
  const target = new URL(openSeaPath, 'https://api.opensea.io');
  target.search = incoming.search;

  let upstream;
  try {
    upstream = await fetch(target.toString(), {
      headers: {
        Accept: 'application/json',
        'X-API-KEY': apiKey,
      },
    });
  } catch (err) {
    res.status(502).json({ errors: [String(err?.message || err)] });
    return;
  }

  const ct = upstream.headers.get('content-type') || 'application/json; charset=utf-8';
  const body = Buffer.from(await upstream.arrayBuffer());
  res.status(upstream.status);
  res.setHeader('Content-Type', ct);
  res.setHeader('Cache-Control', 'private, max-age=15');
  res.end(body);
}
