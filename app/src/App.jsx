import { ConnectButton } from '@rainbow-me/rainbowkit';

export default function App() {
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
            aria-label="Profile sign in"
          >
            <span className="app-sidebar-btn-icon" aria-hidden>👤</span>
          </button>
          <button
            type="button"
            className="app-sidebar-btn"
            title="Information"
            aria-label="Info"
          >
            <span className="app-sidebar-btn-icon" aria-hidden>ℹ️</span>
          </button>
          <button
            type="button"
            className="app-sidebar-btn"
            title="Settings"
            aria-label="Settings"
          >
            <span className="app-sidebar-btn-icon" aria-hidden>⚙️</span>
          </button>
        </div>
      </aside>
      <main className="app-main">
        <div className="app-main-inner">
          <h1>J00BA</h1>
          <p>Start from here.</p>
        </div>
      </main>
    </div>
  );
}
