/**
 * Blank page at /test – no navbar, no main site code or styles.
 * Uses only this folder's CSS. Route: j00ba.xyz/test
 */
import { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import NFTSelector from '../../components/NFTSelector';
import './TestPage.css';

/**
 * Picks the best available image URL for profile picture quality.
 * Prefers highest-resolution sources from the NFT (originalUrl, cachedUrl, etc.)
 * and upgrades common thumbnail query params to request larger size when possible.
 */
function getBestProfilePictureUrl(imageUrl, selectedNft) {
  const urlFromNft = selectedNft?.image?.originalUrl
    || selectedNft?.image?.cachedUrl
    || selectedNft?.image?.pngUrl
    || selectedNft?.image?.thumbnailUrl
    || selectedNft?.media?.[0]?.raw
    || selectedNft?.media?.[0]?.gateway
    || selectedNft?.rawMetadata?.image
    || selectedNft?.image_original_url
    || selectedNft?.image_url;
  const base = urlFromNft || imageUrl || '';
  if (!base) return '';
  try {
    const u = new URL(base);
    const params = u.searchParams;
    if (params.has('w') && parseInt(params.get('w'), 10) < 800) {
      params.set('w', '1200');
      return u.toString();
    }
    if (params.has('width') && parseInt(params.get('width'), 10) < 800) {
      params.set('width', '1200');
      return u.toString();
    }
    return base;
  } catch {
    return base;
  }
}

export default function TestPage() {
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [profilePictureUrl, setProfilePictureUrl] = useState('');
  const [showNFTSelector, setShowNFTSelector] = useState(false);

  const handleNFTSelect = (imageUrl, selectedNft) => {
    const bestUrl = getBestProfilePictureUrl(imageUrl, selectedNft);
    setProfilePictureUrl(bestUrl || imageUrl || '');
    setShowNFTSelector(false);
  };

  return (
    <div className="test-page" data-page="test">
      <aside className="test-page-sidebar">
        <div className="test-page-sidebar-header">
          <ConnectButton.Custom>
            {({ openConnectModal, openAccountModal, account, mounted }) => {
              const connected = mounted && account;
              return (
                <button
                  type="button"
                  className="test-page-icon-btn"
                  onClick={connected ? openAccountModal : openConnectModal}
                  title={connected ? 'Account' : 'Connect wallet'}
                  aria-label={connected ? 'Account' : 'Connect wallet'}
                >
                  <span className="test-page-icon" aria-hidden>{(connected ? '💳' : '🔗')}</span>
                </button>
              );
            }}
          </ConnectButton.Custom>
          <button
            type="button"
            className="test-page-icon-btn"
            title="Profile"
            aria-label="Profile"
            onClick={() => setProfileModalOpen(true)}
          >
            <span className="test-page-icon" aria-hidden>👤</span>
          </button>
          <button
            type="button"
            className="test-page-icon-btn"
            title="Site information"
            aria-label="Site information"
          >
            <span className="test-page-icon" aria-hidden>ℹ️</span>
          </button>
          <button
            type="button"
            className="test-page-icon-btn"
            title="Settings"
            aria-label="Settings"
          >
            <span className="test-page-icon" aria-hidden>⚙️</span>
          </button>
        </div>

        {profilePictureUrl && (
          <div className="test-page-sidebar-profile">
            <img
              src={profilePictureUrl}
              alt="Profile"
              className="test-page-sidebar-profile-img"
            />
          </div>
        )}
      </aside>

      {profileModalOpen && (
        <div
          className="test-page-modal-overlay"
          onClick={() => setProfileModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="test-page-profile-modal-title"
        >
          <div
            className="test-page-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="test-page-profile-modal-title" className="test-page-modal-title">Profile</h2>
            <label className="test-page-modal-label">
              Username
              <input
                type="text"
                className="test-page-modal-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                autoComplete="username"
              />
            </label>
            <div className="test-page-modal-actions">
              <button
                type="button"
                className="test-page-modal-btn test-page-modal-btn-secondary"
                onClick={() => setShowNFTSelector(true)}
              >
                Choose NFT as profile picture
              </button>
              <button
                type="button"
                className="test-page-modal-btn test-page-modal-btn-primary"
                onClick={() => setProfileModalOpen(false)}
              >
                Done
              </button>
            </div>
            <button
              type="button"
              className="test-page-modal-close"
              onClick={() => setProfileModalOpen(false)}
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {showNFTSelector && (
        <NFTSelector
          onSelect={handleNFTSelect}
          onClose={() => setShowNFTSelector(false)}
        />
      )}
    </div>
  );
}
