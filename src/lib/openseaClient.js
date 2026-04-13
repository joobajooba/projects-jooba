const OPENSEA_ORIGIN = 'https://api.opensea.io';

export function hasOpenSeaApiKey() {
  const k = import.meta.env.VITE_OPENSEA_API_KEY;
  return typeof k === 'string' && k.trim().length > 0;
}

function headers() {
  const key = import.meta.env.VITE_OPENSEA_API_KEY?.trim();
  const h = { Accept: 'application/json' };
  if (key) h['x-api-key'] = key;
  return h;
}

async function openSeaGet(path, searchParams) {
  const url = new URL(path, `${OPENSEA_ORIGIN}/`);
  if (searchParams) {
    for (const [k, v] of Object.entries(searchParams)) {
      if (v != null && v !== '') url.searchParams.set(k, String(v));
    }
  }
  const res = await fetch(url.toString(), { headers: headers() });
  if (!res.ok) {
    let detail = '';
    try {
      const j = await res.json();
      detail = Array.isArray(j?.errors) ? j.errors.join(' ') : JSON.stringify(j);
    } catch {
      detail = await res.text();
    }
    const err = new Error(detail || `OpenSea HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

/**
 * Sample collections on a chain (OpenSea API v2 list_collections).
 * @param {{ chain?: string, limit?: number }} opts
 */
export function fetchOpenSeaCollections({ chain = 'ethereum', limit = 8 } = {}) {
  if (!hasOpenSeaApiKey()) {
    const e = new Error('missing_key');
    e.code = 'missing_key';
    throw e;
  }
  return openSeaGet('/api/v2/collections', {
    chain,
    limit: Math.min(100, Math.max(1, limit)),
  });
}

/**
 * Collection stats (floor, volume, owners, etc.).
 * @param {string} slug OpenSea collection slug, e.g. mutant-ape-yacht-club
 * @param {{ chain?: string }} [opts]
 */
export function fetchOpenSeaCollectionStats(slug, opts = {}) {
  if (!hasOpenSeaApiKey()) {
    const e = new Error('missing_key');
    e.code = 'missing_key';
    throw e;
  }
  const chain = opts.chain ?? 'ethereum';
  return openSeaGet(`/api/v2/collections/${encodeURIComponent(slug)}/stats`, { chain });
}
