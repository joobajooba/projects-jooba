import { useState, useEffect } from 'react';
import { Routes, Route, Link, NavLink, useSearchParams } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { loadProfile, saveProfile } from './profileStorage';
import { ensureUserRow, fetchUserProfile, updateUserProfile } from './userData';
import NFTSelector from './NFTSelector';
import ProfilePage from './ProfilePage';

function XAuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading'); // 'loading' | 'ok' | 'error'
  const [message, setMessage] = useState('');
  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const storedState = sessionStorage.getItem('x_oauth_state');
    const storedVerifier = sessionStorage.getItem('x_oauth_code_verifier');
    sessionStorage.removeItem('x_oauth_state');
    if (!code || !state || state !== storedState || !storedVerifier) {
      setStatus('error');
      setMessage(state !== storedState ? 'Invalid state. Try connecting again.' : 'Missing code from X.');
      return;
    }
    setStatus('ok');
    setMessage('X returned successfully. To finish linking: exchange the code for a token, call X API users/me, then save the X user id to your DB. See docs/X_ACCOUNT_LINKING.md.');
  }, [searchParams]);
  return (
    <div className="app-main-inner">
      <h1>Connect to X</h1>
      {status === 'loading' && <p>Linking your X account…</p>}
      {status === 'ok' && <p className="app-auth-callback-ok">{message}</p>}
      {status === 'error' && <p className="app-auth-callback-error">{message}</p>}
      <Link to="/profile">Back to profile</Link>
    </div>
  );
}

function PlaceholderPage({ title }) {
  return (
    <div className="app-main-inner">
      <h1>{title}</h1>
      <p>Coming soon.</p>
    </div>
  );
}

import { getAlchemyApiKey } from './lib/alchemy';

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
  const [profileBio, setProfileBio] = useState('');
  const [profilePictureBorder, setProfilePictureBorder] = useState('');

  useEffect(() => {
    if (!address) return;
    let cancelled = false;
    (async () => {
      await ensureUserRow(address);
      if (cancelled) return;
      const fromDb = await fetchUserProfile(address);
      if (cancelled) return;
      const fromLocal = loadProfile(address);
      const username = fromDb?.username ?? fromLocal?.username ?? '';
      const profilePictureUrl = fromDb?.profilePictureUrl ?? fromLocal?.profilePictureUrl ?? '';
      const profileBio = fromDb?.profileBio ?? fromLocal?.profileBio ?? '';
      const profilePictureBorder = fromDb?.profilePictureBorder ?? fromLocal?.profilePictureBorder ?? '';
      setUsername(username);
      setProfilePictureUrl(profilePictureUrl);
      setProfileBio(profileBio);
      setProfilePictureBorder(profilePictureBorder);
      saveProfile(address, { username, profilePictureUrl, profileBio, profilePictureBorder });
    })();
    return () => { cancelled = true; };
  }, [address]);

  useEffect(() => {
    if (!address) return;
    saveProfile(address, { username, profilePictureUrl });
  }, [address, username, profilePictureUrl]);

  const handleNftSelect = (imageUrl) => {
    setProfilePictureUrl(imageUrl || '');
    setNftSelectorOpen(false);
  };

  const handleProfileSave = async () => {
    if (address) {
      await updateUserProfile(address, { username, profilePictureUrl, profileBio, profilePictureBorder });
      saveProfile(address, { username, profilePictureUrl, profileBio, profilePictureBorder });
      window.dispatchEvent(new CustomEvent('profile-updated', { detail: { walletAddress: address.toLowerCase() } }));
    }
    setProfileOpen(false);
  };

  const handleConnectX = async () => {
    const clientId = import.meta.env.VITE_X_CLIENT_ID;
    if (!clientId) {
      window.open('https://developer.x.com/en/docs/authentication/oauth-2-0/authorization-code', '_blank', 'noopener');
      return;
    }
    const codeVerifier = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    const encoder = new TextEncoder();
    const digest = await crypto.subtle.digest('SHA-256', encoder.encode(codeVerifier));
    const codeChallenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    const state = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    const redirectUri = `${window.location.origin}/auth/x/callback`;
    sessionStorage.setItem('x_oauth_code_verifier', codeVerifier);
    sessionStorage.setItem('x_oauth_state', state);
    if (address) sessionStorage.setItem('x_oauth_wallet', address.toLowerCase());
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: 'users.read tweet.read',
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });
    window.location.href = `https://twitter.com/i/oauth2/authorize?${params.toString()}`;
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
            {address ? (
              <Link
                to="/profile"
                className="app-sidebar-profile-pic-link"
                title="View your profile"
                aria-label="View your profile"
              >
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
              </Link>
            ) : (
              <>
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
              </>
            )}
          </div>
          <div className="app-sidebar-profile-user">
            <div className="app-sidebar-username">{username || 'No username set'}</div>
            <div className="app-sidebar-address" title={address || ''}>
              {address ? formatAddress(address) : 'Not connected'}
            </div>
          </div>
        </div>
        <nav className="app-sidebar-nav" aria-label="Main">
          <NavLink to="/" className={({ isActive }) => `app-sidebar-nav-link${isActive ? ' active' : ''}`} end>
            <span className="app-sidebar-nav-icon" aria-hidden>🏠</span> Home
          </NavLink>
          <NavLink to="/games" className={({ isActive }) => `app-sidebar-nav-link${isActive ? ' active' : ''}`}>
            <span className="app-sidebar-nav-icon" aria-hidden>🎮</span> Games
          </NavLink>
          <NavLink to="/community" className={({ isActive }) => `app-sidebar-nav-link${isActive ? ' active' : ''}`}>
            <span className="app-sidebar-nav-icon" aria-hidden>👥</span> Community
          </NavLink>
          <NavLink to="/projects" className={({ isActive }) => `app-sidebar-nav-link${isActive ? ' active' : ''}`}>
            <span className="app-sidebar-nav-icon" aria-hidden>📁</span> Projects
          </NavLink>
          <NavLink to="/mint" className={({ isActive }) => `app-sidebar-nav-link${isActive ? ' active' : ''}`}>
            <span className="app-sidebar-nav-icon" aria-hidden>🪙</span> Mint
          </NavLink>
        </nav>
        <div className="app-sidebar-nav-sep" aria-hidden />
      </aside>

      <main className="app-main">
        <Routes>
          <Route path="/" element={
            <div className="app-main-inner">
              <h1>J00BA</h1>
              <p>Start from here.</p>
            </div>
          } />
          <Route path="/games" element={<PlaceholderPage title="Games" />} />
          <Route path="/community" element={<PlaceholderPage title="Community" />} />
          <Route path="/projects" element={<PlaceholderPage title="Projects" />} />
          <Route path="/mint" element={<PlaceholderPage title="Mint" />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/profile/:walletAddress" element={<ProfilePage />} />
          <Route path="/auth/x/callback" element={<XAuthCallbackPage />} />
        </Routes>
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
              <div className="app-profile-connect-x-wrap">
                <button
                  type="button"
                  className="app-profile-connect-x-btn"
                  onClick={handleConnectX}
                  title="Link your X (Twitter) account so your profile shows it as verified"
                >
                  Connect to X
                </button>
              </div>
            </label>
            <label className="app-modal-label">
              Bio
              <textarea
                className="app-modal-input app-profile-bio-input"
                value={profileBio}
                onChange={(e) => setProfileBio(e.target.value)}
                placeholder="Tell others about yourself…"
                rows={3}
              />
            </label>
            <p className="app-modal-section-title">Set profile picture</p>
            <div className="app-modal-actions">
              <button
                type="button"
                className="app-modal-btn app-modal-btn-secondary"
                onClick={() => setNftSelectorOpen(true)}
              >
                Choose NFT from wallet
              </button>
            </div>
            <p className="app-modal-section-title">Profile picture border</p>
            <div className="app-modal-border-options">
              <button
                type="button"
                className={`app-modal-border-btn ${profilePictureBorder === 'red' ? 'active' : ''}`}
                onClick={() => setProfilePictureBorder(profilePictureBorder === 'red' ? '' : 'red')}
                title="Red gradient"
              >
                <span className="app-modal-border-swatch app-modal-border-red" aria-hidden />
                Red
              </button>
              <button
                type="button"
                className={`app-modal-border-btn ${profilePictureBorder === 'blue' ? 'active' : ''}`}
                onClick={() => setProfilePictureBorder(profilePictureBorder === 'blue' ? '' : 'blue')}
                title="Blue gradient"
              >
                <span className="app-modal-border-swatch app-modal-border-blue" aria-hidden />
                Blue
              </button>
              <button
                type="button"
                className={`app-modal-border-btn ${profilePictureBorder === 'green' ? 'active' : ''}`}
                onClick={() => setProfilePictureBorder(profilePictureBorder === 'green' ? '' : 'green')}
                title="Green gradient"
              >
                <span className="app-modal-border-swatch app-modal-border-green" aria-hidden />
                Green
              </button>
            </div>
            <div className="app-modal-actions" style={{ marginTop: 16 }}>
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
          apiKeyEth={getAlchemyApiKey(import.meta.env.VITE_ALCHEMY_API_KEY_ETH || import.meta.env.VITE_ALCHEMY_API_KEY)}
          apiKeyApechain={getAlchemyApiKey(import.meta.env.VITE_ALCHEMY_API_KEY_APECHAIN || import.meta.env.VITE_ALCHEMY_API_KEY)}
          onSelect={handleNftSelect}
          onClose={() => setNftSelectorOpen(false)}
        />
      )}
    </div>
  );
}
