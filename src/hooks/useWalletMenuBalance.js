import { useEffect, useState } from 'react';
import { formatUnits } from 'viem';
import { useChainId, useConfig } from 'wagmi';
import { getBalance, readContract } from 'wagmi/actions';

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

function normalizeChainId(chainId) {
  if (chainId == null) return undefined;
  if (typeof chainId === 'bigint') return Number(chainId);
  const n = Number(chainId);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * On-chain balance for the connected chain (wagmi `useChainId`), via core actions — avoids TanStack
 * `useBalance` / `useReadContract` getting stuck in `isFetching` in some browser/extension setups.
 */
export function useWalletMenuBalance(address, currencyId) {
  const config = useConfig();
  const wagmiChainId = useChainId();
  const cid = normalizeChainId(wagmiChainId);
  const [text, setText] = useState('—');

  useEffect(() => {
    const addr = typeof address === 'string' ? address.trim() : '';
    if (!addr || cid == null) {
      setText('—');
      return undefined;
    }

    let cancelled = false;

    (async () => {
      try {
        let out = '—';

        if (cid === MAINNET) {
          if (currencyId === 'eth') {
            const b = await getBalance(config, { address: addr, chainId: MAINNET });
            if (cancelled) return;
            const n = Number(b.formatted);
            const formatted = Number.isFinite(n)
              ? n.toLocaleString(undefined, { maximumFractionDigits: 6 })
              : b.formatted;
            out = `${formatted} ${b.symbol}`;
          } else if (currencyId === 'weth') {
            const v = await readContract(config, {
              chainId: MAINNET,
              address: WETH_MAINNET,
              abi: erc20Abi,
              functionName: 'balanceOf',
              args: [addr],
            });
            if (cancelled) return;
            out = formatTokenAmount(v, 18, 'WETH') ?? '—';
          } else if (currencyId === 'apecoin') {
            const v = await readContract(config, {
              chainId: MAINNET,
              address: APE_MAINNET,
              abi: erc20Abi,
              functionName: 'balanceOf',
              args: [addr],
            });
            if (cancelled) return;
            out = formatTokenAmount(v, 18, 'APE') ?? '—';
          } else if (currencyId === 'wape') {
            const v = await readContract(config, {
              chainId: MAINNET,
              address: WAPE_MAINNET,
              abi: erc20Abi,
              functionName: 'balanceOf',
              args: [addr],
            });
            if (cancelled) return;
            out = formatTokenAmount(v, 18, 'WAPE') ?? '—';
          }
        } else if (cid === APECHAIN) {
          if (currencyId === 'apecoin') {
            const b = await getBalance(config, { address: addr, chainId: APECHAIN });
            if (cancelled) return;
            const n = Number(b.formatted);
            const formatted = Number.isFinite(n)
              ? n.toLocaleString(undefined, { maximumFractionDigits: 6 })
              : b.formatted;
            out = `${formatted} ${b.symbol}`;
          } else if (currencyId === 'wape') {
            const v = await readContract(config, {
              chainId: APECHAIN,
              address: WAPE_APECHAIN,
              abi: erc20Abi,
              functionName: 'balanceOf',
              args: [addr],
            });
            if (cancelled) return;
            out = formatTokenAmount(v, 18, 'WAPE') ?? '—';
          } else if (currencyId === 'eth' || currencyId === 'weth') {
            out = '—';
          }
        } else {
          out = '—';
        }

        if (!cancelled) setText(out);
      } catch {
        if (!cancelled) setText('—');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [config, address, cid, currencyId]);

  return { text };
}
