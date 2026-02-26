import { useState, useEffect } from 'react';

const ALCHEMY_NFT_API = 'https://eth-mainnet.g.alchemy.com/nft/v3';

/**
 * Fetches NFTs owned by address via Alchemy NFT API and lets user pick one for profile picture.
 */
export default function NFTSelector({ ownerAddress, apiKey, onSelect, onClose }) {
  const [nfts, setNfts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!ownerAddress || !apiKey) {
      setLoading(false);
      setError('Missing wallet or API key');
      return;
    }
    const url = `${ALCHEMY_NFT_API}/${apiKey}/getNFTsForOwner?owner=${ownerAddress}&pageSize=50&withMetadata=true`;
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        const list = data?.ownedNfts ?? [];
        setNfts(list.filter((n) => n?.image?.cachedUrl || n?.image?.thumbnailUrl || n?.media?.[0]?.gateway));
        setError(data?.error ? data.message || 'Failed to load NFTs' : null);
      })
      .catch((err) => {
        setError(err?.message || 'Failed to load NFTs');
        setNfts([]);
      })
      .finally(() => setLoading(false));
  }, [ownerAddress, apiKey]);

  function getImageUrl(nft) {
    return (
      nft?.image?.cachedUrl ||
      nft?.image?.thumbnailUrl ||
      nft?.image?.pngUrl ||
      nft?.media?.[0]?.gateway ||
      nft?.rawMetadata?.image ||
      ''
    );
  }

  return (
    <div className="app-nft-selector-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Choose NFT">
      <div className="app-nft-selector" onClick={(e) => e.stopPropagation()}>
        <div className="app-nft-selector-header">
          <h2 className="app-nft-selector-title">Choose NFT as profile picture</h2>
          <button type="button" className="app-nft-selector-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        {loading && <p className="app-nft-selector-message">Loading your NFTs…</p>}
        {error && <p className="app-nft-selector-error">{error}</p>}
        {!loading && !error && nfts.length === 0 && (
          <p className="app-nft-selector-message">No NFTs with images found in this wallet.</p>
        )}
        <div className="app-nft-selector-grid">
          {nfts.map((nft) => {
            const imgUrl = getImageUrl(nft);
            return (
              <button
                key={`${nft.contract?.address}-${nft.tokenId}`}
                type="button"
                className="app-nft-selector-item"
                onClick={() => onSelect(imgUrl)}
              >
                {imgUrl ? (
                  <img src={imgUrl} alt={nft.title || 'NFT'} className="app-nft-selector-img" />
                ) : (
                  <div className="app-nft-selector-placeholder">No image</div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
