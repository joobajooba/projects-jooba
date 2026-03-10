/**
 * Badge eligibility (NFT-holder verification) and storage.
 * Uses Alchemy NFT API (works in browser, no CORS) to check if a wallet holds
 * NFTs from specified collections, then stores the badge in Supabase.
 */

import { supabase } from './lib/supabase';
import { getAlchemyApiKey } from './lib/alchemy';

const BADGES_TABLE = 'badges';

/** Badge image URL for Not A Punks Cult / MineBoys holders (served from app public folder). */
export const NOT_A_PUNKS_CULT_BADGE_URL = '/badges/notapunkscult.png';

/** Not A Punks Cult is on ApeChain (OpenSea slug: not-a-punks-cult). */
const NOT_A_PUNKS_CULT_CONTRACT = '0xfa1c20e0d4277b1e0b289dffadb5bd92fb8486aa';

/** MineBoys (by same creator, Uncle Mac) on ApeChain (OpenSea: mineboys). */
const MINEBOYS_CONTRACT = '0xa8a16c3259ad84162a0868e7927523b81ef8bf2d';

const ALCHEMY_NFT_BASE = {
  ethereum: 'https://eth-mainnet.g.alchemy.com/nft/v3',
  apechain: 'https://apechain-mainnet.g.alchemy.com/nft/v3',
};

/** Collections that grant the same badge (Not A Punks Cult / MineBoys). First match wins. */
const COLLECTION_BADGES = [
  {
    chain: 'apechain',
    contractAddress: NOT_A_PUNKS_CULT_CONTRACT,
    badgeImageUrl: NOT_A_PUNKS_CULT_BADGE_URL,
  },
  {
    chain: 'apechain',
    contractAddress: MINEBOYS_CONTRACT,
    badgeImageUrl: NOT_A_PUNKS_CULT_BADGE_URL,
  },
];

/**
 * Check if the wallet holds at least one NFT from the given contract on the given chain.
 * Uses Alchemy getNFTsForOwner (browser-safe, no CORS issues). Paginates to handle large holdings.
 * @param {string} walletAddress - EIP-155 address
 * @param {string} chain - 'ethereum' | 'apechain'
 * @param {string} contractAddress - Contract address (lowercase)
 * @param {{ log?: boolean }} opts - set log: true to log progress to console
 * @returns {Promise<boolean>}
 */
export async function walletHoldsCollectionNft(walletAddress, chain, contractAddress, opts = {}) {
  const log = opts.log ?? false;
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
    if (log) console.warn('[badges] No Alchemy API key for', chain, '- set VITE_ALCHEMY_API_KEY or VITE_ALCHEMY_API_KEY_APECHAIN in your build env (e.g. Netlify)');
    return false;
  }

  const contractLower = contractAddress.toLowerCase();
  let pageToken = undefined;
  let totalFetched = 0;

  if (log) console.log('[badges] Fetching NFTs from Alchemy (ApeChain)…');
  try {
    do {
      const params = new URLSearchParams({
        owner: address,
        pageSize: '100',
        withMetadata: 'false',
      });
      if (pageToken) params.set('pageToken', pageToken);
      const url = `${baseUrl}/${apiKey}/getNFTsForOwner?${params.toString()}`;
      const res = await fetch(url);
      if (!res.ok) {
        const text = await res.text();
        if (log) console.warn('[badges] Alchemy response not ok', res.status, text?.slice(0, 200));
        return false;
      }
      const data = await res.json();
      const nfts = data?.ownedNfts ?? [];
      pageToken = data?.nextPageToken ?? null;
      totalFetched += nfts.length;

      // Debug: log sample of contract addresses Alchemy returned (first page only)
      if (log && totalFetched === nfts.length && nfts.length > 0) {
        const sample = [...new Set(nfts.map((n) => (n?.contract?.address || '').toLowerCase()).filter(Boolean))].slice(0, 8);
        console.log('[badges] Alchemy returned', nfts.length, 'NFTs this page. Sample contract addresses:', sample);
        console.log('[badges] Looking for contract:', contractLower);
      }

      const normalize = (addr) => (addr && typeof addr === 'string' ? addr.trim().toLowerCase().replace(/^0x/, '') : '');
      const target = normalize(contractAddress);
      const holds = nfts.some((n) => {
        const a = (n?.contract?.address ?? n?.contractAddress ?? '').toString();
        if (!a) return false;
        return normalize(a) === target;
      });
      if (holds) {
        if (log) console.log('[badges] Found qualifying NFT (contract', contractAddress, ') after', totalFetched, 'NFTs checked');
        return true;
      }
    } while (pageToken);

    if (log) console.log('[badges] No NFT from contract', contractAddress, 'found in', totalFetched, 'NFTs on', chain);
    return false;
  } catch (e) {
    if (log) console.warn('[badges] walletHoldsCollectionNft failed', chain, e?.message || e);
    return false;
  }
}

/**
 * For a connected wallet, check NFT eligibility and assign the first matching badge.
 * Idempotent: safe to call on every connect.
 * @param {string} walletAddress - Connected wallet address
 * @param {{ log?: boolean }} opts - set log: true to log progress to console
 * @returns {Promise<{ assigned: boolean, badgeImageUrl?: string, error?: string }>}
 */
export async function checkAndAssignBadge(walletAddress, opts = {}) {
  const log = opts.log ?? false;
  console.log('[badges] checkAndAssignBadge called, wallet:', walletAddress ? `${walletAddress.slice(0, 10)}…` : 'none');
  if (!walletAddress) return { assigned: false, error: 'No wallet' };
  if (!supabase) return { assigned: false, error: 'Supabase not configured' };
  const normalized = walletAddress.toLowerCase().trim();

  if (log) console.log('[badges] Checking badge eligibility for', normalized);

  for (const { chain, contractAddress, badgeImageUrl } of COLLECTION_BADGES) {
    const holds = await walletHoldsCollectionNft(walletAddress, chain, contractAddress, { log });
    if (holds) {
      if (log) console.log('[badges] Eligible – upserting badge into Supabase');
      const { error } = await supabase.from(BADGES_TABLE).upsert(
        {
          wallet_address: normalized,
          badge_image_url: badgeImageUrl,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'wallet_address' }
      );
      if (error) {
        if (log) {
          console.warn('[badges] Supabase upsert failed –', error.code, error.message, error.details || '');
          if (error.code === '42P01' || (error.message && error.message.includes('does not exist'))) {
            console.warn('[badges] Make sure the badges table exists: run supabase/migrations/create_badges.sql in Supabase Dashboard → SQL Editor.');
          }
        }
        return { assigned: false, error: error.message };
      }
      if (log) console.log('[badges] Badge assigned successfully');
      return { assigned: true, badgeImageUrl };
    }
  }

  if (log) console.log('[badges] No matching collection found – no badge assigned');
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
