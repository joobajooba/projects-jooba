import { useEffect, useMemo, useState } from 'react';
import { isAddress } from 'viem';
import { useConfig } from 'wagmi';
import { getBalance } from 'wagmi/actions';
import { apeChain } from '../lib/walletConfig';

/**
 * Native ApeCoin (APE) on ApeChain only — always reads chain 33139 via wagmi config RPC,
 * independent of the wallet’s currently selected network.
 */
export function useApeChainBalanceDisplay(address) {
  const config = useConfig();
  const addr = typeof address === 'string' && isAddress(address) ? address : '';
  const [resolved, setResolved] = useState(null);

  useEffect(() => {
    if (!addr) {
      setResolved(null);
      return undefined;
    }

    let cancelled = false;

    (async () => {
      try {
        const b = await getBalance(config, { address: addr, chainId: apeChain.id });
        const n = Number(b.formatted);
        const num = Number.isFinite(n)
          ? n.toLocaleString(undefined, { maximumFractionDigits: 6 })
          : b.formatted;
        if (!cancelled) setResolved(`${num} ${b.symbol}`);
      } catch {
        if (!cancelled) setResolved(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [config, addr]);

  return useMemo(() => ({ text: resolved ?? '—' }), [resolved]);
}
