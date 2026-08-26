import { optionsFromSeed } from './_lib/dungeonTraits.js';
import {
  createNftClient,
  fetchBalanceOf,
  fetchTokenInstances,
  lookupOwnedTokenIds,
  setNoStoreHeaders,
  withTimeout,
} from './_lib/nftOwnership.js';

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
const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;
const SCAN_CHUNK = 250;
const KEEP_ABI = [
  {
    type: 'function',
    name: 'seedOf',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ type: 'uint256' }],
  },
];

function seedHex(value) {
  if (value == null || value === '') return '';
  const raw = String(value);
  if (raw.startsWith('0x') || raw.startsWith('0X')) {
    return `0x${raw.slice(2).padStart(64, '0')}`;
  }
  try {
    return `0x${BigInt(raw).toString(16).padStart(64, '0')}`;
  } catch {
    return '';
  }
}

function previewUrl(seed, tokenId) {
  const params = new URLSearchParams({ seed, format: 'png', tokenId: String(tokenId) });
  return `/api/dungeon-preview?${params}`;
}

function keepStub(collection, tokenId) {
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

function keepFromSeed(collection, tokenId, hex) {
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
}

function keepFromInstance(collection, item) {
  const tokenId = String(item.id);
  const hex = seedHex(item.metadata?.seed || '');
  if (hex) return keepFromSeed(collection, tokenId, hex);
  return {
    ...keepStub(collection, tokenId),
    image: item.image_url || item.metadata?.image || '',
    biome:
      item.metadata?.attributes?.find((trait) => trait.trait_type === 'Environment')?.value ||
      'Unknown',
    dungeonType: item.metadata?.attributes?.find((trait) => trait.trait_type === 'Type')?.value || '',
    miniBoss:
      item.metadata?.attributes?.find((trait) => trait.trait_type === 'Mini Boss')?.value || '',
  };
}

async function seedOfIds(client, collection, tokenIds) {
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
  return seeds;
}

async function enrichKeeps(client, collection, tokenIds, instanceById) {
  const missingSeed = tokenIds.filter((id) => {
    const fromIndex = instanceById.get(id);
    return !seedHex(fromIndex?.metadata?.seed || '');
  });
  let chainSeeds = new Map();
  if (missingSeed.length > 0) {
    try {
      chainSeeds = await withTimeout(seedOfIds(client, collection, missingSeed), 8000, 'keep enrich');
    } catch (error) {
      console.error(`Keep trait enrich skipped for ${collection.version}`, error);
    }
  }

  return tokenIds.map((tokenId) => {
    const instance = instanceById.get(tokenId);
    const hex = seedHex(instance?.metadata?.seed || '') || chainSeeds.get(tokenId) || '';
    if (hex) return keepFromSeed(collection, tokenId, hex);
    if (instance) return keepFromInstance(collection, instance);
    return keepStub(collection, tokenId);
  });
}

async function loadCollection(client, owner, collection) {
  const balance = await fetchBalanceOf(client, collection.address, owner).catch(() => null);
  if (balance != null && BigInt(balance) === 0n) return [];
  const expected = balance == null ? null : Number(balance);

  const instanceById = new Map();
  try {
    const instances = await fetchTokenInstances(owner, collection.address);
    instances.forEach((item) => instanceById.set(String(item.id), item));
  } catch (error) {
    console.error(`Keep instance index skipped for ${collection.version}`, error);
  }

  let tokenIds = [...instanceById.keys()];
  const ownedIds = await lookupOwnedTokenIds({
    client,
    owner,
    contract: collection.address,
    expectedBalance: expected,
    candidateIds: tokenIds,
    skipInstanceIndex: true,
  });
  tokenIds = [...ownedIds];

  if (tokenIds.length === 0) return [];
  return enrichKeeps(client, collection, tokenIds, instanceById);
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

  setNoStoreHeaders(response);

  try {
    const client = createNftClient();
    const groups = await Promise.all(
      collections.map((collection) => loadCollection(client, owner, collection))
    );
    const keeps = groups.flat().sort((a, b) => {
      if (a.version !== b.version) return a.version.localeCompare(b.version);
      return Number(a.id) - Number(b.id);
    });

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
