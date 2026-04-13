import { SALES_2026_AFTER, SALES_2026_BEFORE, classifyMutantFur } from './maycSales2026.js';

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

/**
 * One page of collection events (OpenSea v2).
 * @param {string} slug
 * @param {Record<string, string | number | undefined>} query
 */
export function fetchOpenSeaCollectionEventsPage(slug, query) {
  if (!hasOpenSeaApiKey()) {
    const e = new Error('missing_key');
    e.code = 'missing_key';
    throw e;
  }
  return openSeaGet(`/api/v2/events/collection/${encodeURIComponent(slug)}`, query);
}

/**
 * Paginate MAYC sale events for calendar year 2026 (Ethereum), aggregate M1 vs M2 by Fur trait.
 * @param {{ maxPages?: number }} [opts]
 * @returns {Promise<{ m1: number, m2: number, otherFur: number, unclassified: number, totalSales: number, truncated: boolean, pages: number }>}
 */
export async function fetchMaycMutantSalesSplit2026(opts = {}) {
  const maxPages = opts.maxPages ?? 30;
  const slug = opts.slug ?? 'mutant-ape-yacht-club';
  const after = opts.after ?? SALES_2026_AFTER;
  const before = opts.before ?? SALES_2026_BEFORE;

  let m1 = 0;
  let m2 = 0;
  let otherFur = 0;
  let unclassified = 0;
  let totalSales = 0;
  let next = undefined;
  let pages = 0;

  for (let i = 0; i < maxPages; i += 1) {
    const params = {
      event_type: 'sale',
      chain: 'ethereum',
      after,
      before,
      limit: 200,
    };
    if (next) params.next = next;

    const data = await fetchOpenSeaCollectionEventsPage(slug, params);
    pages += 1;
    const events = Array.isArray(data?.asset_events) ? data.asset_events : [];

    for (const ev of events) {
      if (ev?.event_type !== 'sale' || !ev.nft) continue;
      totalSales += 1;
      const kind = classifyMutantFur(ev.nft);
      if (kind === 'm1') m1 += 1;
      else if (kind === 'm2') m2 += 1;
      else if (kind === 'other') otherFur += 1;
      else unclassified += 1;
    }

    const n = data?.next;
    const cursor = typeof n === 'string' ? n : n && typeof n === 'object' && n.value != null ? String(n.value) : '';
    next = cursor.length > 0 ? cursor : undefined;
    if (!next || events.length === 0) {
      return {
        m1,
        m2,
        otherFur,
        unclassified,
        totalSales,
        truncated: false,
        pages,
      };
    }
  }

  return {
    m1,
    m2,
    otherFur,
    unclassified,
    totalSales,
    truncated: true,
    pages,
  };
}
