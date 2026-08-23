import { KEEP_V2_HONEST_ID_SET, isBannedKeepWallet, isHonestKeepId } from './keepV2Allowlist';
import { DUNGEON_KEEP_ADDRESS, keepPreviewUrl } from './dungeonKeep';

export const DUNGEON_KEEP_V1_ADDRESS = DUNGEON_KEEP_ADDRESS;
export const DUNGEON_KEEP_V2_ADDRESS = import.meta.env.VITE_DUNGEON_KEEP_V2_ADDRESS || '';

export const IMP_KEEPS_V2_ABI = [
  {
    type: 'function',
    name: 'claim',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'claimMany',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'tokenIds', type: 'uint256[]' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'claimed',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ type: 'bool' }],
  },
  {
    type: 'function',
    name: 'isAllowed',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ type: 'bool' }],
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
    name: 'paused',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'bool' }],
  },
  {
    type: 'function',
    name: 'claimsOpen',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'bool' }],
  },
];

export function keepV2Configured() {
  return /^0x[a-fA-F0-9]{40}$/.test(DUNGEON_KEEP_V2_ADDRESS);
}

export function classifyV1Keep(tokenId, walletAddress) {
  const id = Number(tokenId);
  if (isBannedKeepWallet(walletAddress)) {
    return 'banned';
  }
  if (KEEP_V2_HONEST_ID_SET.has(id) || isHonestKeepId(id)) {
    return 'eligible';
  }
  return 'void';
}

export function keepV2OpenSeaCollectionUrl() {
  if (!keepV2Configured()) return '';
  return `https://opensea.io/assets/robinhood/${DUNGEON_KEEP_V2_ADDRESS}`;
}

export function keepV2Preview(seed, tokenId) {
  return keepPreviewUrl(seed, { format: 'png', tokenId });
}
