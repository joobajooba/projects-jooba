import { createPublicClient, http } from 'viem';

const IMPLINGZ_CONTRACT = '0x81D2D1f0e92285CdD22Aa3cbc6956B6E1724d029';
const BLOCKSCOUT_V2 = 'https://robinhoodchain.blockscout.com/api/v2';
const BLOCKSCOUT_V1 = 'https://robinhoodchain.blockscout.com/api';
const RPC_URL = 'https://rpc.mainnet.chain.robinhood.com';
const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;
const BLOCKSCOUT_HEADERS = {
  Accept: 'application/json',
  'User-Agent': 'Mozilla/5.0 (compatible; j00ba.xyz/implingz-ownership)',
};
const ERC721_ABI = [
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'tokenOfOwnerByIndex',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'index', type: 'uint256' },
    ],
    outputs: [{ type: 'uint256' }],
  },
];

function toItems(tokenIds) {
  return [...tokenIds].map((id) => ({ id: String(id) }));
}

async function fetchJson(url, timeoutMs = 2500) {
  const response = await fetch(url, {
    headers: BLOCKSCOUT_HEADERS,
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) {
    throw new Error(`Blockscout returned ${response.status}.`);
  }
  return response.json();
}

function applyNextPage(url, nextPageParams) {
  Object.entries(nextPageParams || {}).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  });
}

async function paginateV2(url, onItem, timeoutMs = 2500) {
  const deadline = Date.now() + 7000;
  for (let page = 0; page < 20 && Date.now() < deadline; page += 1) {
    const data = await fetchJson(url, timeoutMs);
    for (const item of data.items ?? []) onItem(item);
    if (!data.next_page_params) break;
    applyNextPage(url, data.next_page_params);
  }
}

async function fetchOwnedFromRpc(owner) {
  const client = createPublicClient({
    chain: {
      id: 4663,
      name: 'Robinhood Chain',
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      rpcUrls: { default: { http: [RPC_URL] } },
    },
    transport: http(RPC_URL, { timeout: 4000 }),
  });
  const balance = await client.readContract({
    address: IMPLINGZ_CONTRACT,
    abi: ERC721_ABI,
    functionName: 'balanceOf',
    args: [owner],
  });
  const count = Number(balance);
  if (!Number.isFinite(count) || count <= 0) return new Set();

  const tokenIds = new Set();
  const chunkSize = 40;
  for (let start = 0; start < count; start += chunkSize) {
    const slice = await Promise.all(
      Array.from({ length: Math.min(chunkSize, count - start) }, (_, offset) =>
        client.readContract({
          address: IMPLINGZ_CONTRACT,
          abi: ERC721_ABI,
          functionName: 'tokenOfOwnerByIndex',
          args: [owner, BigInt(start + offset)],
        })
      )
    );
    slice.forEach((id) => tokenIds.add(String(id)));
  }
  return tokenIds;
}

async function fetchOwnedFromInstances(owner) {
  const url = new URL(`${BLOCKSCOUT_V2}/tokens/${IMPLINGZ_CONTRACT}/instances`);
  url.searchParams.set('holder_address_hash', owner);
  const tokenIds = new Set();
  await paginateV2(url, (item) => {
    if (item?.id) tokenIds.add(String(item.id));
  });
  return tokenIds;
}

async function fetchOwnedFromInventory(owner) {
  const url = new URL(`${BLOCKSCOUT_V2}/addresses/${owner}/nft`);
  url.searchParams.set('type', 'ERC-721');
  const wanted = IMPLINGZ_CONTRACT.toLowerCase();
  const tokenIds = new Set();
  await paginateV2(url, (item) => {
    const address = String(item?.token?.address_hash || item?.token?.address || '').toLowerCase();
    if (address === wanted && item?.id) tokenIds.add(String(item.id));
  });
  return tokenIds;
}

async function fetchOwnedFromTransfers(owner) {
  const owned = new Set();
  const wallet = owner.toLowerCase();
  for (let page = 1; page <= 20; page += 1) {
    const url = new URL(BLOCKSCOUT_V1);
    url.searchParams.set('module', 'account');
    url.searchParams.set('action', 'tokennfttx');
    url.searchParams.set('contractaddress', IMPLINGZ_CONTRACT);
    url.searchParams.set('address', owner);
    url.searchParams.set('page', String(page));
    url.searchParams.set('offset', '100');
    url.searchParams.set('sort', 'asc');
    const data = await fetchJson(url, 4000);
    if (!Array.isArray(data.result)) {
      if (data.message === 'No transactions found' || data.status === '0') break;
      throw new Error('Blockscout transfer inventory is unavailable.');
    }
    for (const row of data.result) {
      const tokenId = String(row.tokenID ?? '');
      if (!tokenId) continue;
      if (String(row.to || '').toLowerCase() === wallet) owned.add(tokenId);
      if (String(row.from || '').toLowerCase() === wallet) owned.delete(tokenId);
    }
    if (data.result.length < 100) break;
  }
  return owned;
}

async function fetchOwnedTokenIds(owner) {
  const lookups = [
    fetchOwnedFromInstances,
    fetchOwnedFromRpc,
    fetchOwnedFromInventory,
    fetchOwnedFromTransfers,
  ];
  let lastError = null;
  let sawSuccess = false;
  let empty = new Set();

  for (const lookup of lookups) {
    try {
      const tokenIds = await lookup(owner);
      sawSuccess = true;
      if (tokenIds.size > 0) return tokenIds;
      empty = tokenIds;
    } catch (error) {
      lastError = error;
    }
  }

  if (!sawSuccess) throw lastError ?? new Error('Could not load wallet IMPLINGz.');
  return empty;
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

  try {
    const tokenIds = await fetchOwnedTokenIds(owner);
    response.setHeader('Cache-Control', 'public, s-maxage=15, stale-while-revalidate=30');
    return response.status(200).json({ items: toItems(tokenIds) });
  } catch (error) {
    console.error('Failed to load IMPLINGz ownership', error);
    return response.status(502).json({
      error: 'The IMPLINGz ownership service is temporarily unavailable.',
    });
  }
}
