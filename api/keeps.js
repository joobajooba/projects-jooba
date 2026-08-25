import { createPublicClient, defineChain, http } from 'viem';
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
  'User-Agent': 'Mozilla/5.0 (compatible; j00ba.xyz/keep-ownership)',
};
const KEEP_ABI = [
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
    name: 'seedOf',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ type: 'uint256' }],
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

function seedHex(value) {
  return `0x${BigInt(value).toString(16).padStart(64, '0')}`;
}

function previewUrl(seed, tokenId) {
  const params = new URLSearchParams({ seed, format: 'png', tokenId: String(tokenId) });
  return `/api/dungeon-preview?${params}`;
}

function createKeepClient() {
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

async function fetchJson(url, timeoutMs = 4000) {
  return withTimeout(
    (async () => {
      const response = await fetch(url, { headers: BLOCKSCOUT_HEADERS });
      if (!response.ok) {
        throw new Error(`Blockscout returned ${response.status}.`);
      }
      return response.json();
    })(),
    timeoutMs,
    'blockscout'
  );
}

function applyNextPage(url, nextPageParams) {
  Object.entries(nextPageParams || {}).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  });
}

async function paginateV2(url, onItem) {
  for (let page = 0; page < 8; page += 1) {
    const data = await fetchJson(url);
    for (const item of data.items ?? []) onItem(item);
    if (!data.next_page_params) break;
    applyNextPage(url, data.next_page_params);
  }
}

async function fetchBalance(client, owner, contract) {
  return client.readContract({
    address: contract,
    abi: KEEP_ABI,
    functionName: 'balanceOf',
    args: [owner],
  });
}

async function fetchTotalSupply(client, contract) {
  try {
    const supply = await client.readContract({
      address: contract,
      abi: KEEP_ABI,
      functionName: 'totalSupply',
    });
    const numeric = Number(supply);
    return Number.isInteger(numeric) && numeric > 0 ? numeric : TOTAL_SUPPLY_FALLBACK;
  } catch {
    return TOTAL_SUPPLY_FALLBACK;
  }
}

async function ownerOfIds(client, owner, contract, tokenIds) {
  const wallet = owner.toLowerCase();
  const owned = new Set();
  const ids = tokenIds.map((id) => String(id)).filter((id) => /^\d+$/.test(id));

  for (let start = 0; start < ids.length; start += SCAN_CHUNK) {
    const slice = ids.slice(start, start + SCAN_CHUNK);
    const results = await client.multicall({
      allowFailure: true,
      contracts: slice.map((id) => ({
        address: contract,
        abi: KEEP_ABI,
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
            abi: KEEP_ABI,
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

async function fetchOwnedFromChain(client, owner, contract) {
  const totalSupply = await fetchTotalSupply(client, contract);
  const ids = Array.from({ length: totalSupply }, (_, index) => String(index + 1));
  return ownerOfIds(client, owner, contract, ids);
}

async function fetchOwnedFromInstances(owner, contract) {
  const url = new URL(`${BLOCKSCOUT_V2}/tokens/${contract}/instances`);
  url.searchParams.set('holder_address_hash', owner);
  const tokenIds = new Set();
  await paginateV2(url, (item) => {
    if (item?.id) tokenIds.add(String(item.id));
  });
  return tokenIds;
}

async function fetchOwnedFromInventory(owner, contract) {
  const url = new URL(`${BLOCKSCOUT_V2}/addresses/${owner}/nft`);
  url.searchParams.set('type', 'ERC-721');
  const wanted = contract.toLowerCase();
  const tokenIds = new Set();
  await paginateV2(url, (item) => {
    const address = String(item?.token?.address_hash || item?.token?.address || '').toLowerCase();
    if (address === wanted && item?.id) tokenIds.add(String(item.id));
  });
  return tokenIds;
}

async function fetchOwnedFromTransfers(owner, contract) {
  const owned = new Set();
  const wallet = owner.toLowerCase();

  for (let page = 1; page <= 20; page += 1) {
    const url = new URL(BLOCKSCOUT_V1);
    url.searchParams.set('module', 'account');
    url.searchParams.set('action', 'tokennfttx');
    url.searchParams.set('contractaddress', contract);
    url.searchParams.set('address', owner);
    url.searchParams.set('page', String(page));
    url.searchParams.set('offset', '100');
    url.searchParams.set('sort', 'asc');
    const data = await fetchJson(url);
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

async function lookupOwned(owner, contract) {
  try {
    const ids = await fetchOwnedFromInstances(owner, contract);
    if (ids.size > 0) return ids;
  } catch (error) {
    console.error('keep holder index failed', contract, error);
  }
  try {
    const ids = await withTimeout(fetchOwnedFromInventory(owner, contract), 4000, 'keep inventory');
    if (ids.size > 0) return ids;
  } catch (error) {
    console.error('keep inventory lookup skipped', contract, error);
  }
  try {
    return await withTimeout(fetchOwnedFromTransfers(owner, contract), 4000, 'keep transfers');
  } catch (error) {
    console.error('keep transfer lookup skipped', contract, error);
  }
  return new Set();
}

async function enrichKeeps(client, collection, tokenIds) {
  const seeds = new Map();
  for (let start = 0; start < tokenIds.length; start += SCAN_CHUNK) {
    const slice = tokenIds.slice(start, start + SCAN_CHUNK);
    const results = await client.multicall({
      allowFailure: true,
      contracts: slice.map((id) => ({
        address: collection.address,
        abi: KEEP_ABI,
        functionName: 'seedOf',
        args: [BigInt(id)],
      })),
    });
    results.forEach((row, index) => {
      if (row.status === 'success') seeds.set(slice[index], seedHex(row.result));
    });
  }

  return tokenIds.map((tokenId) => {
    const hex = seeds.get(tokenId);
    if (!hex) {
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
  });
}

async function loadCollection(client, owner, collection) {
  try {
    return await withTimeout(
      (async () => {
        const balance = await fetchBalance(client, owner, collection.address).catch(() => null);
        if (balance != null && BigInt(balance) === 0n) return [];
        const ownedIds = [...(await lookupOwned(owner, collection.address))];
        if (ownedIds.length === 0) return [];
        try {
          return await withTimeout(enrichKeeps(client, collection, ownedIds), 3000, 'keep enrich');
        } catch (error) {
          console.error(`Keep trait enrich skipped for ${collection.version}`, error);
          return ownedIds.map((tokenId) => ({
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
          }));
        }
      })(),
      8000,
      `load ${collection.version}`
    );
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

    response.setHeader('Cache-Control', 'private, no-store');
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
