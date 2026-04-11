import { useEffect, useState } from 'react';
import { User } from 'lucide-react';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { useWalletNfts } from '../hooks/useWalletNfts';

function ModalChrome({ title, children, onClose }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
      aria-modal="true"
      role="dialog"
      aria-labelledby="profile-auth-title"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 border border-gray-600 rounded-xl shadow-xl w-full max-w-lg max-h-[min(90vh,640px)] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-gray-700 flex items-center justify-between shrink-0">
          <h2 id="profile-auth-title" className="text-lg font-semibold text-gray-100">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 text-sm font-medium px-2 py-1 rounded hover:bg-gray-700"
          >
            Close
          </button>
        </div>
        <div className="p-5 overflow-y-auto min-h-0 flex-1">{children}</div>
      </div>
    </div>
  );
}

export default function ProfileAuthModal({ open, onClose, onSignupComplete }) {
  const [view, setView] = useState('menu');
  const { address, isConnected, chainId } = useAccount();
  const { openConnectModal } = useConnectModal();

  const [username, setUsername] = useState('');
  const [geoManual, setGeoManual] = useState('');
  const [geoDevice, setGeoDevice] = useState(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState('');
  const [selectedNft, setSelectedNft] = useState(null);
  const [signupError, setSignupError] = useState('');

  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const nftsQuery = useWalletNfts(address, chainId, open && view === 'signup' && isConnected);

  useEffect(() => {
    if (!open) return;
    setView('menu');
    setSignupError('');
    setLoginError('');
    setGeoError('');
  }, [open]);

  useEffect(() => {
    if (!open || view !== 'signup') {
      setSelectedNft(null);
    }
  }, [open, view, address, chainId]);

  if (!open) return null;

  const requestDeviceLocation = () => {
    setGeoError('');
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported in this browser.');
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoDevice({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setGeoLoading(false);
      },
      (err) => {
        setGeoLoading(false);
        setGeoError(err.message || 'Could not read location.');
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 }
    );
  };

  const handleSignupSubmit = (e) => {
    e.preventDefault();
    setSignupError('');
    const u = username.trim();
    if (!u) {
      setSignupError('Please set a username.');
      return;
    }
    const hasGeo = geoDevice || geoManual.trim();
    if (!hasGeo) {
      setSignupError('Please set your location (device or text) or enter a region.');
      return;
    }
    if (!isConnected || !address) {
      setSignupError('Connect your wallet to finish signup.');
      return;
    }

    const nfts = nftsQuery.data ?? [];
    if (nfts.length > 0 && !selectedNft) {
      setSignupError('Choose an NFT from your wallet for your profile picture.');
      return;
    }

    const location = geoDevice
      ? { source: 'device', lat: geoDevice.lat, lng: geoDevice.lng }
      : { source: 'manual', label: geoManual.trim() };

    const avatarUrl = selectedNft?.imageUrl || '';

    const payload = {
      username: u,
      wallet: address,
      location,
      avatarUrl,
      nft: selectedNft
        ? { contract: selectedNft.contract, tokenId: selectedNft.tokenId }
        : null,
    };

    try {
      sessionStorage.setItem('studioape_profile', JSON.stringify(payload));
    } catch {
      /* ignore */
    }

    onSignupComplete?.(payload);
    onClose();
  };

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    setLoginError('');
    if (!loginUsername.trim() || !loginPassword) {
      setLoginError('Enter username and password.');
      return;
    }
    try {
      sessionStorage.setItem(
        'studioape_session',
        JSON.stringify({ username: loginUsername.trim(), at: Date.now() })
      );
    } catch {
      /* ignore */
    }
    onClose();
  };

  if (view === 'menu') {
    return (
      <ModalChrome title="Profile" onClose={onClose}>
        <p className="text-gray-400 text-sm mb-6">
          Sign up to create a profile with a username, location, and NFT avatar. Log in if you already
          have an account.
        </p>
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => setView('signup')}
            className="w-full py-3 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            Sign up
          </button>
          <button
            type="button"
            onClick={() => setView('login')}
            className="w-full py-3 rounded-lg border border-gray-600 bg-gray-800 text-gray-100 font-medium hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Log in
          </button>
        </div>
      </ModalChrome>
    );
  }

  if (view === 'login') {
    return (
      <ModalChrome title="Log in" onClose={onClose}>
        <button
          type="button"
          onClick={() => setView('menu')}
          className="text-sm text-indigo-400 hover:text-indigo-300 mb-4"
        >
          ← Back
        </button>
        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <div>
            <label htmlFor="login-username" className="block text-xs font-medium text-gray-400 mb-1">
              Username
            </label>
            <input
              id="login-username"
              type="text"
              autoComplete="username"
              value={loginUsername}
              onChange={(e) => setLoginUsername(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-600 bg-gray-900 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Your username"
            />
          </div>
          <div>
            <label htmlFor="login-password" className="block text-xs font-medium text-gray-400 mb-1">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-600 bg-gray-900 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="••••••••"
            />
          </div>
          {loginError ? <p className="text-sm text-red-400">{loginError}</p> : null}
          <p className="text-xs text-gray-500">
            This is a front-end flow only; wire your auth API here when ready.
          </p>
          <button
            type="submit"
            className="w-full py-3 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            Log in
          </button>
        </form>
      </ModalChrome>
    );
  }

  /* signup */
  const nfts = nftsQuery.data ?? [];
  const nftsLoading = nftsQuery.isLoading;
  const nftsError = nftsQuery.isError ? nftsQuery.error?.message || 'Could not load NFTs.' : '';

  return (
    <ModalChrome title="Create account" onClose={onClose}>
      <button
        type="button"
        onClick={() => setView('menu')}
        className="text-sm text-indigo-400 hover:text-indigo-300 mb-4"
      >
        ← Back
      </button>
      <form onSubmit={handleSignupSubmit} className="space-y-5">
        <div>
          <label htmlFor="su-username" className="block text-xs font-medium text-gray-400 mb-1">
            Username
          </label>
          <input
            id="su-username"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-600 bg-gray-900 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Choose a username"
          />
        </div>

        <div>
          <p className="text-xs font-medium text-gray-400 mb-2">Geo-location</p>
          <div className="flex flex-wrap gap-2 mb-2">
            <button
              type="button"
              onClick={requestDeviceLocation}
              disabled={geoLoading}
              className="px-3 py-2 rounded-lg bg-gray-700 text-gray-100 text-sm hover:bg-gray-600 disabled:opacity-50"
            >
              {geoLoading ? 'Locating…' : 'Use device location'}
            </button>
          </div>
          {geoDevice ? (
            <p className="text-xs text-gray-300 mb-2">
              Saved: {geoDevice.lat.toFixed(5)}, {geoDevice.lng.toFixed(5)}
            </p>
          ) : null}
          {geoError ? <p className="text-xs text-amber-400 mb-2">{geoError}</p> : null}
          <label htmlFor="su-region" className="block text-xs text-gray-500 mb-1">
            Or enter region / city (used if you skip device location)
          </label>
          <input
            id="su-region"
            type="text"
            value={geoManual}
            onChange={(e) => setGeoManual(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-600 bg-gray-900 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="e.g. London, UK"
          />
        </div>

        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <p className="text-xs font-medium text-gray-400">Profile picture (NFT from wallet)</p>
            {!isConnected ? (
              <button
                type="button"
                onClick={() => openConnectModal?.()}
                className="text-xs px-2 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-500"
              >
                Connect wallet
              </button>
            ) : null}
          </div>
          {!isConnected ? (
            <p className="text-sm text-gray-500">Connect a wallet to load your NFTs.</p>
          ) : nftsLoading ? (
            <p className="text-sm text-gray-500">Loading NFTs…</p>
          ) : nftsError ? (
            <p className="text-sm text-amber-400">{nftsError}</p>
          ) : nfts.length === 0 ? (
            <p className="text-sm text-gray-500">
              No NFTs found on this network for your wallet. Add{' '}
              <code className="text-indigo-300">VITE_ALCHEMY_API_KEY</code> (Ethereum / ApeChain) or{' '}
              <code className="text-indigo-300">VITE_PROFILE_NFT_CONTRACTS</code> for ERC721 enumerable
              collections, or switch network in your wallet.
            </p>
          ) : (
            <ul className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-48 overflow-y-auto studio-scrollbar pr-1">
              {nfts.map((nft) => {
                const key = `${nft.contract}-${nft.tokenId}`;
                const sel =
                  selectedNft?.contract === nft.contract && selectedNft?.tokenId === nft.tokenId;
                return (
                  <li key={key}>
                    <button
                      type="button"
                      onClick={() => setSelectedNft(nft)}
                      className={`w-full aspect-square rounded-lg overflow-hidden border-2 transition-colors ${
                        sel ? 'border-indigo-500 ring-2 ring-indigo-500/40' : 'border-gray-700 hover:border-gray-500'
                      } bg-gray-900`}
                      title={nft.name}
                    >
                      {nft.imageUrl ? (
                        <img
                          src={nft.imageUrl}
                          alt=""
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-600">
                          <User className="w-8 h-8" />
                        </div>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {signupError ? <p className="text-sm text-red-400">{signupError}</p> : null}

        <button
          type="submit"
          disabled={!isConnected}
          className="w-full py-3 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-40 disabled:pointer-events-none"
        >
          Create account
        </button>
      </form>
    </ModalChrome>
  );
}
