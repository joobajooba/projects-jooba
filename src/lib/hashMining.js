export const HASH_PREFIX = '0000';
export const MINE_PAYLOAD_PREFIX = 'implingz-dungeon';

export function miningPayload(sessionId, nonce) {
  return `${MINE_PAYLOAD_PREFIX}:${sessionId}:${nonce}`;
}

export async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function isWinningHash(hash) {
  return String(hash).startsWith(HASH_PREFIX);
}

export function hashesPerTickForParty(party = []) {
  return party.reduce((total, impling) => {
    if (impling?.tier === 'Tier 3') return total + 48;
    if (impling?.tier === 'Tier 2') return total + 24;
    return total + 12;
  }, 0);
}

export async function mineHashBatch({ sessionId, startNonce, count }) {
  let nonce = Number(startNonce) || 0;

  for (let index = 0; index < count; index += 1) {
    const hash = await sha256Hex(miningPayload(sessionId, nonce));
    if (isWinningHash(hash)) {
      return { nonce, hash, checked: index + 1, found: true };
    }
    nonce += 1;
  }

  return { nonce, hash: '', checked: count, found: false };
}
