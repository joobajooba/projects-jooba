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

  const fetchNFTs = async () => {
    if (!address) return;

    setLoading(true);
    setError(null);

    try {
      // Map chain IDs to Alchemy network names
      const chainMap = {
        1: 'eth-mainnet',      // Ethereum
        137: 'polygon-mainnet',  // Polygon
        42161: 'arb-mainnet',    // Arbitrum
        10: 'opt-mainnet',       // Optimism
        8453: 'base-mainnet',    // Base
        43114: 'avax-mainnet',   // Avalanche
        33139: 'apechain-mainnet', // ApeChain (may need custom handling)
      };

      // Check if Alchemy supports this chain
      const network = chainMap[chainId];
      
      // If ApeChain or unsupported chain, try direct RPC method
      if (!network || chainId === 33139) {
        console.log('ApeChain detected - using RPC method for NFT fetching');
        await fetchNFTsViaApeChainRPC();
        return;
      }
      
      // Use Alchemy NFT API
      // Note: You'll need to add VITE_ALCHEMY_API_KEY to your .env
      const apiKey = import.meta.env.VITE_ALCHEMY_API_KEY;
      
      if (!apiKey) {
        console.log('No Alchemy API key found, trying OpenSea...');
        // Fallback: Try OpenSea API
        await fetchNFTsFromOpenSea();
        return;
      }

      // Try Alchemy v2 API first (more reliable)
      const url = `https://${network}.g.alchemy.com/v2/${apiKey}/getNFTs?owner=${address}&withMetadata=true&pageSize=50`;
      
      console.log('Fetching NFTs from Alchemy:', { network, address: address.substring(0, 10) + '...' });
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Alchemy API error:', response.status, errorText);
        
        // If 403, try v3 endpoint
        if (response.status === 403) {
          console.log('Trying Alchemy v3 endpoint...');
          const v3Url = `https://${network}.g.alchemy.com/nft/v3/${apiKey}/getNFTs?owner=${address}&withMetadata=true&pageSize=50`;
          const v3Response = await fetch(v3Url);
          
          if (!v3Response.ok) {
            throw new Error(`Alchemy API error (${v3Response.status}): ${v3Response.statusText}. Please check your API key.`);
          }
          
          const v3Data = await v3Response.json();
          const nftsWithImages = (v3Data.nfts || v3Data.ownedNfts || []).filter(nft => {
            const imageUrl = nft.image?.originalUrl || 
                            nft.image?.cachedUrl || 
                            nft.image?.pngUrl ||
                            nft.image?.thumbnailUrl ||
                            nft.image;
            return imageUrl && imageUrl !== 'null' && !imageUrl.includes('data:image/svg');
          });
          setNfts(nftsWithImages);
          return;
        }
        
        throw new Error(`Alchemy API error (${response.status}): ${response.statusText}. Please check your API key.`);
      }

      const data = await response.json();
      
      // Filter NFTs that have images
      const nftsWithImages = (data.nfts || data.ownedNfts || []).filter(nft => {
        const imageUrl = nft.image?.originalUrl || 
                        nft.image?.cachedUrl || 
                        nft.image?.pngUrl ||
                        nft.image?.thumbnailUrl ||
                        nft.image;
        return imageUrl && imageUrl !== 'null' && !imageUrl.includes('data:image/svg');
      });

      console.log(`Found ${nftsWithImages.length} NFTs with images`);
      setNfts(nftsWithImages);
    } catch (err) {
      console.error('Error fetching NFTs:', err);
      setError(err.message);
      // Fallback to OpenSea if Alchemy fails
      await fetchNFTsFromOpenSea();
    } finally {
      setLoading(false);
    }
  };

  const fetchNFTsFromOpenSea = async () => {
    try {
      console.log('Fetching NFTs from OpenSea...');
      
      // OpenSea API v2 requires API key now, try v1 as fallback
      const url = `https://api.opensea.io/api/v1/assets?owner=${address}&order_direction=desc&offset=0&limit=50`;
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
        }
      });

      if (!response.ok) {
        // If OpenSea fails, try a simple RPC call approach
        console.log('OpenSea API failed, trying alternative method...');
        await fetchNFTsViaRPC();
        return;
      }

      const data = await response.json();
      
      const nftsWithImages = (data.assets || []).filter(nft => {
        const imageUrl = nft.image_url || nft.image_original_url || nft.image_preview_url;
        return imageUrl && imageUrl !== 'null';
      });

      console.log(`Found ${nftsWithImages.length} NFTs from OpenSea`);
      
      setNfts(nftsWithImages.map(nft => ({
        name: nft.name || `${nft.collection?.name || 'NFT'} #${nft.token_id}`,
        image: nft.image_url || nft.image_original_url || nft.image_preview_url,
        contract: nft.asset_contract?.address,
        tokenId: nft.token_id,
      })));
    } catch (err) {
      console.error('Error fetching from OpenSea:', err);
      // Try RPC method as last resort
      await fetchNFTsViaRPC();
    }
  };

  const fetchNFTsViaApeChainRPC = async () => {
    try {
      console.log('Fetching NFTs from ApeChain via RPC...');
      const apiKey = import.meta.env.VITE_ALCHEMY_API_KEY;
      
      if (!apiKey) {
        setError('Alchemy API key required for ApeChain. Please add VITE_ALCHEMY_API_KEY to your environment variables.');
        return;
      }

      // Try Alchemy with apechain-mainnet (if supported)
      // If not, we'll need to use ApeChain's RPC or another indexer
      const url = `https://apechain-mainnet.g.alchemy.com/v2/${apiKey}/getNFTs?owner=${address}&withMetadata=true&pageSize=50`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        // If Alchemy doesn't support ApeChain, try using ApeScan API or direct RPC
        console.log('Alchemy ApeChain endpoint failed, trying alternative...');
        await fetchNFTsViaApeScan();
        return;
      }

      const data = await response.json();
      const nftsWithImages = (data.nfts || data.ownedNfts || []).filter(nft => {
        const imageUrl = nft.image?.originalUrl || 
                        nft.image?.cachedUrl || 
                        nft.image?.pngUrl ||
                        nft.image?.thumbnailUrl ||
                        nft.image;
        return imageUrl && imageUrl !== 'null' && !imageUrl.includes('data:image/svg');
      });

      console.log(`Found ${nftsWithImages.length} NFTs from ApeChain`);
      setNfts(nftsWithImages);
    } catch (err) {
      console.error('Error fetching ApeChain NFTs:', err);
      await fetchNFTsViaApeScan();
    }
  };

  const fetchNFTsViaApeScan = async () => {
    try {
      // Try ApeScan API (ApeChain's block explorer)
      const url = `https://api.apescan.io/api/v2/addresses/${address}/token-balances?type=ERC721&page=1&limit=50`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`ApeScan API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      // ApeScan returns token balances, we need to fetch metadata for each
      const tokens = data.data?.tokens || [];
      const nftsWithMetadata = await Promise.all(
        tokens.map(async (token) => {
          try {
            // Fetch token metadata
            const metadataUrl = `https://api.apescan.io/api/v2/tokens/${token.contract_address}/${token.token_id}`;
            const metaResponse = await fetch(metadataUrl);
            if (metaResponse.ok) {
              const metaData = await metaResponse.json();
              return {
                name: metaData.data?.name || `${token.contract_name || 'NFT'} #${token.token_id}`,
                image: metaData.data?.image || metaData.data?.image_url,
                contract: token.contract_address,
                tokenId: token.token_id,
              };
            }
          } catch (e) {
            console.error('Error fetching token metadata:', e);
          }
          return null;
        })
      );

      const nftsWithImages = nftsWithMetadata.filter(nft => nft && nft.image);
      console.log(`Found ${nftsWithImages.length} NFTs from ApeScan`);
      setNfts(nftsWithImages);
    } catch (err) {
      console.error('Error fetching from ApeScan:', err);
      setError('Unable to fetch NFTs from ApeChain. Please ensure:\n1. Your Alchemy API key is configured for ApeChain\n2. You have NFTs in your ApeChain wallet\n3. Try switching to Ethereum mainnet if available');
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
                      selectedNft.image_url ||
                      selectedNft.image_original_url;
      
      if (imageUrl) {
        onSelect(imageUrl);
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
                                nft.image_url ||
                                nft.image_original_url;
                
                const name = nft.name || 
                           nft.title || 
                           `${nft.collection?.name || 'NFT'} #${nft.tokenId || nft.identifier || index}`;

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
