import { useState } from 'react';
import CryptoWalletModal from './components/CryptoWalletModal';
import ModelViewer from './components/ModelViewer';

const NAV_ITEMS = [
  { id: 'crypto-wallet', label: 'Crypto Wallet', type: 'wallet' },
  { id: 'roadmap', label: 'Roadmap' },
  { id: 'the-team', label: 'The Team' },
  { id: 'bops', label: 'Bops' },
];

const MARQUEE_ITEMS = Array.from({ length: 12 }, (_, index) => index);

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [walletModalOpen, setWalletModalOpen] = useState(false);

  const openWalletModal = () => {
    setWalletModalOpen(true);
    setSidebarOpen(false);
  };

  return (
    <div className="l-page">
      <div className="c-marquee" aria-label="Coming soon">
        <div className="c-marquee__track" aria-hidden="true">
          {MARQUEE_ITEMS.map((item) => (
            <span key={item} className="c-marquee__item">
              Coming soon
            </span>
          ))}
        </div>
      </div>

      <button
        type="button"
        className="c-button c-button--controller"
        onClick={() => setSidebarOpen((isOpen) => !isOpen)}
        aria-controls="site-sidebar"
        aria-expanded={sidebarOpen}
        aria-label="Toggle sidebar"
      >
        <span className="c-icon c-icon--hamburger" aria-hidden="true">
          <span className="c-icon__line" />
          <span className="c-icon__line" />
          <span className="c-icon__line" />
        </span>
      </button>

      <aside id="site-sidebar" className={`c-sidebar${sidebarOpen ? ' c-sidebar--open' : ''}`} aria-label="Site navigation">
        <nav className="c-sidebar__nav">
          {NAV_ITEMS.map((item) => (
            item.type === 'wallet' ? (
              <button key={item.id} type="button" className="c-sidebar__link c-sidebar__link--button u-text-bold" onClick={openWalletModal}>
                {item.label}
              </button>
            ) : (
              <a key={item.id} className="c-sidebar__link u-text-bold" href={`#${item.id}`}>
                {item.label}
              </a>
            )
          ))}
        </nav>
      </aside>

      <main className="l-page__content" aria-label="Main page content">
        <ModelViewer src="/models/9419_model.glb" />
      </main>
      <CryptoWalletModal open={walletModalOpen} onClose={() => setWalletModalOpen(false)} />
    </div>
  );
}
