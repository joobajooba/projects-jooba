import React from 'react';
import ReactDOM from 'react-dom/client';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import App from './App';
import '@rainbow-me/rainbowkit/styles.css';
import './index.css';

const queryClient = new QueryClient();

/** Same layout as App but without RainbowKit – used when wallet config fails (e.g. missing env on Vercel) */
function FallbackApp() {
  return (
    <div className="app-layout">
      <aside className="app-sidebar">
        <div className="app-sidebar-header">
          <button type="button" className="app-sidebar-btn" title="Connect wallet" aria-label="Connect wallet">
            <span className="app-sidebar-btn-icon" aria-hidden>🔗</span>
          </button>
          <button type="button" className="app-sidebar-btn" title="Profile" aria-label="Profile sign in">
            <span className="app-sidebar-btn-icon" aria-hidden>👤</span>
          </button>
          <button type="button" className="app-sidebar-btn" title="Information" aria-label="Info">
            <span className="app-sidebar-btn-icon" aria-hidden>ℹ️</span>
          </button>
          <button type="button" className="app-sidebar-btn" title="Settings" aria-label="Settings">
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

let config;
try {
  const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;
  if (!projectId || projectId === 'YOUR_PROJECT_ID') {
    throw new Error('Missing VITE_WALLETCONNECT_PROJECT_ID');
  }
  config = getDefaultConfig({
    appName: 'J00BA',
    projectId,
    ssr: false,
  });
} catch (e) {
  console.warn('Wallet config unavailable, showing layout without connect:', e?.message || e);
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {config ? (
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider>
            <App />
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    ) : (
      <FallbackApp />
    )}
  </React.StrictMode>
);
