import { useMemo } from 'react';
import { formatUnits } from 'viem';
import { useBalance, useReadContract } from 'wagmi';

const MAINNET = 1;
const APECHAIN = 33139;

const WETH_MAINNET = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
const APE_MAINNET = '0x4d224452801ACEd8B2F0aebE155379bb5D594381';
const WAPE_MAINNET = '0x76551Ab68d42042c15D54A8DB54431FCAC7a7C2D';
const WAPE_APECHAIN = '0x48b62137edfa95a428d35c09e44256a739f6b557';

const erc20Abi = [
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
];

function formatTokenAmount(raw, decimals = 18, symbol) {
  if (raw == null) return null;
  try {
    const s = formatUnits(raw, decimals);
    const n = Number(s);
    if (!Number.isFinite(n)) return null;
    const formatted =
      n === 0
        ? '0'
        : n < 1e-8
          ? '<0.00000001'
          : n.toLocaleString(undefined, { maximumFractionDigits: 6 });
    return symbol ? `${formatted} ${symbol}` : formatted;
  } catch {
    return null;
  }
}

/**
 * Formatted balance for the wallet menu / pill for the selected display currency on the **connected** chain.
 */
export function useWalletMenuBalance(address, chainId, currencyId) {
  const addr = address ?? undefined;

  const ethMainnet = useBalance({
    address: addr,
    chainId: MAINNET,
    query: { enabled: Boolean(addr && chainId === MAINNET && currencyId === 'eth') },
  });

  const apeNative = useBalance({
    address: addr,
    chainId: APECHAIN,
    query: { enabled: Boolean(addr && chainId === APECHAIN && currencyId === 'apecoin') },
  });

  const wethMainnet = useReadContract({
    chainId: MAINNET,
    address: WETH_MAINNET,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: addr ? [addr] : undefined,
    query: { enabled: Boolean(addr && chainId === MAINNET && currencyId === 'weth') },
  });

  const apeMainnet = useReadContract({
    chainId: MAINNET,
    address: APE_MAINNET,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: addr ? [addr] : undefined,
    query: { enabled: Boolean(addr && chainId === MAINNET && currencyId === 'apecoin') },
  });

  const wapeMainnet = useReadContract({
    chainId: MAINNET,
    address: WAPE_MAINNET,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: addr ? [addr] : undefined,
    query: { enabled: Boolean(addr && chainId === MAINNET && currencyId === 'wape') },
  });

  const wapeApechain = useReadContract({
    chainId: APECHAIN,
    address: WAPE_APECHAIN,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: addr ? [addr] : undefined,
    query: { enabled: Boolean(addr && chainId === APECHAIN && currencyId === 'wape') },
  });

  return useMemo(() => {
    if (!addr || !chainId) {
      return { text: '—', isLoading: false };
    }

    const loading =
      (chainId === MAINNET &&
        currencyId === 'eth' &&
        ethMainnet.isLoading) ||
      (chainId === APECHAIN &&
        currencyId === 'apecoin' &&
        apeNative.isLoading) ||
      (chainId === MAINNET &&
        currencyId === 'weth' &&
        wethMainnet.isLoading) ||
      (chainId === MAINNET &&
        currencyId === 'apecoin' &&
        apeMainnet.isLoading) ||
      (chainId === MAINNET &&
        currencyId === 'wape' &&
        wapeMainnet.isLoading) ||
      (chainId === APECHAIN &&
        currencyId === 'wape' &&
        wapeApechain.isLoading);

    if (loading) {
      return { text: '…', isLoading: true };
    }

    if (chainId === MAINNET) {
      if (currencyId === 'eth') {
        const d = ethMainnet.data;
        if (!d) return { text: '—', isLoading: false };
        const n = Number(d.formatted);
        const formatted = Number.isFinite(n)
          ? n.toLocaleString(undefined, { maximumFractionDigits: 6 })
          : d.formatted;
        return { text: `${formatted} ${d.symbol}`, isLoading: false };
      }
      if (currencyId === 'weth') {
        const t = formatTokenAmount(wethMainnet.data, 18, 'WETH');
        return { text: t ?? '—', isLoading: false };
      }
      if (currencyId === 'apecoin') {
        const t = formatTokenAmount(apeMainnet.data, 18, 'APE');
        return { text: t ?? '—', isLoading: false };
      }
      if (currencyId === 'wape') {
        const t = formatTokenAmount(wapeMainnet.data, 18, 'WAPE');
        return { text: t ?? '—', isLoading: false };
      }
    }

    if (chainId === APECHAIN) {
      if (currencyId === 'apecoin') {
        const d = apeNative.data;
        if (!d) return { text: '—', isLoading: false };
        const n = Number(d.formatted);
        const formatted = Number.isFinite(n)
          ? n.toLocaleString(undefined, { maximumFractionDigits: 6 })
          : d.formatted;
        return { text: `${formatted} ${d.symbol}`, isLoading: false };
      }
      if (currencyId === 'wape') {
        const t = formatTokenAmount(wapeApechain.data, 18, 'WAPE');
        return { text: t ?? '—', isLoading: false };
      }
      if (currencyId === 'eth' || currencyId === 'weth') {
        return { text: '—', isLoading: false };
      }
    }

    return { text: '—', isLoading: false };
  }, [
    addr,
    chainId,
    currencyId,
    ethMainnet.data,
    ethMainnet.isLoading,
    apeNative.data,
    apeNative.isLoading,
    wethMainnet.data,
    wethMainnet.isLoading,
    apeMainnet.data,
    apeMainnet.isLoading,
    wapeMainnet.data,
    wapeMainnet.isLoading,
    wapeApechain.data,
    wapeApechain.isLoading,
  ]);
}
