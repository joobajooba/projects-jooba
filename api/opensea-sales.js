const COLLECTIONS = [
  { key: 'bayc', slug: 'boredapeyachtclub', label: 'Bored Ape Yacht Club' },
  { key: 'mayc', slug: 'mutant-ape-yacht-club', label: 'Mutant Ape Yacht Club' },
];

const MAX_LIMIT = 50;
const MAX_PAGES = 80;
const DEFAULT_LIMIT = MAX_LIMIT * MAX_PAGES;
const TARGET_YEAR = 2026;

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function normalizeTimestamp(value) {
  if (value == null) return null;
  if (typeof value === 'number') {
    const millis = value < 1e12 ? value * 1000 : value;
    const date = new Date(millis);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString();
  }
  if (typeof value === 'string') {
    const asNumber = Number(value);
    if (Number.isFinite(asNumber)) {
      const millis = asNumber < 1e12 ? asNumber * 1000 : asNumber;
      const date = new Date(millis);
      if (Number.isNaN(date.getTime())) return null;
      return date.toISOString();
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString();
  }
  return null;
}

function extractEthFromEvent(event) {
  const quantity = toNumber(event?.quantity || 1);
  const payment = event?.payment;
  const paymentSymbol = (payment?.symbol || payment?.token_symbol || '').toUpperCase();
  const decimals = toNumber(payment?.decimals || 18);
  const ethPrice = toNumber(payment?.eth_price);

  if (ethPrice > 0) return ethPrice * quantity;

  const raw = toNumber(
    event?.payment?.quantity ||
      event?.payment?.amount ||
      event?.payment?.value ||
      event?.closing_price ||
      event?.total_price
  );
  if (raw <= 0 || decimals <= 0) return 0;

  // OpenSea prices are often integer-like strings in token base units.
  const baseAmount = raw / 10 ** decimals;
  if (paymentSymbol === 'ETH' || paymentSymbol === 'WETH') return baseAmount;
  return 0;
}

function normalizeEvent(event) {
  const nft = event?.nft || {};
  const sale = event?.sale || {};
  const traits = Array.isArray(nft?.traits)
    ? nft.traits
        .map((trait) => ({
          traitType: trait?.trait_type || trait?.type || null,
          value: trait?.value ?? null,
        }))
        .filter((trait) => trait.traitType && trait.value != null)
    : [];
  const rawTimestamp =
    event?.event_timestamp ||
    sale?.event_timestamp ||
    event?.created_date ||
    sale?.created_date ||
    null;
  return {
    eventId: event?.event_id || event?.id || null,
    tokenId: nft?.identifier || sale?.identifier || null,
    name: nft?.name || null,
    imageUrl: nft?.image_url || null,
    seller: sale?.from_account?.address || event?.seller || null,
    buyer: sale?.to_account?.address || event?.buyer || null,
    txHash: event?.transaction || event?.transaction_hash || null,
    timestamp: normalizeTimestamp(rawTimestamp),
    paymentSymbol:
      event?.payment?.symbol || event?.payment?.token_symbol || sale?.payment_token?.symbol || null,
    priceEth: extractEthFromEvent(event),
    traits,
  };
}

async function fetchCollectionSales(slug, apiKey, limit) {
  const rawEvents = [];
  let next = null;
  let pages = 0;
  let seenTargetYear = false;

  while (rawEvents.length < limit && pages < MAX_PAGES) {
    const url = new URL(`https://api.opensea.io/api/v2/events/collection/${slug}`);
    url.searchParams.set('event_type', 'sale');
    url.searchParams.set('limit', String(Math.min(MAX_LIMIT, limit - rawEvents.length)));
    if (next) url.searchParams.set('next', next);

    const response = await fetch(url, {
      headers: {
        accept: 'application/json',
        'x-api-key': apiKey,
      },
    });

    const text = await response.text();
    if (!response.ok) {
      throw new Error(`OpenSea ${response.status}: ${text.slice(0, 220)}`);
    }

    const payload = JSON.parse(text);
    const pageEvents = Array.isArray(payload?.asset_events) ? payload.asset_events : [];
    rawEvents.push(...pageEvents);
    for (const event of pageEvents) {
      const rawTs =
        event?.event_timestamp ||
        event?.sale?.event_timestamp ||
        event?.created_date ||
        event?.sale?.created_date;
      const ts = normalizeTimestamp(rawTs);
      if (!ts) continue;
      const year = new Date(ts).getUTCFullYear();
      if (year === TARGET_YEAR) seenTargetYear = true;
    }
    next = payload?.next || null;
    pages += 1;

    const oldestEvent = pageEvents[pageEvents.length - 1];
    const oldestRawTs =
      oldestEvent?.event_timestamp ||
      oldestEvent?.sale?.event_timestamp ||
      oldestEvent?.created_date ||
      oldestEvent?.sale?.created_date;
    const oldestTs = normalizeTimestamp(oldestRawTs);
    const oldestYear = oldestTs ? new Date(oldestTs).getUTCFullYear() : null;

    if (seenTargetYear && oldestYear != null && oldestYear < TARGET_YEAR) break;
    if (!next || pageEvents.length === 0) break;
  }
  const sales = rawEvents
    .map(normalizeEvent)
    .filter((sale) => {
      if (!sale.timestamp) return false;
      return new Date(sale.timestamp).getUTCFullYear() === TARGET_YEAR;
    });
  const totalVolumeEth = sales.reduce((sum, sale) => sum + toNumber(sale.priceEth), 0);

  return {
    salesCount: sales.length,
    totalVolumeEth,
    sales,
  };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.VITE_OPENSEA_API_KEY || process.env.OPENSEA_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Missing OpenSea API key on server environment' });
  }

  const requestedLimit = Number(req.query?.limit ?? DEFAULT_LIMIT);
  const limit = Math.min(Math.max(Number.isFinite(requestedLimit) ? requestedLimit : DEFAULT_LIMIT, 1), MAX_LIMIT * MAX_PAGES);

  try {
    const results = await Promise.all(
      COLLECTIONS.map(async (collection) => {
        const data = await fetchCollectionSales(collection.slug, apiKey, limit);
        return {
          key: collection.key,
          slug: collection.slug,
          label: collection.label,
          ...data,
        };
      })
    );

    return res.status(200).json({
      updatedAt: new Date().toISOString(),
      limit,
      collections: results,
    });
  } catch (error) {
    return res.status(502).json({
      error: 'Failed to fetch OpenSea sales',
      detail: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
