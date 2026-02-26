/**
 * Use API key as-is, or extract from full Alchemy URL if pasted by mistake.
 * @param {string | undefined} value - VITE_ALCHEMY_API_KEY_* env value
 * @returns {string | undefined}
 */
export function getAlchemyApiKey(value) {
  if (!value || typeof value !== 'string') return undefined;
  const s = value.trim();
  if (s.includes('alchemy.com') && s.includes('/v2/')) {
    const key = s.split('/v2/').pop()?.split('?').shift()?.trim();
    return key || s;
  }
  return s;
}
