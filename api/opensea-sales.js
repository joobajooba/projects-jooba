const COLLECTIONS = [
  { key: 'bayc', slug: 'boredapeyachtclub', label: 'Bored Ape Yacht Club' },
  { key: 'mayc', slug: 'mutant-ape-yacht-club', label: 'Mutant Ape Yacht Club' },
];

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
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
  return {
    eventId: event?.event_id || event?.id || null,
    tokenId: nft?.identifier || sale?.identifier || null,
    name: nft?.name || null,
    imageUrl: nft?.image_url || null,
    seller: sale?.from_account?.address || event?.seller || null,
    buyer: sale?.to_account?.address || event?.buyer || null,
    txHash: event?.transaction || event?.transaction_hash || null,
    timestamp: event?.event_timestamp || event?.created_date || null,
    paymentSymbol:
      event?.payment?.symbol || event?.payment?.token_symbol || sale?.payment_token?.symbol || null,
    priceEth: extractEthFromEvent(event),
  };
}

async function fetchCollectionSales(slug, apiKey, limit) {
  const url = new URL(`https://api.opensea.io/api/v2/events/collection/${slug}`);
  url.searchParams.set('event_type', 'sale');
  url.searchParams.set('limit', String(limit));

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
  const rawEvents = Array.isArray(payload?.asset_events) ? payload.asset_events : [];
  const sales = rawEvents.map(normalizeEvent);
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
  const limit = Math.min(Math.max(Number.isFinite(requestedLimit) ? requestedLimit : DEFAULT_LIMIT, 1), MAX_LIMIT);

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
