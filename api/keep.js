import { createPublicClient, http } from 'viem';
import { generateDungeonLayout } from '../src/lib/dungeonLayout.js';

const KEEP_ADDRESS = process.env.DUNGEON_KEEP_ADDRESS || process.env.VITE_DUNGEON_KEEP_ADDRESS || '';
const RPC_URL = 'https://rpc.mainnet.chain.robinhood.com';
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

function siteOrigin(request) {
  const header = request.headers['x-forwarded-host'] || request.headers.host;
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, '');
  if (header) return `https://${header}`;
  return 'https://j00ba.xyz';
}

function seedHex(value) {
  return `0x${BigInt(value).toString(16).padStart(64, '0')}`;
}

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'Method not allowed.' });
  }

  const queryId = Array.isArray(request.query.id) ? request.query.id[0] : request.query.id;
  const pathId = String(request.url || '').match(/\/api\/keep\/(\d+)/)?.[1];
  const tokenId = queryId || pathId;
  if (!tokenId || !/^\d+$/.test(tokenId) || Number(tokenId) < 1 || Number(tokenId) > 4444) {
    return response.status(400).json({ error: 'A keep token id is required.' });
  }

  if (!KEEP_ADDRESS) {
    return response.status(503).json({ error: 'Keep contract is not configured.' });
  }

  try {
    const client = createPublicClient({
      chain: {
        id: 4663,
        name: 'Robinhood Chain',
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        rpcUrls: { default: { http: [RPC_URL] } },
      },
      transport: http(RPC_URL),
    });
    const seed = await client.readContract({
      address: KEEP_ADDRESS,
      abi: KEEP_ABI,
      functionName: 'seedOf',
      args: [BigInt(tokenId)],
    });
    const owner = await client.readContract({
      address: KEEP_ADDRESS,
      abi: KEEP_ABI,
      functionName: 'ownerOf',
      args: [BigInt(tokenId)],
    });
    const hex = seedHex(seed);
    const layout = generateDungeonLayout(hex);
    const origin = siteOrigin(request);
    const image = `${origin}/api/dungeon-preview?seed=${encodeURIComponent(hex)}&format=svg`;

    response.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    return response.status(200).json({
      name: `Lost Keep #${tokenId}`,
      description:
        'A procedurally generated dungeon uncovered during an IMPLINGz adventure on Robinhood Chain. Minted on j00ba.xyz. Secondary trading is on OpenSea in ETH.',
      image,
      external_url: `${origin}/the-dungeon`,
      attributes: [
        { trait_type: 'Rooms', value: layout.rooms },
        { trait_type: 'Tileset', value: layout.tileset },
        { trait_type: 'Seed', value: hex },
        { trait_type: 'Owner', value: owner },
      ],
    });
  } catch {
    return response.status(404).json({ error: 'That keep has not been minted yet.' });
  }
}
