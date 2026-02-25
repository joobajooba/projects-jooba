/**
 * Blank page at /test – no navbar, no main site code or styles.
 * Uses only this folder's CSS. Route: j00ba.xyz/test
 */
import { ConnectButton } from '@rainbow-me/rainbowkit';
import './TestPage.css';

export default function TestPage() {
  return (
    <div className="test-page" data-page="test">
      <aside className="test-page-sidebar">
        <div className="test-page-sidebar-header">
          <ConnectButton.Custom>
            {({ openConnectModal, openAccountModal, account, mounted }) => {
              const connected = mounted && account;
              return (
                <button
                  type="button"
                  className="test-page-icon-btn"
                  onClick={connected ? openAccountModal : openConnectModal}
                  title={connected ? 'Account' : 'Connect wallet'}
                  aria-label={connected ? 'Account' : 'Connect wallet'}
                >
                  <span className="test-page-icon" aria-hidden>{(connected ? '💳' : '🔗')}</span>
                </button>
              );
            }}
          </ConnectButton.Custom>
          <button
            type="button"
            className="test-page-icon-btn"
            title="Profile"
            aria-label="Profile"
          >
            <span className="test-page-icon" aria-hidden>👤</span>
          </button>
          <button
            type="button"
            className="test-page-icon-btn"
            title="Site information"
            aria-label="Site information"
          >
            <span className="test-page-icon" aria-hidden>ℹ️</span>
          </button>
          <button
            type="button"
            className="test-page-icon-btn"
            title="Settings"
            aria-label="Settings"
          >
            <span className="test-page-icon" aria-hidden>⚙️</span>
          </button>
        </div>
      </aside>
    </div>
  );
}
