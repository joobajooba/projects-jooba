import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { loadProfile, saveProfile } from './profileStorage';
import NFTSelector from './NFTSelector';

function formatAddress(addr) {
  if (!addr || addr.length < 10) return addr || '';
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default function App() {
  const { address } = useAccount();
  const [profileOpen, setProfileOpen] = useState(false);
  const [nftSelectorOpen, setNftSelectorOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [profilePictureUrl, setProfilePictureUrl] = useState('');

  useEffect(() => {
    if (!address) return;
    const p = loadProfile(address);
    if (p) {
      setUsername(p.username);
      setProfilePictureUrl(p.profilePictureUrl);
    }
  }, [address]);

  useEffect(() => {
    if (!address) return;
    saveProfile(address, { username, profilePictureUrl });
  }, [address, username, profilePictureUrl]);

  const handleNftSelect = (imageUrl) => {
    setProfilePictureUrl(imageUrl || '');
    setNftSelectorOpen(false);
  };

  const handleProfileSave = () => {
    setProfileOpen(false);
  };

  return (
    <div className="app-layout">
      <aside className="app-sidebar">
        <div className="app-sidebar-header">
          <ConnectButton.Custom>
            {({ openConnectModal, openAccountModal, account, mounted }) => {
              const connected = mounted && account;
              return (
                <button
                  type="button"
                  className="app-sidebar-btn"
                  onClick={connected ? openAccountModal : openConnectModal}
                  title={connected ? 'Account' : 'Connect wallet'}
                  aria-label={connected ? 'Account' : 'Connect wallet'}
                >
                  <span className="app-sidebar-btn-icon" aria-hidden>
                    {connected ? '💳' : '🔗'}
                  </span>
                </button>
              );
            }}
          </ConnectButton.Custom>
          <button
            type="button"
            className="app-sidebar-btn"
            title="Profile"
            aria-label="Profile"
            onClick={() => setProfileOpen(true)}
          >
            <span className="app-sidebar-btn-icon" aria-hidden>👤</span>
          </button>
          <button type="button" className="app-sidebar-btn" title="Information" aria-label="Info">
            <span className="app-sidebar-btn-icon" aria-hidden>ℹ️</span>
          </button>
          <button type="button" className="app-sidebar-btn" title="Settings" aria-label="Settings">
            <span className="app-sidebar-btn-icon" aria-hidden>⚙️</span>
          </button>
        </div>

        <div className="app-sidebar-profile">
          <div className="app-sidebar-profile-pic-wrap">
            {profilePictureUrl ? (
              <img
                src={profilePictureUrl}
                alt="Profile"
                className="app-sidebar-profile-pic"
              />
            ) : (
              <div className="app-sidebar-profile-pic app-sidebar-profile-pic-placeholder" aria-hidden>
                <span className="app-sidebar-profile-emoji">☺</span>
              </div>
            )}
          </div>
          <div className="app-sidebar-username">{username || 'No username set'}</div>
          <div className="app-sidebar-address" title={address || ''}>
            {address ? formatAddress(address) : 'Not connected'}
          </div>
        </div>
      </aside>

      <main className="app-main">
        <div className="app-main-inner">
          <h1>J00BA</h1>
          <p>Start from here.</p>
        </div>
      </main>

      {profileOpen && (
        <div
          className="app-modal-overlay"
          onClick={() => setProfileOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="app-profile-modal-title"
        >
          <div className="app-modal" onClick={(e) => e.stopPropagation()}>
            <h2 id="app-profile-modal-title" className="app-modal-title">
              Profile
            </h2>
            <label className="app-modal-label">
              Username
              <input
                type="text"
                className="app-modal-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                autoComplete="username"
              />
            </label>
            <div className="app-modal-actions">
              <button
                type="button"
                className="app-modal-btn app-modal-btn-secondary"
                onClick={() => setNftSelectorOpen(true)}
              >
                Choose NFT from wallet
              </button>
              <button type="button" className="app-modal-btn app-modal-btn-primary" onClick={handleProfileSave}>
                Done
              </button>
            </div>
            <button
              type="button"
              className="app-modal-close"
              onClick={() => setProfileOpen(false)}
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {nftSelectorOpen && address && (
        <NFTSelector
          ownerAddress={address}
          apiKey={import.meta.env.VITE_ALCHEMY_API_KEY_ETH}
          onSelect={handleNftSelect}
          onClose={() => setNftSelectorOpen(false)}
        />
      )}
    </div>
  );
}
