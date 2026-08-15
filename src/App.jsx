import { useEffect, useState } from 'react';
import { ConnectButton, useConnectModal } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { NavLink, Outlet } from 'react-router-dom';
import { AdventureRuntimeProvider } from './lib/adventureRuntime';

const NAV_ITEMS = [
  { label: 'Profile', to: '/profile', featured: true },
  { label: 'Community', to: '/community' },
  { label: 'Home', to: '/' },
  { label: 'Info', to: '/info' },
  { label: 'Adventures', to: '/adventures' },
  { label: 'Collection', to: '/collection' },
  { label: 'The Dungeon', to: '/the-dungeon' },
  { label: 'Official Links', to: '/official-links' },
  { label: 'FAQs', to: '/faqs' },
];

const FONT_STORAGE_KEY = 'j00ba-font-mode';

function readFontMode() {
  try {
    const value = window.localStorage.getItem(FONT_STORAGE_KEY);
    return value === 'readable' ? 'readable' : 'pixel';
  } catch {
    return 'pixel';
  }
}

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
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M4 2h8v1h1v1h1v8h-1v1h-1v1H4v-1H3v-1H2V4h1V3h1V2zm1 2v8h6V4H5z"
      />
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

function SettingsIcon() {
  return (
    <svg
      className="site-settings__icon"
      viewBox="0 0 16 16"
      width="20"
      height="20"
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
    >
      {/* Pixel cog wheel: eight teeth + rim + hub hole */}
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M7 1h2v2h2V2h1v1h1v2h-1v1h1v2h-1v1h1v2h-1v1h-1v1h-2v-1H7v1H5v-1H4v-1H3v-2h1V9H3V7h1V6H3V4h1V3h1V2h2v1zm0 4H6v1H5v2h1v1h1v1h2v-1h1V8h1V6h-1V5H9V4H7v1zm1 2h2v2H8V7z"
      />
    </svg>
  );
}

function RainbowWalletButton() {
  return (
    <ConnectButton.Custom>
      {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
        const ready = mounted;
        const connected = ready && account && chain;
        const wrongNetwork = connected && chain.unsupported;
        const openModal = !connected
          ? openConnectModal
          : wrongNetwork
            ? openChainModal
            : openAccountModal;

        return (
          <div
            className="wallet-connect"
            {...(!ready && {
              'aria-hidden': true,
              style: {
                opacity: 0,
                pointerEvents: 'none',
                userSelect: 'none',
              },
            })}
          >
            <button
              type="button"
              className={`wallet-connect__trigger${
                connected ? ' wallet-connect__trigger--connected' : ''
              }${wrongNetwork ? ' wallet-connect__trigger--wrong-network' : ''}`}
              aria-label={
                !connected
                  ? 'Connect wallet'
                  : wrongNetwork
                    ? 'Switch to Robinhood Chain'
                    : `Wallet connected: ${account.address}`
              }
              aria-haspopup="dialog"
              onClick={openModal}
            >
              <WalletIcon />
              {connected && (
                <span className="wallet-connect__account">
                  {wrongNetwork ? 'Wrong network' : account.displayName}
                </span>
              )}
            </button>
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}

function SiteSettingsModal({ fontMode, onClose, onFontModeChange }) {
  return (
    <div
      className="site-settings-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="site-settings-title"
      onClick={onClose}
    >
      <div
        className="site-settings-modal__panel"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="site-settings-modal__header">
          <div>
            <p className="adventure-panel__eyebrow">Preferences</p>
            <h2 id="site-settings-title">Settings</h2>
          </div>
          <button type="button" className="site-settings-modal__close" onClick={onClose}>
            Close
          </button>
        </div>

        <section className="site-settings-modal__section" aria-labelledby="accessibility-title">
          <h3 id="accessibility-title">Accessibility</h3>
          <p>
            Switch site text between the pixel font and a simple Arial font that is easier to
            read.
          </p>
          <div className="site-settings-modal__font-options">
            <button
              type="button"
              className={fontMode === 'readable' ? 'is-active' : undefined}
              aria-pressed={fontMode === 'readable'}
              onClick={() => onFontModeChange('readable')}
            >
              Simple Arial font
            </button>
            <button
              type="button"
              className={fontMode === 'pixel' ? 'is-active' : undefined}
              aria-pressed={fontMode === 'pixel'}
              onClick={() => onFontModeChange('pixel')}
            >
              Pixel art font
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [fontMode, setFontMode] = useState(() =>
    typeof window === 'undefined' ? 'pixel' : readFontMode()
  );
  const { address, connector } = useAccount();
  const { openConnectModal } = useConnectModal();
  const walletAccount = address ?? '';
  const walletName = connector?.name ?? 'Wallet';

  useEffect(() => {
    document.documentElement.classList.toggle('font-readable', fontMode === 'readable');
    try {
      window.localStorage.setItem(FONT_STORAGE_KEY, fontMode);
    } catch {
      // Ignore storage failures.
    }
  }, [fontMode]);

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

      <div className="top-actions">
        <button
          type="button"
          className="site-settings__trigger"
          aria-label="Open settings"
          aria-haspopup="dialog"
          aria-expanded={settingsOpen}
          onClick={() => setSettingsOpen(true)}
        >
          <SettingsIcon />
        </button>
        <RainbowWalletButton />
      </div>

      {settingsOpen ? (
        <SiteSettingsModal
          fontMode={fontMode}
          onClose={() => setSettingsOpen(false)}
          onFontModeChange={setFontMode}
        />
      ) : null}

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
                `sidebar-nav__link${isActive ? ' sidebar-nav__link--active' : ''}${
                  item.featured ? ' sidebar-nav__link--profile' : ''
                }`
              }
              onClick={() => setSidebarOpen(false)}
            >
              <span className={item.featured ? 'sidebar-nav__profile-label' : undefined}>
                {item.label}
              </span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="page-content">
        <AdventureRuntimeProvider walletAccount={walletAccount}>
          <Outlet
            context={{
              walletAccount,
              walletName,
              openWalletMenu: () => openConnectModal?.(),
            }}
          />
        </AdventureRuntimeProvider>
      </main>
    </div>
  );
}
