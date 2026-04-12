import { useEffect, useMemo, useState } from 'react';
import { formatUnits, isAddress } from 'viem';
import { useAccount, useChainId, useConfig } from 'wagmi';
import { getBalance } from 'wagmi/actions';

const MAINNET_ID = 1;

const ALCHEMY_KEY = import.meta.env.VITE_ALCHEMY_API_KEY;

function httpRpcCandidates() {
  const urls = [];
  if (typeof ALCHEMY_KEY === 'string' && ALCHEMY_KEY.trim()) {
    urls.push(`https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY.trim()}`);
  }
  urls.push(
    'https://ethereum.publicnode.com',
    'https://1rpc.io/eth',
    'https://eth.llamarpc.com',
    'https://cloudflare-eth.com'
  );
  return urls;
}

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

function formatWeiHex(hex) {
  const wei = BigInt(hex);
  const raw = formatUnits(wei, 18);
  const n = Number(raw);
  const formatted = Number.isFinite(n)
    ? n.toLocaleString(undefined, { maximumFractionDigits: 6 })
    : raw.slice(0, 14);
  return `${formatted} ETH`;
}

async function balanceViaInjected(provider, addr) {
  if (!provider?.request) return null;
  try {
    const hex = await provider.request({
      method: 'eth_getBalance',
      params: [addr, 'latest'],
    });
    if (typeof hex !== 'string') return null;
    return formatWeiHex(hex);
  } catch {
    return null;
  }
}

async function balanceViaHttp(addr) {
  const body = JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'eth_getBalance',
    params: [addr, 'latest'],
  });
  for (const url of httpRpcCandidates()) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
      const json = await res.json();
      if (json?.error || typeof json?.result !== 'string') continue;
      return formatWeiHex(json.result);
    } catch {
      /* try next URL */
    }
  }
  return null;
}

/**
 * Native ETH on Ethereum mainnet only. Tries, in order:
 * 1) wagmi `getBalance` (viem transport from config)
 * 2) Connected wallet provider (`connector.getProvider`) + `eth_getBalance`
 * 3) `window.ethereum` + `eth_getBalance`
 * 4) Public JSON-RPC over HTTPS (several URLs; avoids single-point CORS failures)
 */
export function useEthMainnetBalanceDisplay(address, rainbowDisplayBalance) {
  const config = useConfig();
  const chainId = useChainId();
  const { connector } = useAccount();
  const connectorId = connector?.id ?? null;

  const cid = normalizeChainId(chainId);
  const addr = typeof address === 'string' && isAddress(address) ? address : '';

  const [resolved, setResolved] = useState(null);

  useEffect(() => {
    if (!addr || cid !== MAINNET_ID) {
      setResolved(null);
      return undefined;
    }

    let cancelled = false;

    (async () => {
      let text = null;

      if (connector) {
        try {
          const p = await connector.getProvider?.();
          text = await balanceViaInjected(p, addr);
        } catch {
          /* ignore */
        }
      }

      if (!text && typeof window !== 'undefined' && window.ethereum) {
        text = await balanceViaInjected(window.ethereum, addr);
      }

      if (!text) {
        try {
          const b = await getBalance(config, { address: addr, chainId: MAINNET_ID });
          const n = Number(b.formatted);
          const num = Number.isFinite(n)
            ? n.toLocaleString(undefined, { maximumFractionDigits: 6 })
            : b.formatted;
          text = `${num} ${b.symbol}`;
        } catch {
          /* continue to HTTP */
        }
      }

      if (!text) {
        text = await balanceViaHttp(addr);
      }

      if (!cancelled) setResolved(text);
    })();

    return () => {
      cancelled = true;
    };
  }, [config, addr, cid, connectorId]);

  return useMemo(() => {
    if (cid !== MAINNET_ID) {
      return { text: '—', onEthereumMainnet: false };
    }
    if (resolved) return { text: resolved, onEthereumMainnet: true };
    if (rainbowBalanceLooksValid(rainbowDisplayBalance)) {
      return { text: rainbowDisplayBalance.trim(), onEthereumMainnet: true };
    }
    return { text: '—', onEthereumMainnet: true };
  }, [cid, rainbowDisplayBalance, resolved]);
}
