import { createPublicClient, defineChain, http } from 'viem';

const IMPLINGZ_CONTRACT = '0x81D2D1f0e92285CdD22Aa3cbc6956B6E1724d029';
const MULTICALL3_ADDRESS = '0xca11bde05977b3631167028862be2a173976ca11';
const BLOCKSCOUT_V2 = 'https://robinhoodchain.blockscout.com/api/v2';
const BLOCKSCOUT_V1 = 'https://robinhoodchain.blockscout.com/api';
const RPC_URL = 'https://rpc.mainnet.chain.robinhood.com';
const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;
const TOTAL_SUPPLY_FALLBACK = 2222;
const SCAN_CHUNK = 250;
const CHAIN_FILL_MS = 5000;
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
    name: 'ownerOf',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ type: 'address' }],
  },
  {
    type: 'function',
    name: 'totalSupply',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
];
const ROBINHOOD_CHAIN = defineChain({
  id: 4663,
  name: 'Robinhood Chain',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
  contracts: {
    multicall3: { address: MULTICALL3_ADDRESS },
  },
});

function toItems(tokenIds) {
  return [...tokenIds]
    .map((id) => String(id))
    .sort((left, right) => Number(left) - Number(right))
    .map((id) => ({ id }));
}

function rpcClient() {
  return createPublicClient({
    chain: ROBINHOOD_CHAIN,
    transport: http(RPC_URL, { timeout: 8_000 }),
  });
}

function withTimeout(promise, ms, label) {
  let timer;
  return Promise.race([
    promise.finally(() => clearTimeout(timer)),
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} timed out`)), ms);
    }),
  ]);
}

async function fetchJson(url, signal, timeoutMs = 8000) {
  const response = await fetch(url, {
    headers: BLOCKSCOUT_HEADERS,
    signal: signal ?? AbortSignal.timeout(timeoutMs),
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

async function paginateV2(url, onItem, signal) {
  for (let page = 0; page < 20; page += 1) {
    if (signal?.aborted) break;
    const data = await fetchJson(url, signal);
    for (const item of data.items ?? []) onItem(item);
    if (!data.next_page_params) break;
    applyNextPage(url, data.next_page_params);
  }
}

async function fetchBalance(owner) {
  return rpcClient().readContract({
    address: IMPLINGZ_CONTRACT,
    abi: ERC721_ABI,
    functionName: 'balanceOf',
    args: [owner],
  });
}

async function fetchTotalSupply() {
  try {
    const supply = await rpcClient().readContract({
      address: IMPLINGZ_CONTRACT,
      abi: ERC721_ABI,
      functionName: 'totalSupply',
    });
    const numeric = Number(supply);
    return Number.isInteger(numeric) && numeric > 0 ? numeric : TOTAL_SUPPLY_FALLBACK;
  } catch {
    return TOTAL_SUPPLY_FALLBACK;
  }
}

async function ownerOfIds(client, owner, tokenIds) {
  const wallet = owner.toLowerCase();
  const owned = new Set();
  const ids = tokenIds.map((id) => String(id)).filter((id) => /^\d+$/.test(id));

  for (let start = 0; start < ids.length; start += SCAN_CHUNK) {
    const slice = ids.slice(start, start + SCAN_CHUNK);
    const results = await client.multicall({
      allowFailure: true,
      contracts: slice.map((id) => ({
        address: IMPLINGZ_CONTRACT,
        abi: ERC721_ABI,
        functionName: 'ownerOf',
        args: [BigInt(id)],
      })),
    });
    const retry = [];
    results.forEach((row, index) => {
      const tokenId = slice[index];
      if (row.status === 'success') {
        if (String(row.result).toLowerCase() === wallet) owned.add(tokenId);
        return;
      }
      retry.push(tokenId);
    });
    if (retry.length === 0) continue;
    const retries = await Promise.all(
      retry.map((id) =>
        client
          .readContract({
            address: IMPLINGZ_CONTRACT,
            abi: ERC721_ABI,
            functionName: 'ownerOf',
            args: [BigInt(id)],
          })
          .then((address) => (String(address).toLowerCase() === wallet ? id : null))
          .catch(() => null)
      )
    );
    retries.filter(Boolean).forEach((id) => owned.add(id));
  }

  return owned;
}

async function fetchOwnedFromChain(owner) {
  const client = rpcClient();
  const totalSupply = await fetchTotalSupply();
  const ids = Array.from({ length: totalSupply }, (_, index) => String(index + 1));
  return ownerOfIds(client, owner, ids);
}

async function fetchOwnedFromInstances(owner, signal) {
  const url = new URL(`${BLOCKSCOUT_V2}/tokens/${IMPLINGZ_CONTRACT}/instances`);
  url.searchParams.set('holder_address_hash', owner);
  const tokenIds = new Set();
  await paginateV2(
    url,
    (item) => {
      if (item?.id) tokenIds.add(String(item.id));
    },
    signal
  );
  return tokenIds;
}

async function fetchOwnedFromInventory(owner, signal) {
  const url = new URL(`${BLOCKSCOUT_V2}/addresses/${owner}/nft`);
  url.searchParams.set('type', 'ERC-721');
  const wanted = IMPLINGZ_CONTRACT.toLowerCase();
  const tokenIds = new Set();
  await paginateV2(
    url,
    (item) => {
      const address = String(item?.token?.address_hash || item?.token?.address || '').toLowerCase();
      if (address === wanted && item?.id) tokenIds.add(String(item.id));
    },
    signal
  );
  return tokenIds;
}

async function fetchIncomingTransfers(owner, signal) {
  const owned = new Set();
  const wallet = owner.toLowerCase();
  for (let page = 1; page <= 20; page += 1) {
    if (signal?.aborted) break;
    const url = new URL(BLOCKSCOUT_V1);
    url.searchParams.set('module', 'account');
    url.searchParams.set('action', 'tokennfttx');
    url.searchParams.set('contractaddress', IMPLINGZ_CONTRACT);
    url.searchParams.set('address', owner);
    url.searchParams.set('page', String(page));
    url.searchParams.set('offset', '100');
    url.searchParams.set('sort', 'asc');
    const data = await fetchJson(url, signal);
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

async function lookupOwned(owner, balance) {
  const expected = balance == null ? null : Number(balance);
  const client = rpcClient();
  const owned = new Set();

  try {
    const verified = await ownerOfIds(client, owner, [...(await fetchOwnedFromInstances(owner))]);
    for (const id of verified) owned.add(id);
    if (owned.size > 0 && (expected == null || owned.size === expected)) return owned;
    if (owned.size > 0) return owned;
  } catch (error) {
    console.error('implingz holder index failed', error);
  }

  try {
    const extras = await withTimeout(
      Promise.allSettled([fetchIncomingTransfers(owner), fetchOwnedFromInventory(owner)]),
      5000,
      'implingz explorer fill'
    );
    const ids = [];
    for (const result of extras) {
      if (result.status === 'fulfilled') ids.push(...result.value);
    }
    const fresh = ids.filter((id) => !owned.has(String(id)));
    if (fresh.length > 0) {
      const verified = await ownerOfIds(client, owner, fresh);
      for (const id of verified) owned.add(id);
    }
  } catch (error) {
    console.error('implingz explorer fill skipped', error);
  }

  return owned;
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

  response.setHeader('Cache-Control', 'private, no-store');

  try {
    const balance = await fetchBalance(owner).catch(() => null);
    if (balance != null && BigInt(balance) === 0n) {
      return response.status(200).json({ items: [] });
    }

    const tokenIds = await lookupOwned(owner, balance);
    return response.status(200).json({ items: toItems(tokenIds) });
  } catch (error) {
    console.error('Failed to load IMPLINGz ownership', error);
    try {
      const balance = await fetchBalance(owner);
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
