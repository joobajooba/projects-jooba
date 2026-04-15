const COLLECTION = {
  key: 'mayc',
  slug: 'mutant-ape-yacht-club',
  label: 'Mutant Ape Yacht Club',
};

const PAGE_SIZE = 50;
const TARGET_SALES = 500;
const MAX_PAGES = 20;

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

  const baseAmount = raw / 10 ** decimals;
  if (paymentSymbol === 'ETH' || paymentSymbol === 'WETH') return baseAmount;
  return 0;
}

function extractFurTrait(nft) {
  const traits = Array.isArray(nft?.traits) ? nft.traits : [];
  const fur = traits.find((trait) => {
    const type = (trait?.trait_type || trait?.type || '').toLowerCase();
    return type === 'fur';
  });
  return fur?.value != null ? String(fur.value) : 'Unknown';
}

function normalizeEvent(event) {
  const nft = event?.nft || {};
  const sale = event?.sale || {};
  const rawTimestamp =
    event?.event_timestamp ||
    sale?.event_timestamp ||
    event?.created_date ||
    sale?.created_date ||
    null;

  return {
    eventId: event?.event_id || event?.id || null,
    collection: COLLECTION.label,
    collectionKey: COLLECTION.key,
    apeId: nft?.identifier || sale?.identifier || null,
    name: nft?.name || null,
    timestamp: normalizeTimestamp(rawTimestamp),
    priceEth: extractEthFromEvent(event),
    fur: extractFurTrait(nft),
  };
}

async function fetchSales(apiKey) {
  const rawEvents = [];
  let next = null;
  let pages = 0;

  while (rawEvents.length < TARGET_SALES && pages < MAX_PAGES) {
    const url = new URL(`https://api.opensea.io/api/v2/events/collection/${COLLECTION.slug}`);
    url.searchParams.set('event_type', 'sale');
    url.searchParams.set('limit', String(Math.min(PAGE_SIZE, TARGET_SALES - rawEvents.length)));
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
    next = payload?.next || null;
    pages += 1;

    if (!next || pageEvents.length === 0) break;
  }

  const sales = rawEvents
    .map(normalizeEvent)
    .filter((sale) => sale.timestamp)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, TARGET_SALES);

  return {
    collection: COLLECTION.label,
    salesCount: sales.length,
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

  try {
    const result = await fetchSales(apiKey);
    return res.status(200).json({
      updatedAt: new Date().toISOString(),
      ...result,
    });
  } catch (error) {
    return res.status(502).json({
      error: 'Failed to fetch OpenSea sales',
      detail: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
