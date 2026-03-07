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
    .select('username, profile_picture_url, first_logged_in_at, profile_bio, profile_picture_border, mosaic_size, mosaic_urls, x_twitter_id, x_username, username_changed_at')
    .eq('wallet_address', normalized)
    .maybeSingle();
  if (error) {
    // Try fallback with X columns in case only some columns (e.g. mosaic) were missing
    const fallbackWithX = await supabase.from(TABLE).select('username, profile_picture_url, first_logged_in_at, x_twitter_id, x_username').eq('wallet_address', normalized).maybeSingle();
    if (!fallbackWithX.error && fallbackWithX.data) {
      const d = fallbackWithX.data;
      return { username: d.username ?? '', profilePictureUrl: d.profile_picture_url ?? '', firstLoggedInAt: d.first_logged_in_at ?? null, profileBio: '', profilePictureBorder: '', mosaicSize: null, mosaicUrls: [], xTwitterId: d.x_twitter_id ?? null, xUsername: d.x_username ?? null, usernameChangedAt: d.username_changed_at ?? null };
    }
    const fallback = await supabase.from(TABLE).select('username, profile_picture_url, first_logged_in_at').eq('wallet_address', normalized).maybeSingle();
    if (fallback.error) {
      console.warn('[userData] fetchUserProfile failed', error);
      return null;
    }
    const d = fallback.data;
    return d ? { username: d.username ?? '', profilePictureUrl: d.profile_picture_url ?? '', firstLoggedInAt: d.first_logged_in_at ?? null, profileBio: '', profilePictureBorder: '', mosaicSize: null, mosaicUrls: [], xTwitterId: null, xUsername: null, usernameChangedAt: d.username_changed_at ?? null } : null;
  }
  if (!data) return null;
  const urls = data.mosaic_urls;
  return {
    username: data.username ?? '',
    profilePictureUrl: data.profile_picture_url ?? '',
    firstLoggedInAt: data.first_logged_in_at ?? null,
    profileBio: data.profile_bio ?? '',
    profilePictureBorder: data.profile_picture_border ?? '',
    mosaicSize: data.mosaic_size ?? null,
    mosaicUrls: Array.isArray(urls) ? urls : [],
    xTwitterId: data.x_twitter_id ?? null,
    xUsername: data.x_username ?? null,
    usernameChangedAt: data.username_changed_at ?? null,
  };
}

/** Returns true if another user (not excludeWalletAddress) has this username (case-insensitive). Empty username is not taken. */
export async function isUsernameTaken(proposedUsername, excludeWalletAddress) {
  if (!supabase) return false;
  const trimmed = (proposedUsername || '').trim();
  if (!trimmed) return false;
  const normalizedExclude = excludeWalletAddress ? excludeWalletAddress.toLowerCase() : null;
  let query = supabase.from(TABLE).select('wallet_address').ilike('username', trimmed).limit(1);
  if (normalizedExclude) query = query.neq('wallet_address', normalizedExclude);
  const { data, error } = await query;
  if (error) {
    console.warn('[userData] isUsernameTaken failed', error);
    return true;
  }
  return !!(data && data.length > 0);
}

export async function updateUserProfile(walletAddress, { username, profilePictureUrl, profileBio, profilePictureBorder, setUsernameChangedAt }) {
  if (!supabase || !walletAddress) return;
  const normalized = walletAddress.toLowerCase();
  const payload = {
    wallet_address: normalized,
    username: username ?? null,
    profile_picture_url: profilePictureUrl ?? null,
  };
  if (profileBio !== undefined) payload.profile_bio = profileBio || null;
  if (profilePictureBorder !== undefined) payload.profile_picture_border = profilePictureBorder || null;
  if (setUsernameChangedAt) payload.username_changed_at = new Date().toISOString();
  const { error } = await supabase.from(TABLE).upsert(payload, { onConflict: 'wallet_address' });
  if (error) {
    if (error.code === '42703') {
      delete payload.profile_bio;
      delete payload.profile_picture_border;
      delete payload.username_changed_at;
      const { error: err2 } = await supabase.from(TABLE).upsert(payload, { onConflict: 'wallet_address' });
      if (err2) console.warn('[userData] updateUserProfile failed', err2);
    } else if (error.code === '23505') {
      throw new Error('username_taken');
    } else {
      console.warn('[userData] updateUserProfile failed', error);
    }
  }
}

export async function updateUserXLink(walletAddress, { xTwitterId, xUsername }) {
  if (!supabase || !walletAddress) return;
  const normalized = walletAddress.toLowerCase();
  const payload = { x_twitter_id: xTwitterId ?? null, x_username: xUsername ?? null };
  const { error } = await supabase.from(TABLE).update(payload).eq('wallet_address', normalized);
  if (error) {
    if (error.code === '42703') {
      console.warn('[userData] updateUserXLink: x columns missing, run add_user_data_x_twitter.sql');
    } else {
      console.warn('[userData] updateUserXLink failed', error);
    }
  }
}

export async function saveUserMosaic(walletAddress, { mosaicSize, mosaicUrls }) {
  if (!supabase || !walletAddress) return;
  const normalized = walletAddress.toLowerCase();
  const payload = {
    mosaic_size: mosaicSize ?? null,
    mosaic_urls: Array.isArray(mosaicUrls) ? mosaicUrls : null,
  };
  const { error } = await supabase.from(TABLE).update(payload).eq('wallet_address', normalized);
  if (error) {
    if (error.code === '42703') {
      console.warn('[userData] saveUserMosaic: mosaic columns missing, run add_user_data_mosaic.sql');
    } else {
      console.warn('[userData] saveUserMosaic failed', error);
    }
  }
}
