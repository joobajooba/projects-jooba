import React from 'react';
import ReactDOM from 'react-dom/client';
import { WagmiProvider, http } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { mainnet } from 'wagmi/chains';
import { defineChain } from 'viem/chains/utils';
import App from './App';
import '@rainbow-me/rainbowkit/styles.css';
import './index.css';

const queryClient = new QueryClient();

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
          <div className="app-sidebar-username">No username set</div>
          <div className="app-sidebar-address">Not connected</div>
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
    transports: {
      [mainnet.id]: import.meta.env.VITE_ALCHEMY_API_KEY_ETH
        ? http(`https://eth-mainnet.g.alchemy.com/v2/${import.meta.env.VITE_ALCHEMY_API_KEY_ETH}`)
        : http(),
      [apechain.id]: import.meta.env.VITE_ALCHEMY_API_KEY_APECHAIN
        ? http(`https://apechain-mainnet.g.alchemy.com/v2/${import.meta.env.VITE_ALCHEMY_API_KEY_APECHAIN}`)
        : http('https://rpc.apechain.com'),
    },
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
          <RainbowKitProvider modalSize="wide">
            <App />
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    ) : (
      <FallbackApp />
    )}
  </React.StrictMode>
);
