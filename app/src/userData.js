/**
 * Supabase user_data: wallet address, username, profile picture, first login time.
 * Ensures a row on connect (first_logged_in_at set once), and updates profile when user saves.
 */

import { supabase } from './lib/supabase';

const TABLE = 'user_data';

export async function ensureUserRow(walletAddress) {
  if (!supabase || !walletAddress) return;
  const normalized = walletAddress.toLowerCase();
  const { error } = await supabase.from(TABLE).upsert(
    {
      wallet_address: normalized,
      username: null,
      profile_picture_url: null,
    },
    {
      onConflict: 'wallet_address',
      ignoreDuplicates: false,
      // Supabase upsert: by default updates all columns. We must not overwrite first_logged_in_at.
      // So we only pass columns we're ok to set on update; first_logged_in_at has default now() on insert.
      // For "ensure row exists" we only want to INSERT if missing. If we upsert with same data, Postgres
      // will update first_logged_in_at to... no, default is only on insert. So on conflict do update
      // will set username and profile_picture_url to null and overwrite existing profile. Bad.
      // So we need: insert if not exists, else do nothing. Supabase has .upsert(..., { onConflict, ignoreDuplicates: true }).
      // If ignoreDuplicates: true, on conflict it does nothing (no update). So first_logged_in_at stays.
      // Then we'd need a separate "update profile" path that only updates username and profile_picture_url.
      ignoreDuplicates: true,
    }
  );
  if (error) console.warn('[userData] ensureUserRow failed', error);
}

export async function fetchUserProfile(walletAddress) {
  if (!supabase || !walletAddress) return null;
  const normalized = walletAddress.toLowerCase();
  const { data, error } = await supabase
    .from(TABLE)
    .select('username, profile_picture_url, first_logged_in_at, profile_bio')
    .eq('wallet_address', normalized)
    .maybeSingle();
  if (error) {
    console.warn('[userData] fetchUserProfile failed', error);
    return null;
  }
  if (!data) return null;
  return {
    username: data.username ?? '',
    profilePictureUrl: data.profile_picture_url ?? '',
    firstLoggedInAt: data.first_logged_in_at ?? null,
    profileBio: data.profile_bio ?? '',
  };
}

export async function updateUserProfile(walletAddress, { username, profilePictureUrl, profileBio }) {
  if (!supabase || !walletAddress) return;
  const normalized = walletAddress.toLowerCase();
  const payload = {
    wallet_address: normalized,
    username: username ?? null,
    profile_picture_url: profilePictureUrl ?? null,
  };
  if (profileBio !== undefined) payload.profile_bio = profileBio || null;
  const { error } = await supabase.from(TABLE).upsert(payload, { onConflict: 'wallet_address' });
  if (error) console.warn('[userData] updateUserProfile failed', error);
}
