export const STAKING_DURATIONS = [
  { id: '7d', label: '7 days', days: 7, multiplier: 1 },
  { id: '30d', label: '1 month', days: 30, multiplier: 1.25 },
  { id: '180d', label: '6 months', days: 180, multiplier: 1.75 },
  { id: '365d', label: '1 year', days: 365, multiplier: 2.5 },
];

export const PAIR_BONUS = 1.25;
export const ALIGNMENT_BONUS = 1.5;
export const BASE_IMP_PER_DAY = 12;

export const TIER_BONUS = {
  'Tier 1': 1,
  'Tier 2': 1.1,
  'Tier 3': 1.2,
};

export const ALIGNMENTS = {
  Red: ['underworld', 'sunscorch', 'ashfall'],
  Green: ['verdant', 'greensward', 'mossruin'],
  Khaki: ['greensward', 'sporewild', 'mossruin'],
  Blue: ['cloudsea', 'frostbite', 'tempest', 'deepkarst'],
  Cyan: ['cloudsea', 'tempest', 'frostbite'],
  Purple: ['dreamveil', 'farvoid', 'moondust'],
  Pink: ['dreamveil', 'moondust'],
  Silver: ['stonekeep', 'farvoid'],
  Gold: ['sunscorch', 'stonekeep'],
  Diamond: ['farvoid', 'moondust', 'dreamveil'],
};

export const PREVIEW_KEEPS = [
  {
    id: 'preview-13',
    name: 'Lost Keep #13',
    tileset: 'underworld',
    seed: '0000000d',
    image: '/api/dungeon-preview?seed=0000000d&format=png',
  },
  {
    id: 'preview-14',
    name: 'Lost Keep #14',
    tileset: 'verdant',
    seed: '0000000e',
    image: '/api/dungeon-preview?seed=0000000e&format=png',
  },
  {
    id: 'preview-5',
    name: 'Lost Keep #5',
    tileset: 'frostbite',
    seed: '00000005',
    image: '/api/dungeon-preview?seed=00000005&format=png',
  },
  {
    id: 'preview-11',
    name: 'Lost Keep #11',
    tileset: 'sunscorch',
    seed: '0000000b',
    image: '/api/dungeon-preview?seed=0000000b&format=png',
  },
  {
    id: 'preview-3',
    name: 'Lost Keep #3',
    tileset: 'dreamveil',
    seed: '00000003',
    image: '/api/dungeon-preview?seed=00000003&format=png',
  },
  {
    id: 'preview-10',
    name: 'Lost Keep #10',
    tileset: 'stonekeep',
    seed: '0000000a',
    image: '/api/dungeon-preview?seed=0000000a&format=png',
  },
];

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
