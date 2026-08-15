import { useState } from 'react';
import { ConnectButton, useConnectModal } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { NavLink, Outlet } from 'react-router-dom';

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

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { address, connector } = useAccount();
  const { openConnectModal } = useConnectModal();
  const walletAccount = address ?? '';
  const walletName = connector?.name ?? 'Wallet';

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

      <RainbowWalletButton />

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
        <Outlet
          context={{
            walletAccount,
            walletName,
            openWalletMenu: () => openConnectModal?.(),
          }}
        />
      </main>
    </div>
  );
}
