import { useEffect, useMemo, useState } from 'react';
import { formatUnits } from 'viem';
import { useChainId } from 'wagmi';

const MAINNET_ID = 1;
/** Same public RPC as `walletConfig` mainnet — works without `window.ethereum`. */
const ETH_RPC = 'https://cloudflare-eth.com';

function normalizeChainId(chainId) {
  if (chainId == null) return undefined;
  if (typeof chainId === 'bigint') return Number(chainId);
  const n = Number(chainId);
  return Number.isFinite(n) ? n : undefined;
}

function rainbowBalanceLooksValid(s) {
  if (typeof s !== 'string') return false;
  const t = s.trim();
  if (!t) return false;
  if (t === '—' || t === '-' || t === '…' || t === '...') return false;
  return /\d/.test(t);
}

/**
 * Native ETH balance on Ethereum mainnet only. Uses Rainbow `displayBalance` when it looks valid,
 * otherwise `eth_getBalance` over HTTPS (no wallet provider).
 */
export function useEthMainnetBalanceDisplay(address, rainbowDisplayBalance) {
  const chainId = useChainId();
  const cid = normalizeChainId(chainId);
  const addr = typeof address === 'string' ? address.trim() : '';
  const [fromRpc, setFromRpc] = useState(null);

  useEffect(() => {
    if (!addr || cid !== MAINNET_ID) {
      setFromRpc(null);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(ETH_RPC, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'eth_getBalance',
            params: [addr, 'latest'],
          }),
        });
        const json = await res.json();
        if (cancelled || !json || json.error || typeof json.result !== 'string') {
          if (!cancelled) setFromRpc(null);
          return;
        }
        const wei = BigInt(json.result);
        const raw = formatUnits(wei, 18);
        const n = Number(raw);
        const formatted = Number.isFinite(n)
          ? n.toLocaleString(undefined, { maximumFractionDigits: 6 })
          : raw.slice(0, 14);
        if (!cancelled) setFromRpc(`${formatted} ETH`);
      } catch {
        if (!cancelled) setFromRpc(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [addr, cid]);

  return useMemo(() => {
    if (cid !== MAINNET_ID) {
      return { text: '—', onEthereumMainnet: false };
    }
    if (fromRpc) return { text: fromRpc, onEthereumMainnet: true };
    if (rainbowBalanceLooksValid(rainbowDisplayBalance)) {
      return { text: rainbowDisplayBalance.trim(), onEthereumMainnet: true };
    }
    return { text: '—', onEthereumMainnet: true };
  }, [cid, rainbowDisplayBalance, fromRpc]);
}
