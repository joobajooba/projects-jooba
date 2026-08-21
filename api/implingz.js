const IMPLINGZ_CONTRACT = '0x81D2D1f0e92285CdD22Aa3cbc6956B6E1724d029';
const BLOCKSCOUT_API = 'https://robinhoodchain.blockscout.com/api/v2';
const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;
const BLOCKSCOUT_HEADERS = {
  Accept: 'application/json',
  'User-Agent': 'Mozilla/5.0 (compatible; j00ba.xyz/implingz-ownership)',
};

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'Method not allowed.' });
  }

  const owner = Array.isArray(request.query.owner) ? request.query.owner[0] : request.query.owner;

  if (!owner || !ADDRESS_PATTERN.test(owner)) {
    return response.status(400).json({ error: 'A valid wallet address is required.' });
  }

  const url = new URL(`${BLOCKSCOUT_API}/tokens/${IMPLINGZ_CONTRACT}/instances`);
  url.searchParams.set('holder_address_hash', owner);

  const items = [];
  let page = 0;

  try {
    while (page < 50) {
      const blockscoutResponse = await fetch(url, {
        headers: BLOCKSCOUT_HEADERS,
      });

      if (!blockscoutResponse.ok) {
        throw new Error(`Blockscout returned ${blockscoutResponse.status}.`);
      }

      const data = await blockscoutResponse.json();
      items.push(...(data.items ?? []));

      if (!data.next_page_params) break;

      Object.entries(data.next_page_params).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      });
      page += 1;
    }

    response.setHeader('Cache-Control', 'public, s-maxage=15, stale-while-revalidate=30');
    return response.status(200).json({ items });
  } catch (error) {
    console.error('Failed to load IMPLINGz ownership', error);
    return response.status(502).json({
      error: 'The IMPLINGz ownership service is temporarily unavailable.',
    });
  }
}
