/**
 * Persist profile (username, profilePictureUrl) per wallet address in localStorage.
 */
const KEY_PREFIX = 'app-profile-';

function key(address) {
  if (!address || typeof address !== 'string') return null;
  return KEY_PREFIX + address.toLowerCase();
}

export function loadProfile(address) {
  const k = key(address);
  if (!k) return null;
  try {
    const raw = localStorage.getItem(k);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return {
      username: data.username ?? '',
      profilePictureUrl: data.profilePictureUrl ?? '',
    };
  } catch {
    return null;
  }
}

export function saveProfile(address, profile) {
  const k = key(address);
  if (!k) return;
  try {
    const existing = loadProfile(address) || {};
    const next = {
      username: profile.username ?? existing.username,
      profilePictureUrl: profile.profilePictureUrl ?? existing.profilePictureUrl,
    };
    localStorage.setItem(k, JSON.stringify(next));
  } catch {
    // ignore
  }
}
