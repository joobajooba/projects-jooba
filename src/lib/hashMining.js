export const HASH_PREFIX = '0000';
/** Extra hex nibble must be 0–6 (~1/149,800 hashes; slightly easier than 0–5). */
export const HASH_NEXT_NIBBLE_MAX = 6;
export const MINE_PAYLOAD_PREFIX = 'implingz-dungeon';

/** Hashes checked per mining tick for each IMPLINGz Tier trait. */
export const TIER_HASH_RATES = {
  'Tier 1': 3,
  'Tier 2': 6,
  'Tier 3': 12,
};

export function miningPayload(sessionId, nonce) {
  return `${MINE_PAYLOAD_PREFIX}:${sessionId}:${nonce}`;
}

export async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function isWinningHash(hash) {
  const hex = String(hash).toLowerCase();
  if (!hex.startsWith(HASH_PREFIX)) return false;
  const extra = Number.parseInt(hex.charAt(HASH_PREFIX.length) || 'f', 16);
  return Number.isFinite(extra) && extra <= HASH_NEXT_NIBBLE_MAX;
}

/** Normalize Tier trait text from collection JSON / metadata into "Tier 1|2|3". */
export function normalizeImplingTier(value) {
  const text = String(value ?? '').trim();
  if (!text) return '';

  const numbered = text.match(/tier\s*([123])/i);
  if (numbered) return `Tier ${numbered[1]}`;

  if (/^t\s*3$/i.test(text) || text === '3') return 'Tier 3';
  if (/^t\s*2$/i.test(text) || text === '2') return 'Tier 2';
  if (/^t\s*1$/i.test(text) || text === '1') return 'Tier 1';

  return '';
}

function tierFromAttributesObject(attributes) {
  if (!attributes || typeof attributes !== 'object') return '';
  if (!Array.isArray(attributes)) {
    return normalizeImplingTier(attributes.Tier ?? attributes.tier);
  }

  for (const entry of attributes) {
    const traitType = String(entry?.trait_type ?? entry?.traitType ?? entry?.key ?? '');
    if (/^tier$/i.test(traitType)) {
      return normalizeImplingTier(entry?.value ?? entry?.trait_value);
    }
  }
  return '';
}

/**
 * Resolve an Imp's Tier from selected party data and/or collection metadata.
 * Prefer the explicit `tier` field, then attributes.Tier / metadata attributes.
 */
export function resolveImplingTier(impling) {
  if (!impling) return '';

  return (
    normalizeImplingTier(impling.tier) ||
    tierFromAttributesObject(impling.attributes) ||
    tierFromAttributesObject(impling.metadata?.attributes) ||
    ''
  );
}

export function hashesPerTickForParty(party = []) {
  return party.reduce((total, impling) => {
    const tier = resolveImplingTier(impling);
    return total + (TIER_HASH_RATES[tier] ?? TIER_HASH_RATES['Tier 1']);
  }, 0);
}

export async function mineHashBatch({ sessionId, startNonce, count }) {
  let nonce = Number(startNonce) || 0;
  const safeCount = Math.max(1, Number(count) || 1);

  for (let index = 0; index < safeCount; index += 1) {
    const hash = await sha256Hex(miningPayload(sessionId, nonce));
    if (isWinningHash(hash)) {
      return { nonce, hash, checked: index + 1, found: true };
    }
    nonce += 1;
  }

  return { nonce, hash: '', checked: safeCount, found: false };
}
