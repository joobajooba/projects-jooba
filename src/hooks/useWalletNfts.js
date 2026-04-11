import { useQuery } from '@tanstack/react-query';
import { usePublicClient } from 'wagmi';
import { isAddress } from 'viem';

const enumerableAbi = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'tokenOfOwnerByIndex',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'index', type: 'uint256' },
    ],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'tokenURI',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ type: 'string' }],
  },
];

function parseProfileNftContracts() {
  const raw = import.meta.env.VITE_PROFILE_NFT_CONTRACTS || '';
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((a) => isAddress(a));
}

function ipfsToHttp(uri) {
  if (!uri || typeof uri !== 'string') return '';
  const u = uri.trim();
  if (u.startsWith('ipfs://')) {
    const path = u.slice('ipfs://'.length).replace(/^ipfs\//, '');
    return `https://ipfs.io/ipfs/${path}`;
  }
  return u;
}

async function fetchJsonUri(uri) {
  const url = ipfsToHttp(uri);
  if (!url || !url.startsWith('http')) return null;
  const res = await fetch(url);
  if (!res.ok) return null;
  return res.json();
}

function pickImageFromMetadata(meta) {
  if (!meta || typeof meta !== 'object') return '';
  const img = meta.image || meta.image_url || meta.imageUrl;
  return ipfsToHttp(typeof img === 'string' ? img : '');
}

function alchemyNetworkForChain(chainId) {
  if (chainId === 1) return 'eth-mainnet';
  if (chainId === 33139) return 'apechain-mainnet';
  return null;
}

function normalizeAlchemyResponse(data) {
  const list = data?.ownedNfts ?? [];
  return list
    .map((nft) => {
      const contract = nft?.contract?.address;
      const tokenId = nft?.tokenId != null ? String(nft.tokenId) : '';
      const imageUrl =
        nft?.image?.cachedUrl ||
        nft?.image?.pngUrl ||
        nft?.image?.originalUrl ||
        nft?.image?.thumbnailUrl ||
        '';
      const name = nft?.name || nft?.title || (tokenId ? `#${tokenId}` : 'NFT');
      if (!contract || !tokenId) return null;
      return {
        contract,
        tokenId,
        name,
        imageUrl,
      };
    })
    .filter(Boolean);
}

async function fetchAlchemyNfts(owner, chainId) {
  const key =
    import.meta.env.VITE_ALCHEMY_API_KEY_APECHAIN ||
    import.meta.env.VITE_ALCHEMY_API_KEY_ETH ||
    import.meta.env.VITE_ALCHEMY_API_KEY;
  if (!key) return null;
  const network = alchemyNetworkForChain(chainId);
  if (!network) return null;

  const url = new URL(`https://${network}.g.alchemy.com/nft/v3/${key}/getNFTsForOwner`);
  url.searchParams.set('owner', owner);
  url.searchParams.set('pageSize', '100');

  const res = await fetch(url.toString());
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `NFT API error (${res.status})`);
  }
  const data = await res.json();
  return normalizeAlchemyResponse(data);
}

async function fetchEnumerableNfts(client, owner, contractAddresses) {
  const out = [];
  for (const contractAddress of contractAddresses) {
    let balance;
    try {
      balance = await client.readContract({
        address: contractAddress,
        abi: enumerableAbi,
        functionName: 'balanceOf',
        args: [owner],
      });
    } catch {
      continue;
    }
    const n = Number(balance);
    if (!Number.isFinite(n) || n <= 0) continue;

    for (let i = 0; i < n; i++) {
      let tokenId;
      try {
        tokenId = await client.readContract({
          address: contractAddress,
          abi: enumerableAbi,
          functionName: 'tokenOfOwnerByIndex',
          args: [owner, BigInt(i)],
        });
      } catch {
        break;
      }
      let tokenURI = '';
      try {
        tokenURI = await client.readContract({
          address: contractAddress,
          abi: enumerableAbi,
          functionName: 'tokenURI',
          args: [tokenId],
        });
      } catch {
        tokenURI = '';
      }
      let imageUrl = '';
      let name = `#${tokenId.toString()}`;
      if (tokenURI) {
        if (tokenURI.startsWith('data:application/json')) {
          try {
            const base64 = tokenURI.split(',')[1];
            const json = JSON.parse(atob(base64));
            imageUrl = pickImageFromMetadata(json);
            if (json.name) name = json.name;
          } catch {
            /* ignore */
          }
        } else {
          const meta = await fetchJsonUri(tokenURI);
          if (meta) {
            imageUrl = pickImageFromMetadata(meta);
            if (meta.name) name = meta.name;
          }
        }
      }
      out.push({
        contract: contractAddress,
        tokenId: tokenId.toString(),
        name,
        imageUrl,
      });
    }
  }
  return out;
}

/**
 * Loads NFTs owned by `address` on the active chain (Alchemy if configured, else ERC721Enumerable on VITE_PROFILE_NFT_CONTRACTS).
 */
export function useWalletNfts(address, chainId, enabled) {
  const publicClient = usePublicClient();

  return useQuery({
    queryKey: ['walletNfts', address, chainId],
    enabled: Boolean(enabled && address && chainId && publicClient),
    queryFn: async () => {
      const alchemy = await fetchAlchemyNfts(address, chainId);
      if (alchemy !== null) return alchemy;

      const contracts = parseProfileNftContracts();
      if (!contracts.length) return [];

      return fetchEnumerableNfts(publicClient, address, contracts);
    },
    staleTime: 60_000,
  });
}
