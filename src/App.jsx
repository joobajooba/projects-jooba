import { useState } from 'react';
import WalletTopBarButton from './components/WalletTopBarButton';

const NAV_ITEMS = [
  { id: 'wallet', label: 'Wallet Connect', icon: '/nav-wallet.png', href: '#wallet-top' },
  { id: 'home', label: 'Home', icon: '/nav-home.png', href: '#home' },
  { id: 'team', label: 'The Team', icon: '/nav-team.png', href: '#the-team' },
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
              <span className="app-left-nav-label">{item.label}</span>
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
        <img src="/nav-collapse.png" alt="" className="app-left-nav-collapse-icon" width={14} height={14} />
      </button>

      <main className="app-only-content" id="home">
        <div className="app-only-toprow" id="wallet-top">
          <div className="app-only-wallet">
            <WalletTopBarButton connectLabel="Connect wallet" />
          </div>
        </div>
        <section id="the-team" className="app-only-spacer" aria-hidden />
      </main>
    </div>
  );
}
