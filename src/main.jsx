import React from 'react';
import ReactDOM from 'react-dom/client';
import { WagmiProvider } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { defineChain } from 'viem';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getDefaultConfig, RainbowKitProvider } from '@rainbow-me/rainbowkit';
import App from './App';
import AuthXCallback from './pages/AuthXCallback';
import './index.css';
import '@rainbow-me/rainbowkit/styles.css';

function Root() {
  if (typeof window !== 'undefined' && window.location.pathname === '/auth/x/callback') {
    return <AuthXCallback />;
  }
  return <App />;
}

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID';

const apeChain = defineChain({
  id: 33139,
  name: 'ApeChain',
  nativeCurrency: { name: 'APE', symbol: 'APE', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.apechain.com'] } },
  blockExplorers: { default: { name: 'Explorer', url: 'https://explorer.apechain.com' } },
});

const config = getDefaultConfig({
  appName: 'Studio Profile Builder',
  projectId,
  chains: [mainnet, apeChain],
  ssr: false,
});

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider modalSize="compact">
          <Root />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>
);
