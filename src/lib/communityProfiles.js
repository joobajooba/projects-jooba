const COMMUNITY_PROFILES_API =
  'https://jitkwbatwymqtlzxiyil.supabase.co/functions/v1/community-profiles';
const COMMUNITY_PROFILES_DB =
  'https://jitkwbatwymqtlzxiyil.supabase.co/rest/v1/community_profiles';
const COMMUNITY_PROFILES_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppdGt3YmF0d3ltcXRsenhpeWlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMzYxNjQsImV4cCI6MjA4NjgxMjE2NH0.0rDEnkYYAQpboD707PQ0QPptqhrU-TqEweoVZXbBYMo';

async function readResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'The community profile service is unavailable.');
  }
  return data;
}

export function buildProfileSignatureMessage({
  walletAddress,
  nickname,
  bio,
  avatarTokenId,
  nonce,
}) {
  return `IMPLINGz Community Profile\n${JSON.stringify({
    walletAddress: walletAddress.toLowerCase(),
    nickname,
    bio,
    avatarTokenId: avatarTokenId || null,
    nonce,
  })}`;
}

export function formatAccountCreatedAt(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

async function fetchCommunityProfilesFromDb({ walletAddress = '', signal } = {}) {
  const url = new URL(COMMUNITY_PROFILES_DB);
  url.searchParams.set(
    'select',
    'wallet_address,nickname,bio,avatar_token_id,total_implingz,tier_1_count,tier_2_count,tier_3_count,created_at,updated_at'
  );
  url.searchParams.set('order', 'created_at.asc');
  if (walletAddress) url.searchParams.set('wallet_address', `eq.${String(walletAddress).toLowerCase()}`);
  const response = await fetch(url, {
    signal,
    headers: {
      apikey: COMMUNITY_PROFILES_KEY,
      Authorization: `Bearer ${COMMUNITY_PROFILES_KEY}`,
    },
  });
  const rows = await response.json().catch(() => []);
  return response.ok && Array.isArray(rows) ? rows : [];
}

export async function fetchCommunityProfiles({ walletAddress = '', signal } = {}) {
  const url = new URL(COMMUNITY_PROFILES_API);
  if (walletAddress) url.searchParams.set('wallet', walletAddress);

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    const data = await readResponse(response);
    if (Array.isArray(data.profiles)) return data.profiles;
  } catch (error) {
    if (signal?.aborted) throw error;
  }

  return fetchCommunityProfilesFromDb({ walletAddress, signal });
}

export async function requestProfileChallenge(walletAddress) {
  const response = await fetch(COMMUNITY_PROFILES_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'challenge',
      walletAddress,
    }),
  });
  return readResponse(response);
}

export async function saveCommunityProfile({
  walletAddress,
  nickname,
  bio,
  avatarTokenId,
  nonce,
  signature,
}) {
  const response = await fetch(COMMUNITY_PROFILES_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'save',
      walletAddress,
      nickname,
      bio,
      avatarTokenId: avatarTokenId || null,
      nonce,
      signature,
    }),
  });
  return readResponse(response);
}
