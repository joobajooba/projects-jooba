import { connectorsForWallets } from '@rainbow-me/rainbowkit';
import {
  injectedWallet,
  metaMaskWallet,
  rabbyWallet,
  rainbowWallet,
  walletConnectWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { createConfig, http } from 'wagmi';
import { defineChain } from 'viem';

const ROBINHOOD_RPC_URL = 'https://rpc.mainnet.chain.robinhood.com';
const DEFAULT_WALLETCONNECT_PROJECT_ID = '597c0c8ff1767d6501aab3c89efc92ab';

export const robinhoodChain = defineChain({
  id: 4663,
  name: 'Robinhood Chain',
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [ROBINHOOD_RPC_URL],
    },
  },
  blockExplorers: {
    default: {
      name: 'Robinhood Chain Blockscout',
      url: 'https://robinhoodchain.blockscout.com',
    },
  },
});

const projectId =
  import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || DEFAULT_WALLETCONNECT_PROJECT_ID;

const connectors = connectorsForWallets(
  [
    {
      groupName: 'Recommended',
      wallets: [
        rabbyWallet,
        metaMaskWallet,
        rainbowWallet,
        walletConnectWallet,
        injectedWallet,
      ],
    },
  ],
  {
    appName: 'IMPLINGz',
    projectId,
  }
);

export const wagmiConfig = createConfig({
  chains: [robinhoodChain],
  connectors,
  transports: {
    [robinhoodChain.id]: http(ROBINHOOD_RPC_URL),
  },
});
