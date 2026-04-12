import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const LS_KEY = 'jooba_wallet_usernames';
const LS_AVATAR_KEY = 'jooba_wallet_avatars';
const SESSION_SKIP_KEY = 'jooba_skip_supabase_user_data';

function readLocalMap() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function readLocalAvatarMap() {
  try {
    const raw = localStorage.getItem(LS_AVATAR_KEY);
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

function writeLocalAvatar(address, url) {
  const map = readLocalAvatarMap();
  map[address.toLowerCase()] = url;
  localStorage.setItem(LS_AVATAR_KEY, JSON.stringify(map));
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
 * Username + profile picture URL for a wallet (Supabase user_data when available).
 */
export function useWalletProfile(address) {
  const normalized = address?.toLowerCase() ?? null;
  const [username, setUsernameState] = useState(null);
  const [profilePictureUrl, setProfilePictureUrl] = useState(null);
  const [loading, setLoading] = useState(Boolean(normalized));
  const [saveError, setSaveError] = useState(null);

  const applyLocalFallback = useCallback(() => {
    const map = readLocalMap();
    const av = readLocalAvatarMap();
    setUsernameState(map[normalized]?.trim() ?? '');
    setProfilePictureUrl(av[normalized]?.trim() || null);
  }, [normalized]);

  const refresh = useCallback(async () => {
    if (!normalized) {
      setUsernameState(null);
      setProfilePictureUrl(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setSaveError(null);
    try {
      if (supabase && !skipSupabaseUserDataReads()) {
        const { data, error } = await supabase
          .from('user_data')
          .select('username, profile_picture_url')
          .eq('wallet_address', normalized)
          .maybeSingle();
        if (!error) {
          const u = data?.username?.trim() ?? '';
          const p = data?.profile_picture_url?.trim() || null;
          setUsernameState(u);
          setProfilePictureUrl(p);
          if (u) writeLocalUsername(normalized, u);
          if (p) writeLocalAvatar(normalized, p);
          return;
        }
        if (isUserDataTableMissing(error)) {
          markSkipSupabaseUserData();
        }
      }
      applyLocalFallback();
    } catch {
      applyLocalFallback();
    } finally {
      setLoading(false);
    }
  }, [normalized, applyLocalFallback]);

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
              profile_picture_url: profilePictureUrl || null,
            },
            { onConflict: 'wallet_address' }
          );
          if (!error) {
            writeLocalUsername(normalized, trimmed);
            if (profilePictureUrl) writeLocalAvatar(normalized, profilePictureUrl);
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
    [normalized, profilePictureUrl]
  );

  const saveProfilePictureUrl = useCallback(
    async (url) => {
      const trimmed = url?.trim();
      if (!normalized || !trimmed || !username?.trim()) return false;
      try {
        if (supabase && !skipSupabaseUserDataReads()) {
          const { error } = await supabase.from('user_data').upsert(
            {
              wallet_address: normalized,
              username: username.trim(),
              profile_picture_url: trimmed,
            },
            { onConflict: 'wallet_address' }
          );
          if (!error) {
            writeLocalAvatar(normalized, trimmed);
            setProfilePictureUrl(trimmed);
            return true;
          }
          if (isUserDataTableMissing(error)) {
            markSkipSupabaseUserData();
          } else {
            return false;
          }
        }
        writeLocalAvatar(normalized, trimmed);
        setProfilePictureUrl(trimmed);
        return true;
      } catch {
        writeLocalAvatar(normalized, trimmed);
        setProfilePictureUrl(trimmed);
        return true;
      }
    },
    [normalized, username]
  );

  return {
    username,
    profilePictureUrl,
    loading,
    needsUsername,
    saveUsername,
    saveProfilePictureUrl,
    saveError,
    setSaveError,
    refresh,
  };
}
