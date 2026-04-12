import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { mainnet } from 'wagmi/chains';
import { defineChain } from 'viem';

/* Avoid default browser RPC (e.g. merkle.io) that can fail CORS from https origins. */
const mainnetWithPublicRpc = {
  ...mainnet,
  rpcUrls: {
    ...mainnet.rpcUrls,
    default: { http: ['https://cloudflare-eth.com'] },
  },
};

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
  chains: [mainnetWithPublicRpc, apeChain],
  ssr: false,
});
