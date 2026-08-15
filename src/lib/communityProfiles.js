const COMMUNITY_PROFILES_API =
  'https://jitkwbatwymqtlzxiyil.supabase.co/functions/v1/community-profiles';

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

export async function fetchCommunityProfiles({ walletAddress = '', signal } = {}) {
  const url = new URL(COMMUNITY_PROFILES_API);
  if (walletAddress) url.searchParams.set('wallet', walletAddress);

  const response = await fetch(url, { signal });
  const data = await readResponse(response);
  return data.profiles ?? [];
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
