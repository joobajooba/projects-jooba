import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const LS_KEY = 'jooba_wallet_usernames';
const LS_AVATAR_KEY = 'jooba_wallet_avatars';
const LS_DETAILS_KEY = 'jooba_wallet_profile_details';
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

function readLocalDetailsMap() {
  try {
    const raw = localStorage.getItem(LS_DETAILS_KEY);
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

function writeLocalDetails(address, details) {
  const map = readLocalDetailsMap();
  map[address.toLowerCase()] = {
    ...(map[address.toLowerCase()] ?? {}),
    ...details,
  };
  localStorage.setItem(LS_DETAILS_KEY, JSON.stringify(map));
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

function isUserDataColumnMissing(error) {
  if (!error) return false;
  const msg = String(error.message ?? error.details ?? '');
  return error.code === '42703' || /column .* does not exist|could not find .* column/i.test(msg);
}

function isUsernameUniqueViolation(error) {
  if (!error) return false;
  if (error.code === '23505') return true;
  return /unique|duplicate/i.test(String(error.message ?? ''));
}

/**
 * Profile details for a wallet (Supabase user_data when available).
 */
export function useWalletProfile(address) {
  const normalized = address?.toLowerCase() ?? null;
  const [username, setUsernameState] = useState(null);
  const [profilePictureUrl, setProfilePictureUrl] = useState(null);
  const [bio, setBio] = useState('');
  const [xAccountUrl, setXAccountUrl] = useState('');
  const [loading, setLoading] = useState(Boolean(normalized));
  const [saveError, setSaveError] = useState(null);

  const applyLocalFallback = useCallback(() => {
    const map = readLocalMap();
    const av = readLocalAvatarMap();
    const details = readLocalDetailsMap();
    setUsernameState(map[normalized]?.trim() ?? '');
    setProfilePictureUrl(av[normalized]?.trim() || null);
    setBio(details[normalized]?.bio?.trim() ?? '');
    setXAccountUrl(details[normalized]?.xAccountUrl?.trim() ?? '');
  }, [normalized]);

  const refresh = useCallback(async () => {
    if (!normalized) {
      setUsernameState(null);
      setProfilePictureUrl(null);
      setBio('');
      setXAccountUrl('');
      setLoading(false);
      return;
    }
    setLoading(true);
    setSaveError(null);
    try {
      if (supabase && !skipSupabaseUserDataReads()) {
        const { data, error } = await supabase
          .from('user_data')
          .select('username, profile_picture_url, bio, x_account_url')
          .eq('wallet_address', normalized)
          .maybeSingle();
        if (isUserDataColumnMissing(error)) {
          const { data: legacyData, error: legacyError } = await supabase
            .from('user_data')
            .select('username, profile_picture_url')
            .eq('wallet_address', normalized)
            .maybeSingle();
          if (!legacyError) {
            const u = legacyData?.username?.trim() ?? '';
            const p = legacyData?.profile_picture_url?.trim() || null;
            setUsernameState(u);
            setProfilePictureUrl(p);
            setBio('');
            setXAccountUrl('');
            if (u) writeLocalUsername(normalized, u);
            if (p) writeLocalAvatar(normalized, p);
            return;
          }
        }
        if (!error) {
          const u = data?.username?.trim() ?? '';
          const p = data?.profile_picture_url?.trim() || null;
          const b = data?.bio?.trim() ?? '';
          const x = data?.x_account_url?.trim() ?? '';
          setUsernameState(u);
          setProfilePictureUrl(p);
          setBio(b);
          setXAccountUrl(x);
          if (u) writeLocalUsername(normalized, u);
          if (p) writeLocalAvatar(normalized, p);
          writeLocalDetails(normalized, { bio: b, xAccountUrl: x });
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

  const validateUsername = useCallback((raw) => {
    const trimmed = raw.trim();
    if (!normalized || !trimmed) {
      return { ok: false, message: 'Choose a username' };
    }
    if (trimmed.length < 2 || trimmed.length > 32) {
      return { ok: false, message: 'Use 2-32 characters' };
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      return { ok: false, message: 'Letters, numbers, and underscores only' };
    }
    return { ok: true, value: trimmed };
  }, [normalized]);

  const saveUsername = useCallback(
    async (raw) => {
      const usernameResult = validateUsername(raw);
      if (!usernameResult.ok) {
        setSaveError(usernameResult.message);
        return false;
      }
      const trimmed = usernameResult.value;
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
    [normalized, profilePictureUrl, validateUsername]
  );

  const saveProfileDetails = useCallback(
    async ({ username: nextUsername, bio: nextBio, xAccountUrl: nextXAccountUrl }) => {
      const usernameResult = validateUsername(nextUsername);
      if (!usernameResult.ok) {
        setSaveError(usernameResult.message);
        return false;
      }

      const trimmedBio = nextBio.trim();
      const trimmedXAccountUrl = nextXAccountUrl.trim();
      if (trimmedBio.length > 200) {
        setSaveError('Bio must be 200 characters or less');
        return false;
      }

      setSaveError(null);
      try {
        if (supabase && !skipSupabaseUserDataReads()) {
          const { error } = await supabase.from('user_data').upsert(
            {
              wallet_address: normalized,
              username: usernameResult.value,
              profile_picture_url: profilePictureUrl || null,
              bio: trimmedBio || null,
              x_account_url: trimmedXAccountUrl || null,
            },
            { onConflict: 'wallet_address' }
          );
          if (!error) {
            writeLocalUsername(normalized, usernameResult.value);
            if (profilePictureUrl) writeLocalAvatar(normalized, profilePictureUrl);
            writeLocalDetails(normalized, {
              bio: trimmedBio,
              xAccountUrl: trimmedXAccountUrl,
            });
            setUsernameState(usernameResult.value);
            setBio(trimmedBio);
            setXAccountUrl(trimmedXAccountUrl);
            return true;
          }
          if (isUsernameUniqueViolation(error)) {
            setSaveError('That username is already taken');
            return false;
          }
          if (isUserDataTableMissing(error)) {
            markSkipSupabaseUserData();
          } else {
            setSaveError(error.message || 'Could not save profile');
            return false;
          }
        }
        writeLocalUsername(normalized, usernameResult.value);
        writeLocalDetails(normalized, {
          bio: trimmedBio,
          xAccountUrl: trimmedXAccountUrl,
        });
        setUsernameState(usernameResult.value);
        setBio(trimmedBio);
        setXAccountUrl(trimmedXAccountUrl);
        return true;
      } catch (e) {
        setSaveError(e?.message ?? 'Could not save profile');
        return false;
      }
    },
    [normalized, profilePictureUrl, validateUsername]
  );

  const saveProfilePictureUrl = useCallback(
    async (url) => {
      const trimmed = url?.trim();
      if (!normalized || !trimmed) return false;
      try {
        if (supabase && !skipSupabaseUserDataReads()) {
          const { error } = await supabase.from('user_data').upsert(
            {
              wallet_address: normalized,
              username: username?.trim() || null,
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
    bio,
    xAccountUrl,
    loading,
    needsUsername,
    saveUsername,
    saveProfileDetails,
    saveProfilePictureUrl,
    saveError,
    setSaveError,
    refresh,
  };
}
