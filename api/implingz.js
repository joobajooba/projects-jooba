import { createPublicClient, defineChain, http, parseAbiItem } from 'viem';

const IMPLINGZ_CONTRACT = '0x81D2D1f0e92285CdD22Aa3cbc6956B6E1724d029';
const MULTICALL3_ADDRESS = '0xca11bde05977b3631167028862be2a173976ca11';
const BLOCKSCOUT_V2 = 'https://robinhoodchain.blockscout.com/api/v2';
const BLOCKSCOUT_V1 = 'https://robinhoodchain.blockscout.com/api';
const RPC_URL = 'https://rpc.mainnet.chain.robinhood.com';
const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;
const TOTAL_SUPPLY_FALLBACK = 2222;
const SCAN_CHUNK = 250;
const BLOCKSCOUT_HEADERS = {
  Accept: 'application/json',
  'User-Agent': 'Mozilla/5.0 (compatible; j00ba.xyz/implingz-ownership)',
};
const TRANSFER_EVENT = parseAbiItem(
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'
);
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
    transport: http(RPC_URL, { timeout: 15_000 }),
  });
}

async function fetchJson(url, signal, timeoutMs = 6000) {
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
  for (let page = 0; page < 50; page += 1) {
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
  for (let page = 1; page <= 50; page += 1) {
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

async function fetchOwnedFromLogs(owner) {
  const client = rpcClient();
  const latest = await client.getBlockNumber();
  const windows = [20_000n, 80_000n, 400_000n];
  const incoming = new Set();

  for (const window of windows) {
    try {
      const fromBlock = latest > window ? latest - window : 0n;
      const logs = await client.getLogs({
        address: IMPLINGZ_CONTRACT,
        event: TRANSFER_EVENT,
        args: { to: owner },
        fromBlock,
        toBlock: latest,
      });
      for (const log of logs) {
        if (log.args?.tokenId != null) incoming.add(String(log.args.tokenId));
      }
      if (incoming.size > 0) return incoming;
    } catch (error) {
      console.error('implingz transfer logs failed', window.toString(), error);
    }
  }

  return incoming;
}

async function collectCandidateIds(owner, signal) {
  const results = await Promise.allSettled([
    fetchOwnedFromInstances(owner, signal),
    fetchOwnedFromInventory(owner, signal),
    fetchIncomingTransfers(owner, signal),
    fetchOwnedFromLogs(owner),
  ]);

  const candidates = new Set();
  let lastError = null;
  let sawSuccess = false;
  for (const result of results) {
    if (result.status === 'fulfilled') {
      sawSuccess = true;
      for (const id of result.value) candidates.add(String(id));
    } else {
      lastError = result.reason;
    }
  }

  return { candidates, sawSuccess, lastError };
}

async function lookupOwned(owner, balance) {
  const expected = balance == null ? null : Number(balance);
  let owned = new Set();
  let chainError = null;

  try {
    owned = await fetchOwnedFromChain(owner);
    if (expected == null || owned.size === expected) return owned;
  } catch (error) {
    chainError = error;
    console.error('implingz on-chain ownership scan failed', error);
  }

  const { candidates, sawSuccess, lastError } = await collectCandidateIds(owner);
  const extraIds = [...candidates].filter((id) => !owned.has(id));
  if (extraIds.length > 0) {
    const verified = await ownerOfIds(rpcClient(), owner, extraIds);
    for (const id of verified) owned.add(id);
  }

  if (expected == null || owned.size === expected || owned.size > 0) return owned;
  if (expected === 0) return owned;
  if (sawSuccess && expected == null) return owned;
  throw chainError ?? lastError ?? new Error('Could not load wallet IMPLINGz.');
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
