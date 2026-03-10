/**
 * Badge eligibility (NFT-holder verification) and storage.
 * Uses Alchemy NFT API (works in browser, no CORS) to check if a wallet holds
 * NFTs from specified collections, then stores the badge in Supabase.
 */

import { supabase } from './lib/supabase';
import { getAlchemyApiKey } from './lib/alchemy';

const BADGES_TABLE = 'badges';

/** Badge image URL for Not A Punks Cult holders (served from app public folder). */
export const NOT_A_PUNKS_CULT_BADGE_URL = '/badges/notapunkscult.png';

/** Not A Punks Cult is on ApeChain (OpenSea slug: not-a-punks-cult). */
const NOT_A_PUNKS_CULT_CONTRACT = '0xfa1c20e0d4277b1e0b289dffadb5bd92fb8486aa';

const ALCHEMY_NFT_BASE = {
  ethereum: 'https://eth-mainnet.g.alchemy.com/nft/v3',
  apechain: 'https://apechain-mainnet.g.alchemy.com/nft/v3',
};

/** List of badge rules: chain, contract address (lowercase), badge image URL. */
const COLLECTION_BADGES = [
  {
    chain: 'apechain',
    contractAddress: NOT_A_PUNKS_CULT_CONTRACT,
    badgeImageUrl: NOT_A_PUNKS_CULT_BADGE_URL,
  },
];

/**
 * Check if the wallet holds at least one NFT from the given contract on the given chain.
 * Uses Alchemy getNFTsForOwner (browser-safe, no CORS issues).
 * @param {string} walletAddress - EIP-155 address
 * @param {string} chain - 'ethereum' | 'apechain'
 * @param {string} contractAddress - Contract address (lowercase)
 * @returns {Promise<boolean>}
 */
export async function walletHoldsCollectionNft(walletAddress, chain, contractAddress) {
  if (!walletAddress || !contractAddress) return false;
  const address = walletAddress.trim();
  if (!address.startsWith('0x') || address.length !== 42) return false;

  const baseUrl = ALCHEMY_NFT_BASE[chain];
  if (!baseUrl) return false;

  const apiKey =
    chain === 'apechain'
      ? getAlchemyApiKey(import.meta.env.VITE_ALCHEMY_API_KEY_APECHAIN || import.meta.env.VITE_ALCHEMY_API_KEY)
      : getAlchemyApiKey(import.meta.env.VITE_ALCHEMY_API_KEY_ETH || import.meta.env.VITE_ALCHEMY_API_KEY);
  if (!apiKey) {
    console.warn('[badges] No Alchemy API key for', chain);
    return false;
  }

  const url = `${baseUrl}/${apiKey}/getNFTsForOwner?owner=${encodeURIComponent(address)}&pageSize=100&withMetadata=false`;
  try {
    const res = await fetch(url);
    if (!res.ok) return false;
    const data = await res.json();
    const nfts = data?.ownedNfts ?? [];
    const contractLower = contractAddress.toLowerCase();
    const holds = nfts.some(
      (n) => n?.contract?.address && n.contract.address.toLowerCase() === contractLower
    );
    return holds;
  } catch (e) {
    console.warn('[badges] walletHoldsCollectionNft failed', chain, contractAddress, e?.message || e);
    return false;
  }
}

/**
 * For a connected wallet, check NFT eligibility and assign the first matching badge.
 * Idempotent: safe to call on every connect.
 * @param {string} walletAddress - Connected wallet address
 * @returns {Promise<{ assigned: boolean, badgeImageUrl?: string }>}
 */
export async function checkAndAssignBadge(walletAddress) {
  if (!supabase || !walletAddress) return { assigned: false };
  const normalized = walletAddress.toLowerCase().trim();

  for (const { chain, contractAddress, badgeImageUrl } of COLLECTION_BADGES) {
    const holds = await walletHoldsCollectionNft(walletAddress, chain, contractAddress);
    if (holds) {
      const { error } = await supabase.from(BADGES_TABLE).upsert(
        {
          wallet_address: normalized,
          badge_image_url: badgeImageUrl,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'wallet_address' }
      );
      if (error) {
        console.warn('[badges] upsert badge failed', error);
        return { assigned: false };
      }
      return { assigned: true, badgeImageUrl };
    }
  }

  return { assigned: false };
}

/**
 * Fetch the badge record for a wallet from the badges table.
 * @param {string} walletAddress
 * @returns {Promise<{ badgeImageUrl: string } | null>}
 */
export async function fetchWalletBadge(walletAddress) {
  if (!supabase || !walletAddress) return null;
  const normalized = walletAddress.toLowerCase().trim();
  const { data, error } = await supabase
    .from(BADGES_TABLE)
    .select('badge_image_url')
    .eq('wallet_address', normalized)
    .maybeSingle();
  if (error) {
    console.warn('[badges] fetchWalletBadge failed', error);
    return null;
  }
  if (!data?.badge_image_url) return null;
  return { badgeImageUrl: data.badge_image_url };
}
