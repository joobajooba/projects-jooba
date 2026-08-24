export const STAKING_IMPLINGZ_ADDRESS = '0x81D2D1f0e92285CdD22Aa3cbc6956B6E1724d029';
export const STAKING_KEEP_V1_ADDRESS = '0x639061b01ab4261b4283a0AC9D3bB8B99013Bad4';
export const STAKING_KEEP_V2_ADDRESS = '0x51eA8743109F1b9C70C9d1a9A56cCaA5C2877ee9';

export const BASE_IMPCOIN_PER_DAY = 10;
export const KEEP_PAIR_BONUS = 0.18;
export const KEEP_ALIGNMENT_BONUS = 0.32;

export const STAKING_DURATIONS = [
  { id: '7d', label: '7 days', days: 7, multiplier: 1 },
  { id: '14d', label: '2 weeks', days: 14, multiplier: 1.12 },
  { id: '30d', label: '1 month', days: 30, multiplier: 1.28 },
  { id: '90d', label: '3 months', days: 90, multiplier: 1.5 },
  { id: '180d', label: '6 months', days: 180, multiplier: 1.8 },
  { id: '365d', label: '1 year', days: 365, multiplier: 2.25 },
];

export const TIER_BONUS = {
  'Tier 1': 1,
  'Tier 2': 1.12,
  'Tier 3': 1.28,
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

export const CANVAS_LAYOUTS = {
  pair: {
    id: 'pair',
    label: '1–1',
    title: 'Pair canvas',
    description: 'Imp on the left, one Keep on the right.',
    keepCount: 1,
    cols: 2,
    rows: 1,
    multiplier: 1,
    cells: ['imp', 'right'],
    keepSlots: ['right'],
  },
  cross: {
    id: 'cross',
    label: 'Cross',
    title: 'Cross canvas',
    description: 'Imp in the center, four Keeps north, east, south, and west.',
    keepCount: 4,
    cols: 3,
    rows: 3,
    multiplier: 1.12,
    cells: [null, 'north', null, 'west', 'imp', 'east', null, 'south', null],
    keepSlots: ['north', 'east', 'south', 'west'],
  },
  nine: {
    id: 'nine',
    label: '9-cell',
    title: '9-cell canvas',
    description: 'Imp in the center, eight Keeps around it.',
    keepCount: 8,
    cols: 3,
    rows: 3,
    multiplier: 1.25,
    cells: ['nw', 'north', 'ne', 'west', 'imp', 'east', 'sw', 'south', 'se'],
    keepSlots: ['nw', 'north', 'ne', 'west', 'east', 'sw', 'south', 'se'],
  },
};

export function alignedTilesets(body) {
  return ALIGNMENTS[body] ?? [];
}

export function isAlignedPair(body, tileset) {
  return alignedTilesets(body).includes(String(tileset || '').toLowerCase());
}

export function tokenKey(contract, tokenId) {
  return `${String(contract || '').toLowerCase()}:${String(tokenId)}`;
}

export function durationById(durationId) {
  return STAKING_DURATIONS.find((item) => item.id === durationId) ?? STAKING_DURATIONS[0];
}

export function canvasById(canvasId) {
  return CANVAS_LAYOUTS[canvasId] ?? CANVAS_LAYOUTS.pair;
}

export function estimateStake({ imp, keeps, canvas, duration }) {
  const layout = canvas?.id ? canvas : canvasById(canvas);
  const lock = duration?.id ? duration : durationById(duration);
  const keepList = (keeps ?? []).filter(Boolean);
  const alignedCount = keepList.filter((keep) => isAlignedPair(imp?.body, keep.tileset)).length;
  const tierMultiplier = TIER_BONUS[imp?.tier] || 1;
  const durationMultiplier = lock?.multiplier || 1;
  const canvasMultiplier = layout?.multiplier || 1;
  const keepMultiplier =
    1 + KEEP_PAIR_BONUS * keepList.length + KEEP_ALIGNMENT_BONUS * alignedCount;
  const days = lock?.days || 0;
  const payout = Math.round(
    BASE_IMPCOIN_PER_DAY *
      days *
      durationMultiplier *
      canvasMultiplier *
      keepMultiplier *
      tierMultiplier
  );

  return {
    days,
    alignedCount,
    keepCount: keepList.length,
    tierMultiplier,
    durationMultiplier,
    canvasMultiplier,
    keepMultiplier,
    payout,
  };
}

export function formatImpCoin(amount) {
  return `${Math.max(0, Number(amount) || 0).toLocaleString()} ImpCoin`;
}

export function remainingMs(unlocksAt) {
  return Math.max(0, new Date(unlocksAt).getTime() - Date.now());
}

export function formatRemaining(ms) {
  const total = Math.max(0, Math.ceil(Number(ms) / 1000));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${Math.max(1, minutes)}m`;
}

export function shortAddress(address) {
  if (!address) return '';
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
