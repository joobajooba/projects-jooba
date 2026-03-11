import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';

const ALCHEMY_ETH_BASE = 'https://eth-mainnet.g.alchemy.com/nft/v3';
const ALCHEMY_APECHAIN_BASE = 'https://apechain-mainnet.g.alchemy.com/nft/v3';

function getAlchemyKey(network) {
  const key = import.meta.env.VITE_ALCHEMY_API_KEY;
  const ethKey = import.meta.env.VITE_ALCHEMY_API_KEY_ETH || key;
  const apeKey = import.meta.env.VITE_ALCHEMY_API_KEY_APECHAIN || key;
  return network === 'apechain' ? apeKey : ethKey;
}

async function fetchNFTsForOwner(owner, network) {
  const base = network === 'apechain' ? ALCHEMY_APECHAIN_BASE : ALCHEMY_ETH_BASE;
  const key = getAlchemyKey(network);
  if (!key || key === 'your_alchemy_api_key_here') return [];
  const url = `${base}/${key}/getNFTsForOwner?owner=${owner}&pageSize=30`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    const list = data?.ownedNfts ?? [];
    return list.map((nft) => {
      const img =
        nft?.image?.cachedUrl ??
        nft?.image?.pngUrl ??
        nft?.image?.originalUrl ??
        nft?.raw?.metadata?.image ??
        (typeof nft?.raw?.metadata?.image === 'string' ? nft.raw.metadata.image : null);
      return {
        id: `${nft.contract?.address ?? ''}-${nft.tokenId ?? ''}-${network}`,
        image: img,
        name: nft?.title ?? nft?.raw?.metadata?.name ?? `#${nft?.tokenId ?? ''}`,
        network,
      };
    }).filter((n) => n.image);
  } catch (e) {
    console.warn(`Alchemy NFT fetch (${network}) failed:`, e);
    return [];
  }
}

export default function AvatarNFTSelector({ value, onChange }) {
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
      fetchNFTsForOwner(address, 'ethereum'),
      fetchNFTsForOwner(address, 'apechain'),
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
      <p className="text-xs text-gray-400">Select an NFT from your wallet:</p>
      <div className="grid grid-cols-3 gap-1.5 max-h-48 overflow-auto rounded border border-gray-700 p-1.5 bg-gray-800/50">
        {nfts.map((nft) => (
          <button
            key={nft.id}
            type="button"
            onClick={() => onChange(nft.image)}
            className={`aspect-square rounded overflow-hidden border-2 bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
              value === nft.image ? 'border-indigo-500' : 'border-transparent hover:border-gray-600'
            }`}
          >
            <img
              src={nft.image}
              alt={nft.name}
              className="w-full h-full object-cover"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
