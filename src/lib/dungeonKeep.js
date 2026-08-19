export const DUNGEON_KEEP_ADDRESS =
  import.meta.env.VITE_DUNGEON_KEEP_ADDRESS || '0x639061b01ab4261b4283a0AC9D3bB8B99013Bad4';

export const DUNGEON_KEEP_ABI = [
  {
    type: 'function',
    name: 'mint',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'seed', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
      { name: 'signature', type: 'bytes' },
    ],
    outputs: [],
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
  {
    type: 'event',
    name: 'KeepMinted',
    inputs: [
      { name: 'to', type: 'address', indexed: true },
      { name: 'tokenId', type: 'uint256', indexed: true },
      { name: 'seed', type: 'uint256', indexed: false },
    ],
  },
];

export function keepOpenSeaItemUrl(keepAddress, tokenId) {
  if (!keepAddress || !tokenId) return '';
  return `https://opensea.io/item/robinhood/${keepAddress}/${tokenId}`;
}

export function keepOpenSeaCollectionUrl(keepAddress) {
  if (!keepAddress) return 'https://opensea.io';
  return `https://opensea.io/assets/robinhood/${keepAddress}`;
}

export function seedHex(value) {
  return `0x${BigInt(value).toString(16).padStart(64, '0')}`;
}

export function tokenIdFromMintReceipt(receipt) {
  const transferLog = receipt?.logs?.find((log) => log.topics?.length === 4);
  if (!transferLog?.topics?.[3]) return 0;
  return Number(BigInt(transferLog.topics[3]));
}
