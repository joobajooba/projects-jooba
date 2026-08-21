export const STAKING_DURATIONS = [
  { id: '7d', label: '7 days', days: 7, multiplier: 1 },
  { id: '30d', label: '1 month', days: 30, multiplier: 1.25 },
  { id: '180d', label: '6 months', days: 180, multiplier: 1.75 },
  { id: '365d', label: '1 year', days: 365, multiplier: 2.5 },
];

export const PAIR_BONUS = 1.25;
export const ALIGNMENT_BONUS = 1.5;
export const BASE_IMP_PER_DAY = 12;

/** Live collections used by the staking UI (read-only until $IMP staking ships). */
export const STAKING_IMPLINGZ_ADDRESS = '0x81D2D1f0e92285CdD22Aa3cbc6956B6E1724d029';
export const STAKING_KEEP_ADDRESS = '0x639061b01ab4261b4283a0AC9D3bB8B99013Bad4';

export const TIER_BONUS = {
  'Tier 1': 1,
  'Tier 2': 1.1,
  'Tier 3': 1.2,
};

export const ALIGNMENTS = {
  Red: ['underworld', 'volcano', 'desert'],
  Green: ['plains', 'mossy', 'forgotten_ruins'],
  Khaki: ['mossy', 'mushroom', 'forgotten_ruins'],
  Blue: ['clouds', 'icy', 'storm', 'limestone'],
  Cyan: ['clouds', 'storm', 'icy'],
  Purple: ['shortcake', 'dreamcore', 'void', 'lunar'],
  Pink: ['shortcake', 'dreamcore', 'lunar'],
  Silver: ['castle', 'the_vault', 'void'],
  Gold: ['desert', 'castle', 'the_vault'],
  Diamond: ['void', 'lunar', 'dreamcore'],
};

export function alignedTilesets(body) {
  return ALIGNMENTS[body] ?? [];
}

export function isAlignedPair(body, tileset) {
  return alignedTilesets(body).includes(String(tileset || '').toLowerCase());
}

export function estimateStake(imp, keep, duration) {
  const tierMultiplier = TIER_BONUS[imp?.tier] || 1;
  const pairMultiplier = keep ? PAIR_BONUS : 1;
  const aligned = Boolean(keep && isAlignedPair(imp?.body, keep.tileset));
  const alignmentMultiplier = aligned ? ALIGNMENT_BONUS : 1;
  const durationMultiplier = duration?.multiplier || 1;
  const days = duration?.days || 0;
  const payout = Math.round(
    BASE_IMP_PER_DAY * days * durationMultiplier * pairMultiplier * alignmentMultiplier * tierMultiplier
  );

  return {
    days,
    tierMultiplier,
    pairMultiplier,
    aligned,
    alignmentMultiplier,
    durationMultiplier,
    payout,
  };
}
