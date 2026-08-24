import { createPublicClient, http } from 'viem';

export const KEEP_V2_ADDRESS = '0x51eA8743109F1b9C70C9d1a9A56cCaA5C2877ee9';
export const KEEP_MAX_SUPPLY = 2222;
export const CHAPTER1_SOLD_OUT_MESSAGE =
  'Chapter 1 is complete. All 2222 Imp Keeps have been minted.';

const RPC_URL = 'https://rpc.mainnet.chain.robinhood.com';
const TOTAL_SUPPLY_ABI = [
  {
    type: 'function',
    name: 'totalSupply',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
];

let cache = {
  soldOut: false,
  totalSupply: null,
  maxSupply: KEEP_MAX_SUPPLY,
  checkedAt: 0,
};

function client() {
  return createPublicClient({
    chain: {
      id: 4663,
      name: 'Robinhood Chain',
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      rpcUrls: { default: { http: [RPC_URL] } },
    },
    transport: http(RPC_URL, { timeout: 4000 }),
  });
}

export async function readKeepSupply() {
  if (cache.soldOut) return cache;

  const now = Date.now();
  if (cache.totalSupply != null && now - cache.checkedAt < 15_000) return cache;

  const supply = await client().readContract({
    address: KEEP_V2_ADDRESS,
    abi: TOTAL_SUPPLY_ABI,
    functionName: 'totalSupply',
  });
  const totalSupply = Number(supply);
  cache = {
    soldOut: Number.isFinite(totalSupply) && totalSupply >= KEEP_MAX_SUPPLY,
    totalSupply: Number.isFinite(totalSupply) ? totalSupply : cache.totalSupply,
    maxSupply: KEEP_MAX_SUPPLY,
    checkedAt: now,
  };
  return cache;
}

export async function readKeepSupplySafe() {
  try {
    return await readKeepSupply();
  } catch (error) {
    console.error('keep supply lookup failed', error);
    return cache.totalSupply == null
      ? { soldOut: false, totalSupply: null, maxSupply: KEEP_MAX_SUPPLY, checkedAt: 0 }
      : cache;
  }
}
