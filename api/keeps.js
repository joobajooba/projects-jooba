import { createPublicClient, http } from 'viem';
import { optionsFromSeed } from './lib/dungeonTraits.js';

const KEEP_CONTRACT = '0x639061b01ab4261b4283a0AC9D3bB8B99013Bad4';
const BLOCKSCOUT_API = 'https://robinhoodchain.blockscout.com/api/v2';
const RPC_URL = 'https://rpc.mainnet.chain.robinhood.com';
const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;
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
  return `0x${BigInt(value).toString(16).padStart(64, '0')}`;
}

function previewUrl(seed, tokenId) {
  const params = new URLSearchParams({ seed, format: 'png', tokenId: String(tokenId) });
  return `/api/dungeon-preview?${params}`;
}

async function enrichKeep(client, item) {
  const tokenId = String(item.id);
  try {
    const seed = await client.readContract({
      address: KEEP_CONTRACT,
      abi: KEEP_ABI,
      functionName: 'seedOf',
      args: [BigInt(tokenId)],
    });
    const hex = seedHex(seed);
    const opts = optionsFromSeed(hex, Number(tokenId));
    return {
      id: tokenId,
      name: `Imp Keep #${tokenId}`,
      image: previewUrl(hex, tokenId),
      seed: hex,
      tileset: opts.tileset,
      biome: opts.biome,
      dungeonType: opts.dungeonType,
      miniBoss: opts.miniBoss,
    };
  } catch {
    return {
      id: tokenId,
      name: item.metadata?.name || `Imp Keep #${tokenId}`,
      image: '',
      seed: '',
      tileset: '',
      biome: 'Unknown',
      dungeonType: '',
      miniBoss: '',
    };
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

  const url = new URL(`${BLOCKSCOUT_API}/tokens/${KEEP_CONTRACT}/instances`);
  url.searchParams.set('holder_address_hash', owner);

  const items = [];
  let page = 0;

  try {
    while (page < 50) {
      const blockscoutResponse = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; j00ba.xyz/keep-ownership)',
        },
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

    const client = createPublicClient({
      chain: {
        id: 4663,
        name: 'Robinhood Chain',
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        rpcUrls: { default: { http: [RPC_URL] } },
      },
      transport: http(RPC_URL),
    });

    const keeps = (
      await Promise.all(items.map((item) => enrichKeep(client, item)))
    ).sort((a, b) => Number(a.id) - Number(b.id));

    response.setHeader('Cache-Control', 'public, s-maxage=15, stale-while-revalidate=30');
    return response.status(200).json({
      contract: KEEP_CONTRACT,
      items: keeps,
    });
  } catch (error) {
    console.error('Failed to load Imp Keep ownership', error);
    return response.status(502).json({
      error: 'The Imp Keep ownership service is temporarily unavailable.',
    });
  }
}
