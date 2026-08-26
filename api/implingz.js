import {
  createNftClient,
  fetchBalanceOf,
  lookupOwnedTokenIds,
  setNoStoreHeaders,
} from './_lib/nftOwnership.js';

const IMPLINGZ_CONTRACT = '0x81D2D1f0e92285CdD22Aa3cbc6956B6E1724d029';
const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;

function toItems(tokenIds) {
  return [...tokenIds]
    .map((id) => String(id))
    .sort((left, right) => Number(left) - Number(right))
    .map((id) => ({ id }));
}

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'Method not allowed.' });
  }

  const owner = Array.isArray(request.query.owner) ? request.query.owner[0] : request.query.owner;

  if (!owner || !ADDRESS_PATTERN.test(owner)) {
    return response.status(400).json({ error: 'A valid wallet address is required.' });
  }

  setNoStoreHeaders(response);

  try {
    const client = createNftClient();
    const balance = await fetchBalanceOf(client, IMPLINGZ_CONTRACT, owner).catch(() => null);
    if (balance != null && BigInt(balance) === 0n) {
      return response.status(200).json({ items: [] });
    }

    const tokenIds = await lookupOwnedTokenIds({
      client,
      owner,
      contract: IMPLINGZ_CONTRACT,
      expectedBalance: balance == null ? null : Number(balance),
    });
    return response.status(200).json({ items: toItems(tokenIds) });
  } catch (error) {
    console.error('Failed to load IMPLINGz ownership', error);
    try {
      const client = createNftClient();
      const balance = await fetchBalanceOf(client, IMPLINGZ_CONTRACT, owner);
      if (BigInt(balance) === 0n) {
        return response.status(200).json({ items: [] });
      }
    } catch {
      // Explorer and RPC both failed.
    }
    return response.status(502).json({
      error: 'The IMPLINGz ownership service is temporarily unavailable.',
    });
  }
}
