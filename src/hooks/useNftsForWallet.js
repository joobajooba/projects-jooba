import { useCallback, useEffect, useState } from 'react';

const ALCHEMY_KEY = import.meta.env.VITE_ALCHEMY_API_KEY;

function pickNftImage(nft) {
  const img = nft?.image;
  if (img?.cachedUrl) return img.cachedUrl;
  if (img?.pngUrl) return img.pngUrl;
  if (img?.thumbnailUrl) return img.thumbnailUrl;
  if (img?.originalUrl) return img.originalUrl;
  const raw = nft?.raw?.metadata?.image;
  if (typeof raw === 'string') {
    if (raw.startsWith('ipfs://')) {
      return `https://ipfs.io/ipfs/${raw.slice(7)}`;
    }
    return raw;
  }
  return null;
}

function formatAlchemyErrorBody(text) {
  const raw = (text || '').trim();
  if (!raw) return null;
  try {
    const j = JSON.parse(raw);
    if (typeof j?.message === 'string' && j.message.trim()) return j.message.trim();
  } catch {
    /* plain text */
  }
  return raw.length > 280 ? `${raw.slice(0, 280)}…` : raw;
}

async function fetchPage(baseUrl, owner, pageKey) {
  const params = new URLSearchParams({
    owner,
    pageSize: '100',
    ...(pageKey ? { pageKey } : {}),
  });
  const res = await fetch(`${baseUrl}/getNFTsForOwner?${params}`);
  if (!res.ok) {
    const t = await res.text();
    const msg = formatAlchemyErrorBody(t) || res.statusText;
    throw new Error(msg);
  }
  return res.json();
}

async function fetchChainNfts(networkSlug, owner) {
  if (!ALCHEMY_KEY) return [];
  const baseUrl = `https://${networkSlug}.g.alchemy.com/nft/v3/${ALCHEMY_KEY}`;
  const out = [];
  let pageKey = null;
  let guard = 0;
  do {
    const json = await fetchPage(baseUrl, owner, pageKey);
    const list = json?.ownedNfts ?? [];
    for (const nft of list) {
      const imageUrl = pickNftImage(nft);
      if (!imageUrl) continue;
      const contract = nft?.contract?.address;
      const tokenId = nft?.tokenId ?? nft?.id?.tokenId;
      if (!contract || tokenId == null) continue;
      out.push({
        id: `${networkSlug}:${contract}:${tokenId}`,
        chainLabel: networkSlug === 'eth-mainnet' ? 'ETH' : 'APE',
        networkSlug,
        name: nft?.name || nft?.contract?.name || `#${tokenId}`,
        imageUrl,
        contract,
        tokenId: String(tokenId),
      });
    }
    pageKey = json?.pageKey ?? null;
    guard += 1;
  } while (pageKey && guard < 5);
  return out;
}

/**
 * Loads NFTs owned by `address` on Ethereum mainnet and ApeChain via Alchemy NFT API.
 * Requires `VITE_ALCHEMY_API_KEY` (create app with Ethereum + ApeChain in Alchemy dashboard).
 */
export function useNftsForWallet(address) {
  const [nfts, setNfts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!address) {
      setNfts([]);
      setError(null);
      setLoading(false);
      return;
    }
    if (!ALCHEMY_KEY) {
      setNfts([]);
      setError('missing_key');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [ethResult, apeResult] = await Promise.allSettled([
        fetchChainNfts('eth-mainnet', address),
        fetchChainNfts('apechain-mainnet', address),
      ]);
      const eth = ethResult.status === 'fulfilled' ? ethResult.value : [];
      const ape = apeResult.status === 'fulfilled' ? apeResult.value : [];
      const merged = [...eth, ...ape];
      const seen = new Set();
      const deduped = [];
      for (const n of merged) {
        if (seen.has(n.id)) continue;
        seen.add(n.id);
        deduped.push(n);
      }
      setNfts(deduped);

      const ethErr = ethResult.status === 'rejected' ? ethResult.reason?.message : null;
      const apeErr = apeResult.status === 'rejected' ? apeResult.reason?.message : null;
      if (deduped.length === 0) {
        const msgs = [ethErr, apeErr].filter(Boolean);
        setError(msgs.length ? msgs.join(' · ') : null);
      } else if (ethErr || apeErr) {
        const parts = [];
        if (ethErr) parts.push(`Ethereum: ${ethErr}`);
        if (apeErr) parts.push(`ApeChain: ${apeErr}`);
        setError(parts.join(' '));
      } else {
        setError(null);
      }
    } catch (e) {
      setNfts([]);
      setError(e?.message || 'Could not load NFTs');
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    load();
  }, [load]);

  return { nfts, loading, error, reload: load, hasApiKey: Boolean(ALCHEMY_KEY) };
}
