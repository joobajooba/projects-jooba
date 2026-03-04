import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { WagmiProvider, http } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { mainnet } from 'wagmi/chains';
import { defineChain } from 'viem/chains/utils';
import App from './App';
import { getAlchemyApiKey } from './lib/alchemy';
import '@rainbow-me/rainbowkit/styles.css';
import './index.css';
import './tailwind.css';

const queryClient = new QueryClient();

/** Catches render errors so we see a message instead of a blank screen (e.g. on Vercel) */
class AppErrorBoundary extends React.Component {
  state = { hasError: false, error: null };
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('App failed to render:', error, info);
  }
  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <div
          style={{
            minHeight: '100vh',
            padding: 24,
            background: '#1a1a1a',
            color: '#e5e5e5',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <h1 style={{ margin: '0 0 12px', fontSize: '1.25rem' }}>Something went wrong</h1>
          <p style={{ margin: 0, color: '#a3a3a3', fontSize: 14 }}>
            {this.state.error.message}
          </p>
          <p style={{ margin: '16px 0 0', fontSize: 12, color: '#737373' }}>
            Check the browser console for details.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

const apechain = defineChain({
  id: 33139,
  name: 'ApeChain',
  network: 'apechain',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.apechain.com'],
    },
  },
  blockExplorers: {
    default: { name: 'Explorer', url: 'https://explorer.apechain.com' },
  },
});

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
        <div className="app-sidebar-profile">
          <div className="app-sidebar-profile-pic-wrap">
            <div className="app-sidebar-profile-pic app-sidebar-profile-pic-placeholder" aria-hidden>
              <span className="app-sidebar-profile-emoji">☺</span>
            </div>
          </div>
          <div className="app-sidebar-profile-user">
            <div className="app-sidebar-username">No username set</div>
            <div className="app-sidebar-address">Not connected</div>
          </div>
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
    chains: [mainnet, apechain],
    transports: (() => {
      const ethKey = getAlchemyApiKey(import.meta.env.VITE_ALCHEMY_API_KEY_ETH || import.meta.env.VITE_ALCHEMY_API_KEY);
      const apeKey = getAlchemyApiKey(import.meta.env.VITE_ALCHEMY_API_KEY_APECHAIN || import.meta.env.VITE_ALCHEMY_API_KEY);
      return {
        [mainnet.id]: ethKey ? http(`https://eth-mainnet.g.alchemy.com/v2/${ethKey}`) : http(),
        [apechain.id]: apeKey ? http(`https://apechain-mainnet.g.alchemy.com/v2/${apeKey}`) : http('https://rpc.apechain.com'),
      };
    })(),
    ssr: false,
  });
} catch (e) {
  console.warn('Wallet config unavailable, showing layout without connect:', e?.message || e);
}

const rootEl = document.getElementById('root');
if (!rootEl) {
  console.error('Root element #root not found');
} else {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <AppErrorBoundary>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          {config ? (
            <WagmiProvider config={config}>
              <QueryClientProvider client={queryClient}>
                <RainbowKitProvider modalSize="wide">
                  <App />
                </RainbowKitProvider>
              </QueryClientProvider>
            </WagmiProvider>
          ) : (
            <FallbackApp />
          )}
        </BrowserRouter>
      </AppErrorBoundary>
    </React.StrictMode>
  );
}
