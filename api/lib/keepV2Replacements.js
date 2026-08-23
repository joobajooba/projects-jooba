/** Wallet-bound V2 replacement mints for voided V1 keeps that should keep their 1-of-1 traits. */

export const KEEP_V2_REPLACEMENTS = [
  {
    wallet: '0xe1f381e1e7a32c75ac64fcfcb1c453628a1a5166',
    v1TokenId: 1947,
    miniBoss: 'Bun Bun',
    seedHex: '0x0000244dc2ac4374ecf0f30773fb2415c5773b24c32df3f962f2533ffd54f060',
  },
];

export function normalizeKeepSeedHex(seed) {
  try {
    return `0x${BigInt(seed).toString(16).padStart(64, '0')}`;
  } catch {
    const hex = String(seed || '')
      .trim()
      .toLowerCase()
      .replace(/^0x/, '');
    if (/^[0-9a-f]+$/.test(hex)) return `0x${hex.padStart(64, '0')}`;
    return '';
  }
}

export function replacementForWallet(walletAddress) {
  const wallet = String(walletAddress || '').toLowerCase();
  return KEEP_V2_REPLACEMENTS.find((row) => row.wallet === wallet) || null;
}

export function replacementSourceTokenId(seed) {
  const hex = normalizeKeepSeedHex(seed);
  if (!hex) return null;
  const match = KEEP_V2_REPLACEMENTS.find((row) => row.seedHex === hex);
  return match ? match.v1TokenId : null;
}
