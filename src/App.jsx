import { useState } from 'react';
import WalletTopBarButton from './components/WalletTopBarButton';

const NAV_ITEMS = [
  { id: 'wallet', label: 'Wallet Connect', icon: '/nav-team.png', href: '#wallet-top' },
  { id: 'home', label: 'Home', icon: '/nav-wallet.png', href: '#home' },
  { id: 'team', label: 'The Team', icon: '/nav-collapse.png', href: '#the-team' },
];

export default function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className={`app-only-shell${sidebarCollapsed ? ' app-only-shell--collapsed' : ''}`}>
      <aside className="app-left-nav" aria-label="Page navigation">
        <nav className="app-left-nav-list">
          {NAV_ITEMS.map((item) => (
            <a key={item.id} href={item.href} className="app-left-nav-btn" title={item.label} aria-label={item.label}>
              <img src={item.icon} alt="" className="app-left-nav-icon" width={20} height={20} />
            </a>
          ))}
        </nav>
      </aside>

      <button
        type="button"
        className="app-left-nav-collapse"
        onClick={() => setSidebarCollapsed((v) => !v)}
        aria-label={sidebarCollapsed ? 'Expand navigation' : 'Collapse navigation'}
        aria-expanded={!sidebarCollapsed}
      >
        <img src="/nav-home.png" alt="" className="app-left-nav-collapse-icon" width={14} height={14} />
      </button>

      <main className="app-only-content" id="home">
        <section className="app-home-section" aria-label="Home page section">
          <div className="app-only-toprow" id="wallet-top">
            <div className="app-only-wallet">
              <WalletTopBarButton connectLabel="Connect wallet" />
            </div>
          </div>
          <img
            src="/home-island-1920x1080.png"
            alt="Jooba home artwork"
            className="app-home-image"
            width={1920}
            height={1080}
            decoding="async"
          />
        </section>

        <section id="the-team" className="app-blank-page" aria-label="Blank page section" />
      </main>
    </div>
  );
}
