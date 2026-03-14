import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';

const ALCHEMY_ETH_BASE = 'https://eth-mainnet.g.alchemy.com/nft/v3';
const ALCHEMY_APECHAIN_BASE = 'https://apechain-mainnet.g.alchemy.com/nft/v3';
const PAGE_SIZE = 100;
const IPFS_GATEWAY = 'https://ipfs.io/ipfs/';

function getAlchemyKey(network) {
  const key = import.meta.env.VITE_ALCHEMY_API_KEY;
  const ethKey = import.meta.env.VITE_ALCHEMY_API_KEY_ETH || key;
  const apeKey = import.meta.env.VITE_ALCHEMY_API_KEY_APECHAIN || key;
  return network === 'apechain' ? apeKey : ethKey;
}

function toGatewayUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const t = url.trim();
  if (t.startsWith('ipfs://')) return IPFS_GATEWAY + t.slice(7);
  if (t.startsWith('Qm') && t.length === 46) return IPFS_GATEWAY + t;
  if (t.startsWith('ba')) return IPFS_GATEWAY + t;
  return t;
}

// Prefer URLs that are 2D images (for NFTs that also have 3D model / animation_url).
function isImageUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const u = url.toLowerCase().split('?')[0];
  return /\.(png|jpe?g|gif|webp|svg|bmp|ico)(\b|$)/i.test(u) || u.includes('image');
}

function getNftImageUrl(nft) {
  const meta = nft?.raw?.metadata ?? {};
  const imageFromMeta = typeof meta.image === 'string' ? meta.image : null;
  const animationFromMeta = typeof meta.animation_url === 'string' ? meta.animation_url : null;

  // Prefer standard 2D image from metadata (so NFTs with both image + 3D model show the image).
  if (imageFromMeta && isImageUrl(imageFromMeta)) {
    const url = toGatewayUrl(imageFromMeta);
    if (url) return url;
  }

  const candidates = [
    nft?.image?.cachedUrl,
    nft?.image?.thumbnailUrl,
    nft?.image?.pngUrl,
    nft?.image?.originalUrl,
    imageFromMeta,
    nft?.media?.[0]?.gateway,
    nft?.media?.[0]?.raw,
  ].filter(Boolean);

  // If Alchemy put the 3D model first, prefer an image-type URL.
  for (const raw of candidates) {
    const url = toGatewayUrl(raw);
    if (url && isImageUrl(url)) return url;
  }
  for (const raw of candidates) {
    const url = toGatewayUrl(raw);
    if (url) return url;
  }

  // Last resort: animation_url only if it looks like an image (e.g. some use GIF for animation_url).
  if (animationFromMeta && isImageUrl(animationFromMeta)) {
    const url = toGatewayUrl(animationFromMeta);
    if (url) return url;
  }

  return null;
}

async function fetchAllNFTsForOwner(owner, network) {
  const base = network === 'apechain' ? ALCHEMY_APECHAIN_BASE : ALCHEMY_ETH_BASE;
  const key = getAlchemyKey(network);
  if (!key || key === 'your_alchemy_api_key_here') return [];
  const all = [];
  let pageKey = null;
  try {
    do {
      const params = new URLSearchParams({
        owner,
        pageSize: String(PAGE_SIZE),
      });
      if (pageKey) params.set('pageKey', pageKey);
      const res = await fetch(`${base}/${key}/getNFTsForOwner?${params}`);
      const data = await res.json();
      const list = data?.ownedNfts ?? [];
      for (const nft of list) {
        const image = getNftImageUrl(nft);
        all.push({
          id: `${nft.contract?.address ?? ''}-${nft.tokenId ?? ''}-${network}`,
          image,
          name: nft?.title ?? nft?.raw?.metadata?.name ?? `#${nft?.tokenId ?? ''}`,
          collection: nft?.contract?.name ?? nft?.collection?.name ?? '',
          network,
        });
      }
      pageKey = data?.pageKey ?? null;
    } while (pageKey);
  } catch (e) {
    console.warn(`Alchemy NFT fetch (${network}) failed:`, e);
  }
  return all;
}

export default function AvatarNFTSelector({ value, onChange, variant = 'inline' }) {
  const isModal = variant === 'modal';
  const { address, isConnected } = useAccount();
  const [loading, setLoading] = useState(false);
  const [nfts, setNfts] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!address || !isConnected) {
      setNfts([]);
      return;
    }
    setLoading(true);
    setError(null);
    Promise.all([
      fetchAllNFTsForOwner(address, 'ethereum'),
      fetchAllNFTsForOwner(address, 'apechain'),
    ])
      .then(([eth, ape]) => {
        setNfts([...eth, ...ape]);
      })
      .catch((e) => {
        setError(e?.message ?? 'Failed to load NFTs');
        setNfts([]);
      })
      .finally(() => setLoading(false));
  }, [address, isConnected]);

  if (!isConnected) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-xs text-gray-500">Connect your wallet to select an NFT as avatar.</p>
        <div className="flex justify-center">
          <ConnectButton.Custom>
            {({ openConnectModal }) => (
              <button
                type="button"
                onClick={openConnectModal}
                className="px-3 py-2 rounded-lg border border-gray-600 bg-gray-800 text-gray-200 text-sm hover:bg-gray-700"
              >
                Connect wallet
              </button>
            )}
          </ConnectButton.Custom>
        </div>
      </div>
    );
  }

  if (loading) {
    return <p className="text-xs text-gray-500">Loading NFTs…</p>;
  }

  if (error) {
    return (
      <p className="text-xs text-amber-500">
        {error}. Add VITE_ALCHEMY_API_KEY to .env for Ethereum and Apechain.
      </p>
    );
  }

  if (nfts.length === 0) {
    return (
      <p className="text-xs text-gray-500">
        No NFTs found in this wallet on Ethereum or Apechain.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className={isModal ? 'text-sm text-gray-300' : 'text-xs text-gray-400'}>
        Select an NFT from your wallet:
      </p>
      <div
        className={`grid overflow-auto rounded-lg border border-gray-700 bg-gray-800/50 ${
          isModal ? 'grid-cols-4 gap-2 max-h-[60vh] p-2' : 'grid-cols-3 gap-1.5 max-h-48 p-1.5'
        }`}
      >
        {nfts.map((nft) => (
          <button
            key={nft.id}
            type="button"
            onClick={() => nft.image && onChange(nft)}
            disabled={!nft.image}
            className={`aspect-square rounded overflow-hidden border-2 bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
              value === nft.image ? 'border-indigo-500' : 'border-transparent hover:border-gray-600'
            } ${!nft.image ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            {nft.image ? (
              <img
                src={nft.image}
                alt={nft.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                  const place = e.target.nextElementSibling;
                  if (place) place.classList.remove('hidden');
                }}
              />
            ) : null}
            <span
              className={`w-full h-full flex items-center justify-center text-xs text-gray-500 p-1 text-center ${
                nft.image ? 'hidden' : ''
              }`}
            >
              No image
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
