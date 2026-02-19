import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import './NFTSelector.css';

/**
 * Component to fetch and display NFTs owned by the connected wallet
 * Uses Alchemy NFT API (free tier)
 */
export default function NFTSelector({ onSelect, onClose }) {
  const { address, chainId } = useAccount();
  const [nfts, setNfts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedNft, setSelectedNft] = useState(null);

  useEffect(() => {
    if (!address) {
      setNfts([]);
      return;
    }

    fetchNFTs();
  }, [address, chainId]);

  const fetchNFTsForChain = async (network) => {
    // Get API key - prefer network-specific key, fallback to general key
    let apiKey;
    if (network === 'eth-mainnet') {
      apiKey = import.meta.env.VITE_ALCHEMY_API_KEY_ETH || import.meta.env.VITE_ALCHEMY_API_KEY;
    } else if (network === 'apechain-mainnet') {
      apiKey = import.meta.env.VITE_ALCHEMY_API_KEY_APECHAIN || import.meta.env.VITE_ALCHEMY_API_KEY;
    } else {
      apiKey = import.meta.env.VITE_ALCHEMY_API_KEY;
    }
    
    if (!apiKey) {
      console.log('No Alchemy API key found, trying OpenSea...');
      // Fallback: Try OpenSea API
      await fetchNFTsFromOpenSea();
      return;
    }

    // Alchemy expects owner address (lowercase is safe)
    const ownerAddress = address?.toLowerCase() || address;
    
    // Alchemy NFT API: getNFTsForOwner (v3)
    const url = `https://${network}.g.alchemy.com/nft/v3/${apiKey}/getNFTsForOwner?owner=${encodeURIComponent(ownerAddress)}&withMetadata=true&pageSize=50`;
    
    console.log('Fetching NFTs from Alchemy NFT API:', { network, owner: ownerAddress.substring(0, 14) + '...' });
    
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Alchemy API error:', response.status, errorText);
        
        // Fallback: try legacy getNFTs path (v2 NFT API)
        if (response.status === 403 || response.status === 404) {
          console.log('Trying Alchemy NFT v2 getNFTs endpoint...');
          const v2Url = `https://${network}.g.alchemy.com/nft/v2/${apiKey}/getNFTs?owner=${encodeURIComponent(ownerAddress)}&withMetadata=true&pageSize=50`;
          const v2Response = await fetch(v2Url);
          
          if (!v2Response.ok) {
            throw new Error(`Alchemy API error (${v2Response.status}): ${v2Response.statusText}. Please check your API key.`);
          }
          
          const v2Data = await v2Response.json();
          console.log('Alchemy NFT v2 API response:', {
            totalNFTs: (v2Data.nfts || v2Data.ownedNfts || []).length,
            rawData: v2Data
          });
          
          const allNFTs = v2Data.nfts || v2Data.ownedNfts || [];
          const nftsWithImages = allNFTs.filter(nft => {
            const imageUrl = nft.image?.originalUrl || 
                            nft.image?.cachedUrl || 
                            nft.image?.pngUrl ||
                            nft.image?.thumbnailUrl ||
                            nft.image ||
                            nft.media?.[0]?.gateway ||
                            nft.media?.[0]?.raw;
            return imageUrl && imageUrl !== 'null' && !imageUrl.includes('data:image/svg');
          });
          
          console.log(`Found ${nftsWithImages.length} NFTs with images from v2 API`);
          
          if (nftsWithImages.length === 0 && allNFTs.length > 0) {
            console.warn('No NFTs with images found in v2, showing all NFTs');
            setNfts(allNFTs.map(nft => ({
              ...nft,
              image: nft.image?.originalUrl || 
                     nft.image?.cachedUrl || 
                     nft.image?.pngUrl ||
                     nft.image?.thumbnailUrl ||
                     nft.image ||
                     nft.media?.[0]?.gateway ||
                     nft.media?.[0]?.raw ||
                     null,
              name: nft.name || nft.title || `${nft.contract?.name || 'NFT'} #${nft.tokenId || nft.id?.tokenId || '?'}`
            })));
          } else {
            setNfts(nftsWithImages);
          }
          return;
        }
        
        throw new Error(`Alchemy API error (${response.status}): ${response.statusText}. Please check your API key.`);
      }

      const data = await response.json();
      
      // Alchemy v3 returns { ownedNfts, pageKey?, totalCount }
      const allNFTs = data.ownedNfts ?? data.nfts ?? [];
      const totalCount = data.totalCount ?? allNFTs.length;
      
      console.log('Alchemy API response:', {
        totalCount,
        ownedNftsLength: allNFTs.length,
        hasPageKey: !!data.pageKey,
        firstNft: allNFTs[0] ? { title: allNFTs[0].title, tokenId: allNFTs[0].tokenId } : null
      });
      
      if (allNFTs.length === 0 && network === 'eth-mainnet') {
        console.warn('Alchemy returned 0 NFTs for Ethereum; trying OpenSea as fallback...');
        await fetchNFTsFromOpenSea();
        return;
      }
      
      // Alchemy v3 uses media[].gateway for image URL
      const getImageUrl = (nft) =>
        nft.image?.originalUrl ||
        nft.image?.cachedUrl ||
        nft.image?.pngUrl ||
        nft.image?.thumbnailUrl ||
        nft.image ||
        nft.media?.[0]?.gateway ||
        nft.media?.[0]?.raw ||
        nft.rawMetadata?.image;

      // Filter NFTs that have images (but be less strict)
      const nftsWithImages = allNFTs.filter(nft => {
        const imageUrl = getImageUrl(nft);
        
        const hasImage = imageUrl && 
                        imageUrl !== 'null' && 
                        imageUrl !== 'undefined' &&
                        !imageUrl.includes('data:image/svg');
        
        return hasImage;
      });

      console.log(`Found ${nftsWithImages.length} NFTs with images out of ${allNFTs.length} total`);
      
      // If no NFTs with images but we have NFTs, show them anyway (user can decide)
      if (nftsWithImages.length === 0 && allNFTs.length > 0) {
        console.warn('No NFTs with images found, but showing all NFTs anyway');
        setNfts(allNFTs.map(nft => ({
          ...nft,
          image: nft.image?.originalUrl || 
                 nft.image?.cachedUrl || 
                 nft.image?.pngUrl ||
                 nft.image?.thumbnailUrl ||
                 nft.image ||
                 nft.media?.[0]?.gateway ||
                 nft.media?.[0]?.raw ||
                 null,
          name: nft.name || nft.title || `${nft.contract?.name || 'NFT'} #${nft.tokenId || nft.id?.tokenId || '?'}`
        })));
      } else {
        setNfts(nftsWithImages);
      }
    } catch (err) {
      console.error('Error fetching NFTs:', err);
      if (network === 'eth-mainnet') {
        await fetchNFTsFromOpenSea();
      } else {
        setError(`Failed to fetch NFTs: ${err.message}`);
      }
    }
  };

  const fetchNFTs = async () => {
    if (!address) {
      console.log('No address found');
      return;
    }

    setLoading(true);
    setError(null);

    console.log('Starting NFT fetch:', {
      address,
      chainId,
      addressLowercase: address.toLowerCase()
    });

    try {
      // Map chain IDs to Alchemy network names
      const chainMap = {
        1: 'eth-mainnet',      // Ethereum
        137: 'polygon-mainnet',  // Polygon
        42161: 'arb-mainnet',    // Arbitrum
        10: 'opt-mainnet',       // Optimism
        8453: 'base-mainnet',    // Base
        43114: 'avax-mainnet',   // Avalanche
        33139: 'apechain-mainnet', // ApeChain
      };

      // Check if Alchemy supports this chain
      const network = chainMap[chainId];
      
      console.log('Network detection:', {
        chainId,
        network,
        chainName: chainId === 1 ? 'Ethereum' : chainId === 33139 ? 'ApeChain' : 'Unknown'
      });
      
      // Handle ApeChain separately
      if (chainId === 33139) {
        console.log('ApeChain detected - using ApeChain-specific method');
        await fetchNFTsViaApeChainRPC();
        return;
      }
      
      // If no network mapped, default to Ethereum
      if (!network) {
        console.log(`Chain ${chainId} not mapped, defaulting to Ethereum`);
        await fetchNFTsForChain('eth-mainnet');
        return;
      }
      
      // Fetch NFTs for supported chains (Ethereum, Polygon, etc.)
      await fetchNFTsForChain(network);
    } catch (err) {
      console.error('Error fetching NFTs:', err);
      setError(err.message);
      // Fallback to OpenSea if Alchemy fails
      if (chainId === 1) {
        console.log('Falling back to OpenSea API');
        await fetchNFTsFromOpenSea();
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchNFTsFromOpenSea = async () => {
    const ownerAddress = address?.toLowerCase() || address;
    try {
      console.log('Fetching NFTs from OpenSea (fallback)...', { owner: ownerAddress.substring(0, 14) + '...' });
      
      const url = `https://api.opensea.io/api/v1/assets?owner=${encodeURIComponent(ownerAddress)}&order_direction=desc&offset=0&limit=50`;
      
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) {
        console.log('OpenSea v1 failed:', response.status);
        setError('Could not load NFTs. In Alchemy Dashboard (dashboard.alchemy.com): create or open your app → ensure "NFT API" is enabled for your key, and use that key as VITE_ALCHEMY_API_KEY_ETH.');
        return;
      }

      const data = await response.json();
      const assets = data.assets || [];
      const nftsWithImages = assets.filter(nft => {
        const img = nft.image_url || nft.image_original_url || nft.image_preview_url;
        return img && img !== 'null';
      });

      console.log(`OpenSea: ${nftsWithImages.length} NFTs with images (${assets.length} total)`);
      
      if (nftsWithImages.length > 0) {
        setNfts(nftsWithImages.map(nft => ({
          name: nft.name || `${nft.collection?.name || 'NFT'} #${nft.token_id}`,
          image: nft.image_url || nft.image_original_url || nft.image_preview_url,
          contract: nft.asset_contract?.address,
          tokenId: nft.token_id,
        })));
      } else {
        setError('No NFTs could be loaded. In Alchemy Dashboard enable "NFT API" for your app and use that key as VITE_ALCHEMY_API_KEY_ETH. Ensure this wallet holds NFTs on Ethereum.');
      }
    } catch (err) {
      console.error('Error fetching from OpenSea:', err);
      setError('Could not load NFTs. Enable "NFT API" for your key in Alchemy Dashboard (dashboard.alchemy.com) and set VITE_ALCHEMY_API_KEY_ETH in Vercel.');
    }
  };

  const fetchNFTsViaApeChainRPC = async () => {
    const ownerAddress = address?.toLowerCase() || address;
    const apiKey = import.meta.env.VITE_ALCHEMY_API_KEY_APECHAIN || import.meta.env.VITE_ALCHEMY_API_KEY;

    if (apiKey) {
      try {
        console.log('Fetching NFTs from ApeChain via Alchemy NFT API...');
        const url = `https://apechain-mainnet.g.alchemy.com/nft/v3/${apiKey}/getNFTsForOwner?owner=${encodeURIComponent(ownerAddress)}&withMetadata=true&pageSize=50`;
        const response = await fetch(url);

        if (response.ok) {
          const data = await response.json();
          const allNFTs = data.ownedNfts ?? data.nfts ?? [];
          console.log('Alchemy ApeChain response:', { totalCount: data.totalCount, ownedNftsLength: allNFTs.length });

          const getImageUrl = (nft) =>
            nft.image?.originalUrl || nft.image?.cachedUrl || nft.image?.pngUrl ||
            nft.image?.thumbnailUrl || nft.image ||
            nft.media?.[0]?.gateway || nft.media?.[0]?.raw || nft.rawMetadata?.image;

          const withImages = allNFTs.filter(nft => {
            const img = getImageUrl(nft);
            return img && img !== 'null' && !String(img).includes('data:image/svg');
          });

          if (withImages.length > 0 || allNFTs.length > 0) {
            const list = withImages.length > 0 ? withImages : allNFTs;
            console.log(`Found ${list.length} NFTs from ApeChain (Alchemy)`);
            setNfts(list);
            return;
          }
        } else {
          console.log('Alchemy ApeChain NFT API returned', response.status, '- trying ApeScan...');
        }
      } catch (err) {
        console.error('Alchemy ApeChain error:', err);
      }
    }

    await fetchNFTsViaApeScan();
  };

  const fetchNFTsViaApeScan = async () => {
    const ownerAddress = address?.toLowerCase() || address;
    try {
      console.log('Fetching NFTs from ApeScan (ApeChain)...', { owner: ownerAddress.substring(0, 14) + '...' });
      // ApeScan is Etherscan-powered; try Etherscan-style API with chainid=33139 (ApeChain)
      const url = `https://api.apescan.io/v2/api?chainid=33139&module=account&action=addresstokennftbalance&address=${encodeURIComponent(ownerAddress)}&page=1&offset=100`;
      const response = await fetch(url);

      if (!response.ok) {
        console.log('ApeScan API returned', response.status);
        setError('Could not load ApeChain NFTs. Ensure VITE_ALCHEMY_API_KEY_APECHAIN is set in Vercel and NFT API is enabled for your ApeChain app in Alchemy Dashboard.');
        return;
      }

      const data = await response.json();
      const result = data.result;
      if (data.status !== '1' || !Array.isArray(result) || result.length === 0) {
        console.log('ApeScan result:', { status: data.status, resultLength: Array.isArray(result) ? result.length : 0 });
        setError('No NFTs found on ApeChain for this wallet, or the explorer API did not return data. Try ensuring your Alchemy ApeChain app has NFT API enabled and the key is set as VITE_ALCHEMY_API_KEY_APECHAIN.');
        return;
      }

      const nftsWithMetadata = await Promise.all(
        result.slice(0, 50).map(async (item) => {
          const contract = item.contract_address || item.tokenAddress;
          const tokenId = item.token_id ?? item.tokenId;
          if (!contract || tokenId == null) return null;
          try {
            const metaUrl = `https://api.apescan.io/v2/api?chainid=33139&module=token&action=nftmetadata&contractaddress=${contract}&tokenid=${tokenId}`;
            const metaRes = await fetch(metaUrl);
            if (!metaRes.ok) return { name: `NFT #${tokenId}`, image: null, contract, tokenId };
            const meta = await metaRes.json();
            const image = meta.result?.image || meta.image;
            return {
              name: meta.result?.name || meta.name || `NFT #${tokenId}`,
              image,
              contract,
              tokenId,
            };
          } catch (e) {
            return { name: `NFT #${tokenId}`, image: null, contract, tokenId };
          }
        })
      );

      const withImages = nftsWithMetadata.filter(nft => nft && nft.image);
      console.log(`ApeScan: ${withImages.length} NFTs with images (${nftsWithMetadata.filter(Boolean).length} total)`);
      setNfts(withImages.length > 0 ? withImages : nftsWithMetadata.filter(Boolean));
    } catch (err) {
      console.error('Error fetching from ApeScan:', err);
      setError('Could not load ApeChain NFTs. Set VITE_ALCHEMY_API_KEY_APECHAIN in Vercel and enable NFT API for your ApeChain app at dashboard.alchemy.com.');
    }
  };

  const fetchNFTsViaRPC = async () => {
    // Last resort: Use a public RPC endpoint to get NFT data
    // This is a simplified approach - may not work for all chains
    setError('Unable to fetch NFTs automatically. Please ensure:\n1. Your Alchemy API key is correct\n2. You have NFTs in your connected wallet\n3. You are on a supported network (Ethereum, Polygon, etc.)');
  };

  const handleSelect = () => {
    if (selectedNft) {
      const imageUrl = selectedNft.image?.originalUrl || 
                      selectedNft.image?.cachedUrl || 
                      selectedNft.image?.pngUrl ||
                      selectedNft.image?.thumbnailUrl ||
                      selectedNft.image ||
                      selectedNft.media?.[0]?.gateway ||
                      selectedNft.media?.[0]?.raw ||
                      selectedNft.rawMetadata?.image ||
                      selectedNft.image_url ||
                      selectedNft.image_original_url;
      
      if (imageUrl) {
        // Pass both imageUrl and full NFT object (includes metadata)
        onSelect(imageUrl, selectedNft);
        onClose();
      }
    }
  };

  if (!address) {
    return (
      <div className="nft-selector-modal">
        <div className="nft-selector-content">
          <h2>Select NFT as Profile Picture</h2>
          <p>Please connect your wallet to view your NFTs.</p>
          <button onClick={onClose} className="nft-selector-close">Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="nft-selector-modal" onClick={onClose}>
      <div className="nft-selector-content" onClick={(e) => e.stopPropagation()}>
        <div className="nft-selector-header">
          <h2>Select NFT as Profile Picture</h2>
          <button onClick={onClose} className="nft-selector-close">×</button>
        </div>

        {loading && (
          <div className="nft-selector-loading">
            <p>Loading your NFTs...</p>
          </div>
        )}

        {error && (
          <div className="nft-selector-error">
            <p>{error}</p>
            <button onClick={fetchNFTs}>Retry</button>
          </div>
        )}

        {!loading && !error && nfts.length === 0 && (
          <div className="nft-selector-empty">
            <p>No NFTs found in your wallet.</p>
            <p className="nft-selector-hint">
              Make sure you have NFTs in your connected wallet, or try a different network.
            </p>
          </div>
        )}

        {!loading && !error && nfts.length > 0 && (
          <>
            <div className="nft-selector-grid">
              {nfts.map((nft, index) => {
                const imageUrl = nft.image?.originalUrl || 
                                nft.image?.cachedUrl || 
                                nft.image?.pngUrl ||
                                nft.image?.thumbnailUrl ||
                                nft.image ||
                                nft.media?.[0]?.gateway ||
                                nft.media?.[0]?.raw ||
                                nft.rawMetadata?.image ||
                                nft.image_url ||
                                nft.image_original_url;
                
                const name = nft.name || 
                           nft.title || 
                           `${nft.contract?.name || nft.collection?.name || 'NFT'} #${nft.tokenId || nft.id?.tokenId || nft.identifier || index}`;

                return (
                  <div
                    key={index}
                    className={`nft-selector-item ${selectedNft === nft ? 'selected' : ''}`}
                    onClick={() => setSelectedNft(nft)}
                  >
                    {imageUrl ? (
                      <img 
                        src={imageUrl} 
                        alt={name}
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div className="nft-selector-placeholder" style={{ display: imageUrl ? 'none' : 'flex' }}>
                      No Image
                    </div>
                    <div className="nft-selector-name">{name}</div>
                  </div>
                );
              })}
            </div>
            <div className="nft-selector-actions">
              <button 
                onClick={handleSelect} 
                className="nft-selector-select-btn"
                disabled={!selectedNft}
              >
                Use Selected NFT
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
