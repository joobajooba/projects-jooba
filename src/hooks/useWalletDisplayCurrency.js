import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_WALLET_CURRENCY_ID, WALLET_CURRENCIES } from '../constants/walletCurrencies';

const LS_KEY = 'jooba_wallet_display_currency';

const VALID = new Set(WALLET_CURRENCIES.map((c) => c.id));

function readStored() {
  try {
    const v = localStorage.getItem(LS_KEY);
    if (v && VALID.has(v)) return v;
  } catch {
    /* ignore */
  }
  return DEFAULT_WALLET_CURRENCY_ID;
}

export function useWalletDisplayCurrency() {
  const [currencyId, setCurrencyIdState] = useState(readStored);

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === LS_KEY && e.newValue && VALID.has(e.newValue)) {
        setCurrencyIdState(e.newValue);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setCurrencyId = useCallback((id) => {
    if (!VALID.has(id)) return;
    setCurrencyIdState(id);
    try {
      localStorage.setItem(LS_KEY, id);
    } catch {
      /* ignore */
    }
  }, []);

  const meta = WALLET_CURRENCIES.find((c) => c.id === currencyId) ?? WALLET_CURRENCIES[0];

  return { currencyId, setCurrencyId, meta, currencies: WALLET_CURRENCIES };
}
