/** Unix seconds: calendar year 2026 UTC. */
export const SALES_2026_AFTER = Math.floor(Date.parse('2026-01-01T00:00:00.000Z') / 1000);
export const SALES_2026_BEFORE = Math.floor(Date.parse('2027-01-01T00:00:00.000Z') / 1000);

/**
 * @param {object | null | undefined} nft OpenSea event NFT payload (may include traits).
 * @returns {'m1' | 'm2' | 'other' | null}
 */
export function classifyMutantFur(nft) {
  const traits = nft?.traits;
  if (!Array.isArray(traits)) return null;
  const fur = traits.find((t) => String(t.trait_type).toLowerCase() === 'fur');
  if (!fur || fur.value == null) return null;
  const v = String(fur.value).trim().toUpperCase();
  if (v === 'M1') return 'm1';
  if (v === 'M2') return 'm2';
  return 'other';
}
