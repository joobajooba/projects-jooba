import { supabase } from './lib/supabase';

export async function ensureProfile(ownerWallet, { username } = {}) {
  if (!supabase || !ownerWallet) return null;
  const normalized = ownerWallet.toLowerCase();
  const payload = {
    owner_wallet: normalized,
    username: username || null,
  };
  const { data, error } = await supabase
    .from('profiles')
    .upsert(payload, { onConflict: 'owner_wallet' })
    .select('id, owner_wallet, username, bio, avatar_url, x_username, layout_json, created_at')
    .maybeSingle();
  if (error) {
    console.warn('[profileBuilderApi] ensureProfile failed', error);
    return null;
  }
  return data || null;
}

export async function fetchProfileByWallet(ownerWallet) {
  if (!supabase || !ownerWallet) return null;
  const normalized = ownerWallet.toLowerCase();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, owner_wallet, username, bio, avatar_url, x_username, layout_json, created_at')
    .eq('owner_wallet', normalized)
    .maybeSingle();
  if (error) {
    console.warn('[profileBuilderApi] fetchProfileByWallet failed', error);
    return null;
  }
  return data || null;
}

export async function updateProfile(ownerWallet, updates) {
  if (!supabase || !ownerWallet) return { ok: false };
  const normalized = ownerWallet.toLowerCase();
  const { error } = await supabase.from('profiles').update(updates).eq('owner_wallet', normalized);
  if (error) {
    console.warn('[profileBuilderApi] updateProfile failed', error);
    return { ok: false, error };
  }
  return { ok: true };
}

export async function incrementProfileView(profileId) {
  if (!supabase || !profileId) return;
  const { error } = await supabase.from('profile_views').insert({ profile_id: profileId });
  if (error) console.warn('[profileBuilderApi] incrementProfileView failed', error);
}

export async function fetchProfileViewsCount(profileId) {
  if (!supabase || !profileId) return 0;
  const { count, error } = await supabase
    .from('profile_views')
    .select('id', { count: 'exact', head: true })
    .eq('profile_id', profileId);
  if (error) {
    console.warn('[profileBuilderApi] fetchProfileViewsCount failed', error);
    return 0;
  }
  return count || 0;
}

