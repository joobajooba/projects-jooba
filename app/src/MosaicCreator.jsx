import { useState, useEffect } from 'react';
import { fetchUserProfile, saveUserMosaic } from './userData';

const NETWORKS = {
  ethereum: {
    label: 'Ethereum',
    baseUrl: 'https://eth-mainnet.g.alchemy.com/nft/v3',
  },
  apechain: {
    label: 'Apechain',
    baseUrl: 'https://apechain-mainnet.g.alchemy.com/nft/v3',
  },
};

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

/**
 * Create 2×2, 3×3, or 4×4 NFT mosaics. User picks network (Ethereum / Apechain), size, then selects NFTs in order.
 */
export default function MosaicCreator({ ownerAddress, apiKeyEth, apiKeyApechain, onClose }) {
  const [step, setStep] = useState('setup'); // 'setup' | 'pick' | 'preview'
  const [size, setSize] = useState(2); // 2 = 2x2, 3 = 3x3, 4 = 4x4
  const [network, setNetwork] = useState('ethereum');
  const [nfts, setNfts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState([]); // ordered list of image URLs
  const [savedMosaic, setSavedMosaic] = useState(null); // { size, urls } | null
  const [saving, setSaving] = useState(false);

  const config = NETWORKS[network];
  const apiKey = network === 'ethereum' ? apiKeyEth : apiKeyApechain;
  const required = size * size;

  useEffect(() => {
    if (step !== 'pick' || !ownerAddress || !apiKey) return;
    setLoading(true);
    setError(null);
    const url = `${config.baseUrl}/${apiKey}/getNFTsForOwner?owner=${ownerAddress}&pageSize=100&withMetadata=true`;
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        const list = data?.ownedNfts ?? [];
        setNfts(list.filter((n) => getImageUrl(n)));
        setError(data?.error ? data.message || 'Failed to load NFTs' : null);
      })
      .catch((err) => {
        setError(err?.message || 'Failed to load NFTs');
        setNfts([]);
      })
      .finally(() => setLoading(false));
  }, [step, ownerAddress, network, apiKey, config?.baseUrl]);

  useEffect(() => {
    if (!ownerAddress) return;
    let cancelled = false;
    fetchUserProfile(ownerAddress).then((profile) => {
      if (cancelled) return;
      if (profile?.mosaicSize && Array.isArray(profile?.mosaicUrls) && profile.mosaicUrls.length > 0) {
        setSavedMosaic({ size: profile.mosaicSize, urls: profile.mosaicUrls });
      } else {
        setSavedMosaic(null);
      }
    });
    return () => { cancelled = true; };
  }, [ownerAddress]);

  async function handleSaveMosaic() {
    if (!ownerAddress || selected.length !== required) return;
    setSaving(true);
    await saveUserMosaic(ownerAddress, { mosaicSize: size, mosaicUrls: selected });
    setSavedMosaic({ size, urls: [...selected] });
    setSaving(false);
  }

  function toggleSelect(imgUrl) {
    const idx = selected.indexOf(imgUrl);
    if (idx !== -1) {
      setSelected((prev) => prev.filter((_, i) => i !== idx));
    } else if (selected.length < required) {
      setSelected((prev) => [...prev, imgUrl]);
    }
  }

  function goToPick() {
    setSelected([]);
    setStep('pick');
  }

  function goToPreview() {
    if (selected.length !== required) return;
    setStep('preview');
  }

  return (
    <div
      className="app-nft-selector-overlay app-mosaic-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Create NFT mosaic"
    >
      <div className="app-mosaic app-nft-selector" onClick={(e) => e.stopPropagation()}>
        <div className="app-nft-selector-header">
          <h2 className="app-nft-selector-title">
            {step === 'setup' && 'Create NFT mosaic'}
            {step === 'pick' && `Pick ${required} NFTs (${size}×${size})`}
            {step === 'preview' && 'Your mosaic'}
          </h2>
          <button type="button" className="app-nft-selector-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="app-mosaic-layout">
          <div className="app-mosaic-builder">
        {step === 'setup' && (
          <>
            <div className="app-mosaic-setup-row">
              <span className="app-nft-selector-network-label">Size</span>
              <div className="app-nft-selector-network-btns">
                <button
                  type="button"
                  className={`app-nft-selector-network-btn ${size === 2 ? 'active' : ''}`}
                  onClick={() => setSize(2)}
                >
                  2×2
                </button>
                <button
                  type="button"
                  className={`app-nft-selector-network-btn ${size === 3 ? 'active' : ''}`}
                  onClick={() => setSize(3)}
                >
                  3×3
                </button>
                <button
                  type="button"
                  className={`app-nft-selector-network-btn ${size === 4 ? 'active' : ''}`}
                  onClick={() => setSize(4)}
                >
                  4×4
                </button>
              </div>
            </div>
            <div className="app-mosaic-setup-row">
              <span className="app-nft-selector-network-label">Network</span>
              <div className="app-nft-selector-network-btns">
                <button
                  type="button"
                  className={`app-nft-selector-network-btn ${network === 'ethereum' ? 'active' : ''}`}
                  onClick={() => setNetwork('ethereum')}
                >
                  Ethereum
                </button>
                <button
                  type="button"
                  className={`app-nft-selector-network-btn ${network === 'apechain' ? 'active' : ''}`}
                  onClick={() => setNetwork('apechain')}
                >
                  Apechain
                </button>
              </div>
            </div>
            <div className="app-mosaic-actions">
              <button type="button" className="app-modal-btn app-modal-btn-primary" onClick={goToPick}>
                Next – pick NFTs
              </button>
            </div>
          </>
        )}

        {step === 'pick' && (
          <>
            <p className="app-nft-selector-message">
              {config?.label ?? network} · Select {required} images in order (top-left to bottom-right). Click to add, click again to remove.
            </p>
            {!apiKey && <p className="app-nft-selector-error">Missing API key for {config?.label ?? network}</p>}
            {loading && <p className="app-nft-selector-message">Loading your NFTs…</p>}
            {error && <p className="app-nft-selector-error">{error}</p>}
            {(error || !apiKey) && (
              <div className="app-mosaic-actions">
                <button type="button" className="app-modal-btn app-modal-btn-secondary" onClick={() => setStep('setup')}>
                  Back
                </button>
              </div>
            )}
            {!loading && !error && apiKey && (
              <>
                <p className="app-mosaic-count">
                  Selected: {selected.length} / {required}
                </p>
                <div className="app-nft-selector-grid">
                  {nfts.map((nft) => {
                    const imgUrl = getImageUrl(nft);
                    const isSelected = selected.includes(imgUrl);
                    const order = isSelected ? selected.indexOf(imgUrl) + 1 : null;
                    return (
                      <button
                        key={`${nft.contract?.address}-${nft.tokenId}`}
                        type="button"
                        className={`app-nft-selector-item app-mosaic-item ${isSelected ? 'selected' : ''}`}
                        onClick={() => toggleSelect(imgUrl)}
                      >
                        {imgUrl ? (
                          <>
                            <img src={imgUrl} alt={nft.title || 'NFT'} className="app-nft-selector-img" />
                            {order != null && <span className="app-mosaic-item-order">{order}</span>}
                          </>
                        ) : (
                          <div className="app-nft-selector-placeholder">No image</div>
                        )}
                      </button>
                    );
                  })}
                </div>
                <div className="app-mosaic-actions">
                  <button
                    type="button"
                    className="app-modal-btn app-modal-btn-primary"
                    onClick={goToPreview}
                    disabled={selected.length !== required}
                  >
                    Create mosaic
                  </button>
                  <button type="button" className="app-modal-btn app-modal-btn-secondary" onClick={() => setStep('setup')}>
                    Back
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {step === 'preview' && (
          <>
            <div
              className={`app-mosaic-preview app-mosaic-preview-${size}`}
              style={{ '--cols': size }}
            >
              {selected.map((url, i) => (
                <div key={i} className="app-mosaic-preview-cell">
                  <img src={url} alt="" />
                </div>
              ))}
            </div>
            <div className="app-mosaic-actions">
              <button
                type="button"
                className="app-modal-btn app-modal-btn-primary"
                onClick={handleSaveMosaic}
                disabled={saving}
              >
                {saving ? 'Saving…' : 'Save mosaic'}
              </button>
              <button type="button" className="app-modal-btn app-modal-btn-secondary" onClick={onClose}>
                Close
              </button>
              <button type="button" className="app-modal-btn app-modal-btn-secondary" onClick={() => setStep('pick')}>
                Change selection
              </button>
            </div>
          </>
        )}
          </div>

          <div className="app-mosaic-saved">
            <h3 className="app-mosaic-saved-title">Saved mosaic</h3>
            {savedMosaic?.urls?.length > 0 && savedMosaic.size ? (
              <div className={`app-mosaic-preview app-mosaic-preview-${savedMosaic.size} app-mosaic-saved-preview`}>
                {savedMosaic.urls.map((url, i) => (
                  <div key={i} className="app-mosaic-preview-cell">
                    <img src={url} alt="" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="app-mosaic-saved-empty">No saved mosaic yet. Create one and click Save mosaic.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
