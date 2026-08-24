import { createPublicClient, http } from 'viem';
import { optionsFromSeed } from './_lib/dungeonTraits.js';

const KEEP_COLLECTIONS = [
  {
    address: '0x639061b01ab4261b4283a0AC9D3bB8B99013Bad4',
    version: 'v1',
    namePrefix: 'Imp Keep',
  },
  {
    address: '0x51eA8743109F1b9C70C9d1a9A56cCaA5C2877ee9',
    version: 'v2',
    namePrefix: 'IMPLINGz Keep',
  },
];
const BLOCKSCOUT_V2 = 'https://robinhoodchain.blockscout.com/api/v2';
const BLOCKSCOUT_V1 = 'https://robinhoodchain.blockscout.com/api';
const RPC_URL = 'https://rpc.mainnet.chain.robinhood.com';
const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;
const BLOCKSCOUT_HEADERS = {
  Accept: 'application/json',
  'User-Agent': 'Mozilla/5.0 (compatible; j00ba.xyz/keep-ownership)',
};
const KEEP_ABI = [
  {
    type: 'function',
    name: 'seedOf',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'ownerOf',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ type: 'address' }],
  },
];

function seedHex(value) {
  return `0x${BigInt(value).toString(16).padStart(64, '0')}`;
}

function previewUrl(seed, tokenId) {
  const params = new URLSearchParams({ seed, format: 'png', tokenId: String(tokenId) });
  return `/api/dungeon-preview?${params}`;
}

function createKeepClient() {
  return createPublicClient({
    chain: {
      id: 4663,
      name: 'Robinhood Chain',
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      rpcUrls: { default: { http: [RPC_URL] } },
    },
    transport: http(RPC_URL),
  });
}

async function fetchJson(url, timeoutMs = 4000) {
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

async function fetchOwnedFromInstances(owner, contract) {
  const url = new URL(`${BLOCKSCOUT_V2}/tokens/${contract}/instances`);
  url.searchParams.set('holder_address_hash', owner);
  const tokenIds = new Set();

  for (let page = 0; page < 50; page += 1) {
    const data = await fetchJson(url, 2500);
    for (const item of data.items ?? []) {
      if (item?.id) tokenIds.add(String(item.id));
    }
    if (!data.next_page_params) break;
    applyNextPage(url, data.next_page_params);
  }

  return tokenIds;
}

async function fetchOwnedFromInventory(owner, contract) {
  const url = new URL(`${BLOCKSCOUT_V2}/addresses/${owner}/nft`);
  url.searchParams.set('type', 'ERC-721');
  const wanted = contract.toLowerCase();
  const tokenIds = new Set();

  for (let page = 0; page < 50; page += 1) {
    const data = await fetchJson(url, 2500);
    for (const item of data.items ?? []) {
      const address = String(item?.token?.address_hash || item?.token?.address || '').toLowerCase();
      if (address === wanted && item?.id) tokenIds.add(String(item.id));
    }
    if (!data.next_page_params) break;
    applyNextPage(url, data.next_page_params);
  }

  return tokenIds;
}

async function fetchOwnedFromTransfers(owner, contract) {
  const owned = new Set();
  const wallet = owner.toLowerCase();

  for (let page = 1; page <= 50; page += 1) {
    const url = new URL(BLOCKSCOUT_V1);
    url.searchParams.set('module', 'account');
    url.searchParams.set('action', 'tokennfttx');
    url.searchParams.set('contractaddress', contract);
    url.searchParams.set('address', owner);
    url.searchParams.set('page', String(page));
    url.searchParams.set('offset', '100');
    url.searchParams.set('sort', 'asc');
    const data = await fetchJson(url, 6000);
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

async function fetchOwnedTokenIds(owner, contract) {
  const lookups = [
    (wallet) => fetchOwnedFromTransfers(wallet, contract),
    (wallet) => fetchOwnedFromInstances(wallet, contract),
    (wallet) => fetchOwnedFromInventory(wallet, contract),
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

  if (!sawSuccess) throw lastError ?? new Error('Could not load wallet Imp Keeps.');
  return empty;
}

async function stillOwnedIds(client, owner, contract, tokenIds) {
  const wallet = owner.toLowerCase();
  const rows = await Promise.all(
    [...tokenIds].map(async (tokenId) => {
      try {
        const current = await client.readContract({
          address: contract,
          abi: KEEP_ABI,
          functionName: 'ownerOf',
          args: [BigInt(tokenId)],
        });
        return String(current).toLowerCase() === wallet ? tokenId : null;
      } catch {
        return null;
      }
    })
  );
  return rows.filter(Boolean);
}

async function enrichKeep(client, collection, tokenId) {
  try {
    const seed = await client.readContract({
      address: collection.address,
      abi: KEEP_ABI,
      functionName: 'seedOf',
      args: [BigInt(tokenId)],
    });
    const hex = seedHex(seed);
    const opts = optionsFromSeed(hex, Number(tokenId));
    return {
      id: tokenId,
      name: `${collection.namePrefix} #${tokenId}`,
      image: previewUrl(hex, tokenId),
      seed: hex,
      tileset: opts.tileset,
      biome: opts.biome,
      dungeonType: opts.dungeonType,
      miniBoss: opts.miniBoss,
      contract: collection.address,
      version: collection.version,
    };
  } catch {
    return {
      id: tokenId,
      name: `${collection.namePrefix} #${tokenId}`,
      image: '',
      seed: '',
      tileset: '',
      biome: 'Unknown',
      dungeonType: '',
      miniBoss: '',
      contract: collection.address,
      version: collection.version,
    };
  }
}

async function loadCollection(client, owner, collection) {
  try {
    const tokenIds = await fetchOwnedTokenIds(owner, collection.address);
    const ownedIds = tokenIds.size
      ? await stillOwnedIds(client, owner, collection.address, tokenIds)
      : [];
    return Promise.all(ownedIds.map((tokenId) => enrichKeep(client, collection, tokenId)));
  } catch (error) {
    console.error(`Failed to load ${collection.version} Imp Keeps`, error);
    return [];
  }
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

  const all =
    String(Array.isArray(request.query.all) ? request.query.all[0] : request.query.all || '') === '1';
  const collections = all
    ? KEEP_COLLECTIONS
    : KEEP_COLLECTIONS.filter((collection) => collection.version === 'v1');

  try {
    const client = createKeepClient();
    const groups = await Promise.all(
      collections.map((collection) => loadCollection(client, owner, collection))
    );
    const keeps = groups.flat().sort((a, b) => {
      if (a.version !== b.version) return a.version.localeCompare(b.version);
      return Number(a.id) - Number(b.id);
    });

    response.setHeader('Cache-Control', 'public, s-maxage=15, stale-while-revalidate=30');
    return response.status(200).json({
      contracts: collections.map((collection) => collection.address),
      items: keeps,
    });
  } catch (error) {
    console.error('Failed to load Imp Keep ownership', error);
    return response.status(502).json({
      error: 'The Imp Keep ownership service is temporarily unavailable.',
    });
  }
}
