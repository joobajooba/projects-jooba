import { useState, useEffect, useRef } from 'react';
import { Routes, Route, Link, NavLink, useSearchParams } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { loadProfile, saveProfile } from './profileStorage';
import { ensureUserRow, fetchUserProfile, updateUserProfile, isUsernameTaken } from './userData';
import NFTSelector from './NFTSelector';
import ProfileBuilderPage from './ProfileBuilderPage';

function XAuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading'); // 'loading' | 'ok' | 'error'
  const [message, setMessage] = useState('');
  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const storedState = sessionStorage.getItem('x_oauth_state');
    const storedVerifier = sessionStorage.getItem('x_oauth_code_verifier');
    const wallet = sessionStorage.getItem('x_oauth_wallet');
    sessionStorage.removeItem('x_oauth_state');
    if (!code || !state || state !== storedState || !storedVerifier || !wallet) {
      setStatus('error');
      setMessage(!code || !storedVerifier ? 'Missing code from X. Try connecting again.' : state !== storedState ? 'Invalid state. Try connecting again.' : 'Wallet not found. Connect your wallet and try again.');
      return;
    }
    const redirectUri = window.location.origin + '/auth/x/callback';
    (async () => {
      try {
        const res = await fetch('/api/auth/x-exchange', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code,
            code_verifier: storedVerifier,
            wallet,
            redirect_uri: redirectUri,
          }),
        });
        const data = await res.json().catch(() => ({}));
        sessionStorage.removeItem('x_oauth_code_verifier');
        sessionStorage.removeItem('x_oauth_wallet');
        if (!res.ok) {
          setStatus('error');
          setMessage(data?.error || 'Something went wrong. Try again.');
          return;
        }
        setStatus('ok');
        setMessage(data?.username ? `X account @${data.username} linked.` : 'X account linked.');
      } catch (e) {
        setStatus('error');
        setMessage('Something went wrong. Try again.');
      }
    })();
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
  const [profileSaveError, setProfileSaveError] = useState('');
  const originalUsernameRef = useRef('');
  const usernameChangedAtRef = useRef(null);

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
      originalUsernameRef.current = username || '';
      usernameChangedAtRef.current = fromDb?.usernameChangedAt ?? null;
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

  const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

  const handleProfileSave = async () => {
    setProfileSaveError('');
    if (!address) {
      setProfileOpen(false);
      return;
    }
    const trimmedUsername = (username || '').trim();
    const originalUsername = originalUsernameRef.current || '';
    const isUsernameChanging = trimmedUsername !== originalUsername;

    if (isUsernameChanging && trimmedUsername) {
      const taken = await isUsernameTaken(trimmedUsername, address);
      if (taken) {
        setProfileSaveError('That username is already taken. Please choose another.');
        return;
      }
      const lastChanged = usernameChangedAtRef.current;
      if (lastChanged) {
        const elapsed = Date.now() - new Date(lastChanged).getTime();
        if (elapsed < THREE_DAYS_MS) {
          const nextDate = new Date(new Date(lastChanged).getTime() + THREE_DAYS_MS);
          setProfileSaveError(`You can change your username again after ${nextDate.toLocaleDateString()}.`);
          return;
        }
      }
    }

    try {
      await updateUserProfile(address, {
        username: trimmedUsername || null,
        profilePictureUrl,
        profileBio,
        profilePictureBorder,
        setUsernameChangedAt: isUsernameChanging && !!trimmedUsername,
      });
      if (isUsernameChanging && trimmedUsername) {
        originalUsernameRef.current = trimmedUsername;
        usernameChangedAtRef.current = new Date().toISOString();
      }
      saveProfile(address, { username: trimmedUsername, profilePictureUrl, profileBio, profilePictureBorder });
      window.dispatchEvent(new CustomEvent('profile-updated', { detail: { walletAddress: address.toLowerCase() } }));
      setProfileOpen(false);
    } catch (e) {
      if (e?.message === 'username_taken') {
        setProfileSaveError('That username is already taken. Please choose another.');
      } else {
        setProfileSaveError(e?.message || 'Failed to save profile.');
      }
    }
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
    const redirectUri = window.location.origin + '/auth/x/callback';
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
          <Route path="/profile" element={<ProfileBuilderPage staticView />} />
          <Route path="/profile/:walletAddress" element={<ProfileBuilderPage staticView />} />
          <Route path="/profile/builder" element={<ProfileBuilderPage />} />
          <Route path="/auth/x/callback" element={<XAuthCallbackPage />} />
        </Routes>
      </main>

      {profileOpen && (
        <div
          className="app-modal-overlay"
          onClick={() => { setProfileOpen(false); setProfileSaveError(''); }}
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
                onChange={(e) => { setUsername(e.target.value); setProfileSaveError(''); }}
                placeholder="Enter username"
                autoComplete="username"
              />
              {profileSaveError && (
                <p className="app-modal-error" role="alert" style={{ marginTop: 6, marginBottom: 0, color: '#f87171', fontSize: '0.875rem' }}>
                  {profileSaveError}
                </p>
              )}
              <div className="app-profile-connect-x-wrap">
                <button
                  type="button"
                  className="app-profile-connect-x-btn"
                  onClick={handleConnectX}
                  title="Link your X (Twitter) account so your profile shows it as verified"
                >
                  Connect to X
                </button>
                <Link
                  to="/profile/builder"
                  className="app-profile-connect-x-btn"
                  style={{ marginLeft: 8, display: 'inline-block', textDecoration: 'none' }}
                  onClick={() => setProfileOpen(false)}
                  title="Customize your profile page layout"
                >
                  Edit Profile Page
                </Link>
              </div>
            </label>
            <p className="app-modal-section-title" style={{ marginBottom: 4 }}>Set profile picture</p>
            <div className="app-modal-actions" style={{ marginTop: 6, width: '100%' }}>
              <button
                type="button"
                className="app-modal-btn app-modal-btn-secondary"
                onClick={() => setNftSelectorOpen(true)}
                style={{ width: '100%', boxSizing: 'border-box' }}
              >
                NFT pfp Selection
              </button>
            </div>
            <div className="app-modal-actions" style={{ marginTop: 16 }}>
              <button type="button" className="app-modal-btn app-modal-btn-primary" onClick={handleProfileSave}>
                Save
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
