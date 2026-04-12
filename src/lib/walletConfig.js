import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { mainnet } from 'wagmi/chains';
import { defineChain } from 'viem';

const apeChain = defineChain({
  id: 33139,
  name: 'ApeChain',
  nativeCurrency: { name: 'APE', symbol: 'APE', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.apechain.com'] } },
  blockExplorers: { default: { name: 'Explorer', url: 'https://explorer.apechain.com' } },
});

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID';

export const wagmiConfig = getDefaultConfig({
  appName: 'Jooba',
  projectId,
  chains: [mainnet, apeChain],
  ssr: false,
});
