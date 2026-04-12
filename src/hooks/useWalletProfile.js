import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const LS_KEY = 'jooba_wallet_usernames';
const SESSION_SKIP_KEY = 'jooba_skip_supabase_user_data';

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

function skipSupabaseUserDataReads() {
  try {
    return sessionStorage.getItem(SESSION_SKIP_KEY) === '1';
  } catch {
    return false;
  }
}

function markSkipSupabaseUserData() {
  try {
    sessionStorage.setItem(SESSION_SKIP_KEY, '1');
  } catch {
    /* ignore */
  }
}

/** PostgREST / Postgres when `user_data` was never migrated in the Supabase project. */
function isUserDataTableMissing(error) {
  if (!error) return false;
  const msg = String(error.message ?? error.details ?? '');
  const code = error.code;
  return (
    code === 'PGRST205' ||
    code === '42P01' ||
    /schema cache|could not find.*table|does not exist/i.test(msg)
  );
}

function isUsernameUniqueViolation(error) {
  if (!error) return false;
  if (error.code === '23505') return true;
  return /unique|duplicate/i.test(String(error.message ?? ''));
}

/**
 * Loads / saves display username for a connected wallet (Supabase user_data when available).
 * Falls back to localStorage if the table is missing or Supabase is not configured.
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
      if (supabase && !skipSupabaseUserDataReads()) {
        const { data, error } = await supabase
          .from('user_data')
          .select('username')
          .eq('wallet_address', normalized)
          .maybeSingle();
        if (!error) {
          const u = data?.username?.trim() ?? '';
          setUsernameState(u);
          if (u) writeLocalUsername(normalized, u);
          return;
        }
        if (isUserDataTableMissing(error)) {
          markSkipSupabaseUserData();
        }
      }
      const map = readLocalMap();
      setUsernameState(map[normalized]?.trim() ?? '');
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
        if (supabase && !skipSupabaseUserDataReads()) {
          const { error } = await supabase.from('user_data').upsert(
            {
              wallet_address: normalized,
              username: trimmed,
            },
            { onConflict: 'wallet_address' }
          );
          if (!error) {
            writeLocalUsername(normalized, trimmed);
            setUsernameState(trimmed);
            return true;
          }
          if (isUsernameUniqueViolation(error)) {
            setSaveError('That username is already taken');
            return false;
          }
          if (isUserDataTableMissing(error)) {
            markSkipSupabaseUserData();
          } else {
            setSaveError(error.message || 'Could not save');
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
