import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';

const NAV_ITEMS = [
  { label: 'Home', to: '/' },
  { label: 'Info', to: '/info' },
  { label: 'Adventures', to: '/adventures' },
  { label: 'Collection', to: '/collection' },
  { label: 'The Dungeon', to: '/the-dungeon' },
  { label: 'Official Links', to: '/official-links' },
  { label: 'FAQs', to: '/faqs' },
];

function MenuIcon() {
  return (
    <svg
      className="sidebar-toggle__icon"
      viewBox="0 0 16 16"
      width="20"
      height="20"
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
    >
      {/* Pixel rounded-square frame */}
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M4 2h8v1h1v1h1v8h-1v1h-1v1H4v-1H3v-1H2V4h1V3h1V2zm1 2v8h6V4H5z"
      />
      {/* Three pixel menu lines */}
      <rect x="5" y="6" width="6" height="1" fill="currentColor" />
      <rect x="5" y="8" width="6" height="1" fill="currentColor" />
      <rect x="5" y="10" width="6" height="1" fill="currentColor" />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg
      className="wallet-connect__icon"
      viewBox="0 0 16 16"
      width="20"
      height="20"
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M2 3h11v2h1v8H2V3zm2 2v6h8V9H9V6h3V5H4zm6 2h4v3h-4V7zm1 1v1h2V8h-2z"
      />
    </svg>
  );
}

function getInjectedProviders() {
  if (typeof window === 'undefined' || !window.ethereum) return [];
  return window.ethereum.providers?.length ? window.ethereum.providers : [window.ethereum];
}

function findWalletProvider(walletType) {
  const providers = getInjectedProviders();

  if (walletType === 'rabby') {
    return providers.find((provider) => provider.isRabby);
  }

  return providers.find((provider) => provider.isMetaMask && !provider.isRabby);
}

function shortenAddress(address) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [walletMenuOpen, setWalletMenuOpen] = useState(false);
  const [walletAccount, setWalletAccount] = useState('');
  const [walletName, setWalletName] = useState('');
  const [walletProvider, setWalletProvider] = useState(null);
  const [walletError, setWalletError] = useState('');
  const [walletConnecting, setWalletConnecting] = useState(false);

  useEffect(() => {
    if (!walletProvider?.on) return undefined;

    const handleAccountsChanged = (accounts) => {
      const nextAccount = accounts?.[0] ?? '';
      setWalletAccount(nextAccount);

      if (!nextAccount) {
        setWalletName('');
        setWalletProvider(null);
      }
    };

    walletProvider.on('accountsChanged', handleAccountsChanged);

    return () => {
      walletProvider.removeListener?.('accountsChanged', handleAccountsChanged);
    };
  }, [walletProvider]);

  async function connectWallet(walletType) {
    const provider = findWalletProvider(walletType);
    const displayName = walletType === 'rabby' ? 'Rabby' : 'MetaMask';

    if (!provider) {
      setWalletError(`${displayName} was not detected. Install or enable the wallet extension.`);
      return;
    }

    setWalletConnecting(true);
    setWalletError('');

    try {
      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      const account = accounts?.[0];

      if (!account) {
        throw new Error('No wallet account was returned.');
      }

      setWalletAccount(account);
      setWalletName(displayName);
      setWalletProvider(provider);
      setWalletMenuOpen(false);
    } catch (error) {
      setWalletError(
        error?.code === 4001
          ? 'Wallet connection was cancelled.'
          : error?.message || `Could not connect to ${displayName}.`
      );
    } finally {
      setWalletConnecting(false);
    }
  }

  function disconnectWallet() {
    setWalletAccount('');
    setWalletName('');
    setWalletProvider(null);
    setWalletError('');
    setWalletMenuOpen(false);
  }

  return (
    <div className="page">
      {!sidebarOpen && (
        <button
          type="button"
          className="sidebar-toggle sidebar-toggle--open"
          aria-label="Open sidebar"
          onClick={() => setSidebarOpen(true)}
        >
          <MenuIcon />
        </button>
      )}

      <div className="wallet-connect">
        <button
          type="button"
          className={`wallet-connect__trigger${
            walletAccount ? ' wallet-connect__trigger--connected' : ''
          }`}
          aria-label={walletAccount ? `Wallet connected: ${walletAccount}` : 'Connect wallet'}
          aria-expanded={walletMenuOpen}
          aria-haspopup="dialog"
          onClick={() => {
            setWalletMenuOpen((open) => !open);
            setWalletError('');
          }}
        >
          <WalletIcon />
          {walletAccount && (
            <span className="wallet-connect__account">{shortenAddress(walletAccount)}</span>
          )}
        </button>

        {walletMenuOpen && (
          <div className="wallet-connect__menu" role="dialog" aria-label="Connect a wallet">
            {walletAccount ? (
              <>
                <p className="wallet-connect__eyebrow">Connected with {walletName}</p>
                <p className="wallet-connect__address">{shortenAddress(walletAccount)}</p>
                <button
                  type="button"
                  className="wallet-connect__disconnect"
                  onClick={disconnectWallet}
                >
                  Disconnect
                </button>
              </>
            ) : (
              <>
                <p className="wallet-connect__title">Connect wallet</p>
                <p className="wallet-connect__help">Choose an installed browser wallet.</p>
                <div className="wallet-connect__options">
                  <button
                    type="button"
                    onClick={() => connectWallet('rabby')}
                    disabled={walletConnecting}
                  >
                    <span className="wallet-connect__option-mark" aria-hidden="true">
                      R
                    </span>
                    Rabby
                  </button>
                  <button
                    type="button"
                    onClick={() => connectWallet('metamask')}
                    disabled={walletConnecting}
                  >
                    <span className="wallet-connect__option-mark" aria-hidden="true">
                      M
                    </span>
                    MetaMask
                  </button>
                </div>
                {walletError && (
                  <p className="wallet-connect__error" role="alert">
                    {walletError}
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <aside
        className={`sidebar${sidebarOpen ? ' sidebar--open' : ''}`}
        aria-hidden={!sidebarOpen}
      >
        <button
          type="button"
          className="sidebar-toggle sidebar-toggle--close"
          aria-label="Close sidebar"
          onClick={() => setSidebarOpen(false)}
        >
          <MenuIcon />
        </button>

        <nav className="sidebar-nav" aria-label="Main">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `sidebar-nav__link${isActive ? ' sidebar-nav__link--active' : ''}`
              }
              onClick={() => setSidebarOpen(false)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="page-content">
        <Outlet context={{ walletAccount, walletName }} />
      </main>
    </div>
  );
}
