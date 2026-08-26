import { createPublicClient, defineChain, http } from 'viem';

export const RPC_URL = 'https://rpc.mainnet.chain.robinhood.com';
export const BLOCKSCOUT_V2 = 'https://robinhoodchain.blockscout.com/api/v2';
export const BLOCKSCOUT_V1 = 'https://robinhoodchain.blockscout.com/api';
export const MULTICALL3_ADDRESS = '0xca11bde05977b3631167028862be2a173976ca11';
export const TOTAL_SUPPLY_FALLBACK = 2222;
const SCAN_CHUNK = 250;
const BLOCKSCOUT_HEADERS = {
  Accept: 'application/json',
  'User-Agent': 'Mozilla/5.0 (compatible; j00ba.xyz/nft-ownership)',
};

export const ERC721_ABI = [
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

export const ROBINHOOD_CHAIN = defineChain({
  id: 4663,
  name: 'Robinhood Chain',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
  contracts: {
    multicall3: { address: MULTICALL3_ADDRESS },
  },
});

export function createNftClient() {
  return createPublicClient({
    chain: ROBINHOOD_CHAIN,
    transport: http(RPC_URL, { timeout: 12_000 }),
  });
}

export function setNoStoreHeaders(response) {
  response.setHeader('Cache-Control', 'private, no-store, no-cache, must-revalidate');
  response.setHeader('CDN-Cache-Control', 'no-store');
  response.setHeader('Vercel-CDN-Cache-Control', 'no-store');
  response.setHeader('Pragma', 'no-cache');
  response.setHeader('Expires', '0');
}

export function withTimeout(promise, ms, label) {
  let timer;
  return Promise.race([
    promise.finally(() => clearTimeout(timer)),
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} timed out`)), ms);
    }),
  ]);
}

async function fetchJson(url, timeoutMs = 8000) {
  const response = await fetch(url, {
    headers: BLOCKSCOUT_HEADERS,
    cache: 'no-store',
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

export async function paginateV2(url, onItem, { maxPages = 50, timeoutMs = 8000, budgetMs = 12_000 } = {}) {
  const started = Date.now();
  for (let page = 0; page < maxPages; page += 1) {
    if (Date.now() - started > budgetMs) break;
    const data = await fetchJson(url, timeoutMs);
    for (const item of data.items ?? []) onItem(item);
    if (!data.next_page_params) break;
    applyNextPage(url, data.next_page_params);
  }
}

export async function fetchBalanceOf(client, contract, owner) {
  return client.readContract({
    address: contract,
    abi: ERC721_ABI,
    functionName: 'balanceOf',
    args: [owner],
  });
}

export async function fetchTotalSupply(client, contract, fallback = TOTAL_SUPPLY_FALLBACK) {
  try {
    const supply = await client.readContract({
      address: contract,
      abi: ERC721_ABI,
      functionName: 'totalSupply',
    });
    const numeric = Number(supply);
    return Number.isInteger(numeric) && numeric > 0 ? numeric : fallback;
  } catch {
    return fallback;
  }
}

export async function ownerOfIds(client, contract, owner, tokenIds) {
  const wallet = String(owner).toLowerCase();
  const owned = new Set();
  const ids = [...new Set(tokenIds.map((id) => String(id)).filter((id) => /^\d+$/.test(id)))];

  for (let start = 0; start < ids.length; start += SCAN_CHUNK) {
    const slice = ids.slice(start, start + SCAN_CHUNK);
    const results = await client.multicall({
      allowFailure: true,
      contracts: slice.map((id) => ({
        address: contract,
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
            address: contract,
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

export async function fetchOwnedFromChain(client, contract, owner, fallback = TOTAL_SUPPLY_FALLBACK) {
  const totalSupply = await fetchTotalSupply(client, contract, fallback);
  const ids = Array.from({ length: totalSupply }, (_, index) => String(index + 1));
  return ownerOfIds(client, contract, owner, ids);
}

async function fetchOwnedEnumerable(client, contract, owner, balance) {
  const count = Number(balance);
  if (!Number.isInteger(count) || count <= 0) return null;
  try {
    await client.readContract({
      address: contract,
      abi: ERC721_ABI,
      functionName: 'tokenOfOwnerByIndex',
      args: [owner, 0n],
    });
  } catch {
    return null;
  }

  const owned = new Set();
  for (let start = 0; start < count; start += SCAN_CHUNK) {
    const slice = Array.from({ length: Math.min(SCAN_CHUNK, count - start) }, (_, index) => start + index);
    const results = await client.multicall({
      allowFailure: true,
      contracts: slice.map((index) => ({
        address: contract,
        abi: ERC721_ABI,
        functionName: 'tokenOfOwnerByIndex',
        args: [owner, BigInt(index)],
      })),
    });
    results.forEach((row) => {
      if (row.status === 'success') owned.add(String(row.result));
    });
  }
  return owned;
}

export async function fetchTokenInstances(owner, contract) {
  const url = new URL(`${BLOCKSCOUT_V2}/tokens/${contract}/instances`);
  url.searchParams.set('holder_address_hash', owner);
  const items = [];
  try {
    await paginateV2(url, (item) => {
      if (item?.id) items.push(item);
    });
  } catch (error) {
    if (items.length === 0) throw error;
    console.error('partial nft instance index', contract, error);
  }
  return items;
}

export async function fetchOwnedFromInstances(owner, contract) {
  const items = await fetchTokenInstances(owner, contract);
  return new Set(items.map((item) => String(item.id)));
}

export async function fetchOwnedFromInventory(owner, contract) {
  const url = new URL(`${BLOCKSCOUT_V2}/addresses/${owner}/nft`);
  url.searchParams.set('type', 'ERC-721');
  const wanted = String(contract).toLowerCase();
  const tokenIds = new Set();
  await paginateV2(url, (item) => {
    const address = String(item?.token?.address_hash || item?.token?.address || '').toLowerCase();
    if (address === wanted && item?.id) tokenIds.add(String(item.id));
  });
  return tokenIds;
}

export async function fetchOwnedFromTransfers(owner, contract) {
  const owned = new Set();
  const wallet = String(owner).toLowerCase();

  for (let page = 1; page <= 50; page += 1) {
    const url = new URL(BLOCKSCOUT_V1);
    url.searchParams.set('module', 'account');
    url.searchParams.set('action', 'tokennfttx');
    url.searchParams.set('contractaddress', contract);
    url.searchParams.set('address', owner);
    url.searchParams.set('page', String(page));
    url.searchParams.set('offset', '100');
    url.searchParams.set('sort', 'asc');
    const data = await fetchJson(url, 8000);
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

function addAll(target, source) {
  for (const id of source || []) target.add(String(id));
}

export async function lookupOwnedTokenIds({
  client,
  owner,
  contract,
  expectedBalance = null,
  totalSupplyFallback = TOTAL_SUPPLY_FALLBACK,
  candidateIds = [],
  skipInstanceIndex = false,
} = {}) {
  const owned = new Set();
  const expected =
    expectedBalance == null || !Number.isFinite(Number(expectedBalance))
      ? null
      : Number(expectedBalance);

  const complete = () => expected != null && owned.size === expected;

  const verifyAndAdd = async (ids) => {
    const fresh = [...ids].map(String).filter((id) => /^\d+$/.test(id) && !owned.has(id));
    if (fresh.length === 0) return;
    const verified = await ownerOfIds(client, contract, owner, fresh);
    addAll(owned, verified);
  };

  await verifyAndAdd(candidateIds);
  if (complete()) return owned;

  if (!skipInstanceIndex) {
    try {
      const instances = await withTimeout(fetchOwnedFromInstances(owner, contract), 10_000, 'holder index');
      await verifyAndAdd(instances);
      if (complete()) return owned;
    } catch (error) {
      console.error('nft holder index failed', contract, error);
    }
  }

  if (expected != null && expected > 0) {
    try {
      const enumerable = await withTimeout(
        fetchOwnedEnumerable(client, contract, owner, expected),
        3_000,
        'enumerable'
      );
      if (enumerable) {
        addAll(owned, enumerable);
        if (complete()) return owned;
      }
    } catch (error) {
      console.error('nft enumerable lookup skipped', contract, error);
    }
  }

  if (owned.size === 0) {
    try {
      const extras = await withTimeout(
        Promise.allSettled([
          fetchOwnedFromInventory(owner, contract),
          fetchOwnedFromTransfers(owner, contract),
        ]),
        10_000,
        'explorer fill'
      );
      const ids = [];
      for (const result of extras) {
        if (result.status === 'fulfilled') ids.push(...result.value);
      }
      await verifyAndAdd(ids);
      if (complete()) return owned;
    } catch (error) {
      console.error('nft explorer fill skipped', contract, error);
    }
  }

  const needsChainFill = expected == null ? owned.size === 0 : owned.size !== expected;
  if (needsChainFill) {
    try {
      const fromChain = await fetchOwnedFromChain(client, contract, owner, totalSupplyFallback);
      addAll(owned, fromChain);
    } catch (error) {
      console.error('nft chain scan failed', contract, error);
    }
  }

  return owned;
}
