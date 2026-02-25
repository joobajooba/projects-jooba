import { useState, useCallback, useEffect } from 'react';
import { useAccount } from 'wagmi';

/**
 * Normalize NFT from Alchemy-style response to { imageUrl, name, network, raw }.
 */
/** Prefer highest-resolution image URL to avoid blur when displayed at thumbnail size. */
function getImageUrl(nft) {
  return (
    nft.image?.originalUrl ||
    nft.image?.cachedUrl ||
    nft.image?.pngUrl ||
    nft.image?.thumbnailUrl ||
    nft.image ||
    nft.media?.[0]?.raw ||
    nft.media?.[0]?.gateway ||
    nft.rawMetadata?.image ||
    nft.image_original_url ||
    nft.image_url
  );
}

function getCollectionName(nft) {
  return (
    nft.contract?.name ||
    nft.contractMetadata?.name ||
    nft.collection?.name ||
    nft.collection_name ||
    nft.rawMetadata?.name ||
    ''
  ).trim() || null;
}

function getContractAddress(nft) {
  const addr =
    nft.contract?.address ||
    nft.asset_contract?.address ||
    nft.contract_address ||
    nft.tokenAddress;
  return addr ? String(addr).toLowerCase() : null;
}

function normalizeNft(nft, network) {
  const imageUrl = getImageUrl(nft);
  const collection = getCollectionName(nft);
  const contractAddress = getContractAddress(nft);
  const name =
    nft.name ||
    nft.title ||
    `${nft.contract?.name || nft.collection?.name || 'NFT'} #${nft.tokenId || nft.id?.tokenId || nft.token_id || ''}`;
  return { imageUrl, name, network, collection, contractAddress, raw: nft };
}

/**
 * Fetch NFTs from a single chain (Alchemy v3).
 */
async function fetchChainAlchemy(ownerAddress, network, apiKey, pageSize = 50) {
  const url = `https://${network}.g.alchemy.com/nft/v3/${apiKey}/getNFTsForOwner?owner=${encodeURIComponent(ownerAddress)}&withMetadata=true&pageSize=${pageSize}`;
  const response = await fetch(url);
  if (!response.ok) return [];
  const data = await response.json();
  const all = data.ownedNfts ?? data.nfts ?? [];
  const getImg = (n) =>
    n.image?.originalUrl ||
    n.image?.cachedUrl ||
    n.image?.pngUrl ||
    n.image?.thumbnailUrl ||
    n.image ||
    n.media?.[0]?.gateway ||
    n.media?.[0]?.raw ||
    n.rawMetadata?.image;
  return all
    .filter((n) => {
      const img = getImg(n);
      return img && img !== 'null' && !String(img).includes('data:image/svg');
    })
    .map((n) => normalizeNft(n, network === 'eth-mainnet' ? 'Ethereum' : 'ApeChain'));
}

/**
 * OpenSea fallback for Ethereum.
 */
async function fetchOpenSea(ownerAddress) {
  const url = `https://api.opensea.io/api/v1/assets?owner=${encodeURIComponent(ownerAddress)}&order_direction=desc&offset=0&limit=50`;
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) return [];
  const data = await response.json();
  const assets = data.assets || [];
  return assets
    .filter((a) => {
      const img = a.image_original_url || a.image_url || a.image_preview_url;
      return img && img !== 'null';
    })
    .map((a) => ({
      imageUrl: a.image_original_url || a.image_url || a.image_preview_url,
      name: a.name || `${a.collection?.name || 'NFT'} #${a.token_id}`,
      network: 'Ethereum',
      collection: (a.collection?.name || '').trim() || null,
      contractAddress: a.asset_contract?.address ? String(a.asset_contract.address).toLowerCase() : null,
      raw: a,
    }));
}

/**
 * ApeScan fallback for ApeChain.
 */
async function fetchApeScan(ownerAddress) {
  const url = `https://api.apescan.io/v2/api?chainid=33139&module=account&action=addresstokennftbalance&address=${encodeURIComponent(ownerAddress)}&page=1&offset=100`;
  const response = await fetch(url);
  if (!response.ok) return [];
  const data = await response.json();
  const result = data.result;
  if (data.status !== '1' || !Array.isArray(result) || result.length === 0) return [];
  const slice = result.slice(0, 50);
  const withMeta = await Promise.all(
    slice.map(async (item) => {
      const contract = item.contract_address || item.tokenAddress;
      const tokenId = item.token_id ?? item.tokenId;
      if (!contract || tokenId == null) return null;
      try {
        const metaUrl = `https://api.apescan.io/v2/api?chainid=33139&module=token&action=nftmetadata&contractaddress=${contract}&tokenid=${tokenId}`;
        const metaRes = await fetch(metaUrl);
        if (!metaRes.ok) return { name: `NFT #${tokenId}`, imageUrl: null, network: 'ApeChain', raw: {} };
        const meta = await metaRes.json();
        const imageUrl = meta.result?.image || meta.image;
        const collection = (meta.result?.collection || meta.collection || item.collection_name || '').trim() || null;
        const contractAddress = contract ? String(contract).toLowerCase() : null;
        return {
          imageUrl,
          name: meta.result?.name || meta.name || `NFT #${tokenId}`,
          network: 'ApeChain',
          collection: collection || null,
          contractAddress,
          raw: { ...meta, contract_address: contract, token_id: tokenId },
        };
      } catch (e) {
        return { name: `NFT #${tokenId}`, imageUrl: null, network: 'ApeChain', raw: {} };
      }
    })
  );
  return withMeta.filter((n) => n && n.imageUrl);
}

/**
 * Hook: fetch NFTs from both Ethereum and ApeChain for mosaic builder.
 * Returns { nfts, loading, error, refetch }.
 */
export function useMosaicNFTs() {
  const { address } = useAccount();
  const [nfts, setNfts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    if (!address) {
      setNfts([]);
      return;
    }
    const owner = address.toLowerCase();
    setLoading(true);
    setError(null);
    try {
      const ethKey = import.meta.env.VITE_ALCHEMY_API_KEY_ETH || import.meta.env.VITE_ALCHEMY_API_KEY;
      const apeKey = import.meta.env.VITE_ALCHEMY_API_KEY_APECHAIN || import.meta.env.VITE_ALCHEMY_API_KEY;
      let ethNfts = [];
      let apeNfts = [];

      if (ethKey) {
        ethNfts = await fetchChainAlchemy(owner, 'eth-mainnet', ethKey);
        if (ethNfts.length === 0) ethNfts = await fetchOpenSea(owner);
      } else {
        ethNfts = await fetchOpenSea(owner);
      }

      if (apeKey) {
        apeNfts = await fetchChainAlchemy(owner, 'apechain-mainnet', apeKey);
      }
      if (apeNfts.length === 0) {
        apeNfts = await fetchApeScan(owner);
      }

      // Dedupe by imageUrl so the same NFT (e.g. bridged on two chains) appears once with one contract
      const combined = [];
      const seenImageUrl = new Set();
      for (const n of ethNfts) {
        const key = (n.imageUrl || '').trim();
        if (key && seenImageUrl.has(key)) continue;
        if (key) seenImageUrl.add(key);
        combined.push({ ...n, id: `eth-${n.contractAddress ?? ''}-${n.raw?.tokenId ?? n.raw?.token_id ?? Math.random()}` });
      }
      for (const n of apeNfts) {
        const key = (n.imageUrl || '').trim();
        if (key && seenImageUrl.has(key)) continue;
        if (key) seenImageUrl.add(key);
        combined.push({ ...n, id: `ape-${n.contractAddress ?? ''}-${n.raw?.tokenId ?? n.raw?.token_id ?? Math.random()}` });
      }
      setNfts(combined);
      if (combined.length === 0 && ethNfts.length === 0 && apeNfts.length === 0) {
        setError('No NFTs found on Ethereum or ApeChain. Add VITE_ALCHEMY_API_KEY_ETH and/or VITE_ALCHEMY_API_KEY_APECHAIN for best results.');
      }
    } catch (err) {
      console.error('useMosaicNFTs fetch error:', err);
      setError(err.message || 'Failed to load NFTs');
      setNfts([]);
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { nfts, loading, error, refetch };
}
