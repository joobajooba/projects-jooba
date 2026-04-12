import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const LS_KEY = 'jooba_wallet_usernames';

function readLocalMap() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeLocalUsername(address, username) {
  const map = readLocalMap();
  map[address.toLowerCase()] = username;
  localStorage.setItem(LS_KEY, JSON.stringify(map));
}

/**
 * Loads / saves display username for a connected wallet (Supabase user_data when configured).
 */
export function useWalletProfile(address) {
  const normalized = address?.toLowerCase() ?? null;
  const [username, setUsernameState] = useState(null);
  const [loading, setLoading] = useState(Boolean(normalized));
  const [saveError, setSaveError] = useState(null);

  const refresh = useCallback(async () => {
    if (!normalized) {
      setUsernameState(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setSaveError(null);
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('user_data')
          .select('username')
          .eq('wallet_address', normalized)
          .maybeSingle();
        if (error) throw error;
        const u = data?.username?.trim() ?? '';
        setUsernameState(u);
        if (u) writeLocalUsername(normalized, u);
      } else {
        const map = readLocalMap();
        setUsernameState(map[normalized]?.trim() ?? '');
      }
    } catch {
      const map = readLocalMap();
      setUsernameState(map[normalized]?.trim() ?? '');
    } finally {
      setLoading(false);
    }
  }, [normalized]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const needsUsername = Boolean(normalized) && !loading && !username;

  const saveUsername = useCallback(
    async (raw) => {
      const trimmed = raw.trim();
      if (!normalized || !trimmed) {
        setSaveError('Choose a username');
        return false;
      }
      if (trimmed.length < 2 || trimmed.length > 32) {
        setSaveError('Use 2–32 characters');
        return false;
      }
      if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
        setSaveError('Letters, numbers, and underscores only');
        return false;
      }
      setSaveError(null);
      try {
        if (supabase) {
          const { error } = await supabase.from('user_data').upsert(
            {
              wallet_address: normalized,
              username: trimmed,
            },
            { onConflict: 'wallet_address' }
          );
          if (error) {
            if (error.code === '23505' || /unique|duplicate/i.test(error.message ?? '')) {
              setSaveError('That username is already taken');
            } else {
              setSaveError(error.message || 'Could not save');
            }
            return false;
          }
        }
        writeLocalUsername(normalized, trimmed);
        setUsernameState(trimmed);
        return true;
      } catch (e) {
        setSaveError(e?.message ?? 'Could not save');
        return false;
      }
    },
    [normalized]
  );

  return {
    username,
    loading,
    needsUsername,
    saveUsername,
    saveError,
    setSaveError,
    refresh,
  };
}
