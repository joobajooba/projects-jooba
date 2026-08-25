export const STAKING_IMPLINGZ_ADDRESS = '0x81D2D1f0e92285CdD22Aa3cbc6956B6E1724d029';
export const STAKING_KEEP_V1_ADDRESS = '0x639061b01ab4261b4283a0AC9D3bB8B99013Bad4';
export const STAKING_KEEP_V2_ADDRESS = '0x51eA8743109F1b9C70C9d1a9A56cCaA5C2877ee9';

export const BASE_IMPCOIN_PER_DAY = 5;
export const ALIGNMENT_BONUS_PER_KEEP = 2;
export const ROBINS_LAIR_MULTIPLIER = 1.5;
export const ROBINS_LAIR_TILESET = 'robins_lair';
export const VOID_MULTIPLIER = 1.25;
export const VOID_TILESET = 'void';
export const ALIGN_ALL_BODIES = ['Gold', 'Diamond'];

export const TILESET_LABELS = {
  underworld: 'Underworld',
  volcano: 'Volcano',
  the_vault: 'The Vault',
  plains: 'Grassy plains',
  forgotten_ruins: 'Mossy ruins',
  mushroom: 'Mushroom',
  desert: 'Desert ruins',
  limestone: 'Limestone',
  icy: 'Icy',
  clouds: 'Clouds',
  storm: 'Storm',
  mossy: 'Swamp',
  dreamcore: 'Dreamscape',
  shortcake: 'Shortcake',
  void: 'Void',
  lunar: 'Moon',
  castle: 'Stone castle',
  robins_lair: "Robin's Lair",
};

export const ALIGNMENTS = {
  Red: ['underworld', 'volcano', 'the_vault'],
  Green: ['plains', 'forgotten_ruins', 'mushroom'],
  Khaki: ['desert', 'limestone', 'plains'],
  Blue: ['icy', 'clouds', 'storm'],
  Cyan: ['mossy', 'storm', 'icy'],
  Purple: ['dreamcore', 'shortcake', 'mushroom'],
  Pink: ['mushroom', 'shortcake', 'underworld'],
  Silver: ['lunar', 'castle', 'limestone'],
  Gold: '*',
  Diamond: '*',
};

export const LOCK_MULTIPLIERS = {
  '7d': 1,
  '14d': 1.25,
  '30d': 1.5,
  '60d': 1.75,
  '90d': 2,
};

export const STAKE_DURATIONS = [
  { id: '7d', label: '7 days', detail: '1x daily rate', days: 7, multiplier: 1 },
  { id: '14d', label: '2 weeks', detail: '1.25x daily rate', days: 14, multiplier: 1.25 },
  { id: '30d', label: '1 month', detail: '1.5x daily rate', days: 30, multiplier: 1.5 },
  { id: '60d', label: '2 months', detail: '1.75x daily rate', days: 60, multiplier: 1.75 },
  { id: '90d', label: '3 months', detail: '2x daily rate', days: 90, multiplier: 2 },
];

export const CANVAS_LAYOUTS = {
  solo: {
    id: 'solo',
    label: 'Solo',
    title: 'Solo Imp',
    description: 'Just the Imp. No Keeps needed.',
    keepCount: 0,
    cols: 1,
    rows: 1,
    cells: ['imp'],
    keepSlots: [],
  },
  pair: {
    id: 'pair',
    label: '1–1',
    title: 'Pair canvas',
    description: 'Imp on the left, one Keep on the right.',
    keepCount: 1,
    cols: 2,
    rows: 1,
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
    cells: ['nw', 'north', 'ne', 'west', 'imp', 'east', 'sw', 'south', 'se'],
    keepSlots: ['nw', 'north', 'ne', 'west', 'east', 'sw', 'south', 'se'],
  },
};

export function tilesetSlug(tileset) {
  return String(tileset || '').toLowerCase();
}

export function tilesetLabel(tileset) {
  const slug = tilesetSlug(tileset);
  return TILESET_LABELS[slug] || slug.replaceAll('_', ' ');
}

export function alignedTilesets(body) {
  if (ALIGN_ALL_BODIES.includes(body)) return ['*'];
  return ALIGNMENTS[body] ?? [];
}

export function alignmentLabels(body) {
  if (ALIGN_ALL_BODIES.includes(body)) return 'All environments';
  return alignedTilesets(body).map(tilesetLabel).join(', ');
}

export function isRobinsLair(tileset) {
  return tilesetSlug(tileset) === ROBINS_LAIR_TILESET;
}

export function isVoidKeep(tileset) {
  return tilesetSlug(tileset) === VOID_TILESET;
}

export function keepsHaveRobinsLair(keeps) {
  return (keeps ?? []).some((keep) => isRobinsLair(keep?.tileset));
}

export function keepsHaveVoid(keeps) {
  return (keeps ?? []).some((keep) => isVoidKeep(keep?.tileset));
}

export function isAlignedPair(body, tileset) {
  const slug = tilesetSlug(tileset);
  if (!slug) return false;
  if (ALIGN_ALL_BODIES.includes(body)) return true;
  return (ALIGNMENTS[body] ?? []).includes(slug);
}

export function tokenKey(contract, tokenId) {
  return `${String(contract || '').toLowerCase()}:${String(tokenId)}`;
}

export function canvasById(canvasId) {
  return CANVAS_LAYOUTS[canvasId] ?? CANVAS_LAYOUTS.pair;
}

export function durationById(durationId) {
  return STAKE_DURATIONS.find((option) => option.id === durationId) || STAKE_DURATIONS[0];
}

export function lockMultiplierFor(durationId) {
  return LOCK_MULTIPLIERS[durationId] || durationById(durationId).multiplier || 1;
}

export function durationLabel(durationId, durationDays) {
  const option = STAKE_DURATIONS.find((item) => item.id === durationId);
  if (option) return option.label;
  if (durationId === 'open') return 'Open';
  const days = Number(durationDays);
  if (Number.isFinite(days) && days > 0) return `${days} day${days === 1 ? '' : 's'}`;
  return 'Lock';
}

export function stakeUnlocksAt(stake) {
  const unlocks = new Date(stake?.unlocks_at || 0).getTime();
  return Number.isFinite(unlocks) ? unlocks : 0;
}

export function isStakeLocked(stake, now = Date.now()) {
  return stakeUnlocksAt(stake) > now;
}

export function estimatedLockPayout(dailyRate, days) {
  const rate = Number(dailyRate) || 0;
  const length = Number(days) || 0;
  if (rate <= 0 || length <= 0) return 0;
  return Math.max(0, Math.floor(rate * length));
}

export function dailyRateFor({
  alignedCount = 0,
  hasRobinsLair = false,
  hasVoid = false,
  durationId = '7d',
} = {}) {
  const raw =
    (BASE_IMPCOIN_PER_DAY + ALIGNMENT_BONUS_PER_KEEP * Number(alignedCount || 0)) *
    (hasRobinsLair ? ROBINS_LAIR_MULTIPLIER : 1) *
    (hasVoid ? VOID_MULTIPLIER : 1) *
    lockMultiplierFor(durationId);
  return Math.round(raw * 10000) / 10000;
}

export function estimateStake({ imp, keeps, durationId = '7d' }) {
  const keepList = (keeps ?? []).filter(Boolean);
  const alignedCount = keepList.filter((keep) => isAlignedPair(imp?.body, keep.tileset)).length;
  const hasRobinsLair = keepsHaveRobinsLair(keepList);
  const hasVoid = keepsHaveVoid(keepList);
  const lockMultiplier = lockMultiplierFor(durationId);
  const dailyRate = dailyRateFor({ alignedCount, hasRobinsLair, hasVoid, durationId });
  return {
    alignedCount,
    keepCount: keepList.length,
    hasRobinsLair,
    hasVoid,
    lockMultiplier,
    dailyRate,
  };
}

export function pendingFromStake(stake, now = Date.now()) {
  if (!stake || stake.status !== 'active') return 0;
  const last = new Date(stake.last_accrued_at || stake.started_at).getTime();
  const rate = Number(stake.daily_rate ?? 0);
  if (!Number.isFinite(last) || !Number.isFinite(rate) || rate <= 0) return 0;
  return Math.max(0, Math.floor((rate * (now - last)) / 86_400_000));
}

export function formatImpCoin(amount) {
  const value = Math.max(0, Number(amount) || 0);
  const shown = Number.isInteger(value)
    ? value.toLocaleString()
    : value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return `${shown} ImpCoin`;
}

export function formatRate(amount) {
  return `${formatImpCoin(amount)} / day`;
}

export function formatStakedFor(ms) {
  const total = Math.max(0, Math.floor(Number(ms) / 1000));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  if (days > 0) return `${days}d ${hours}h staked`;
  const minutes = Math.floor((total % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m staked`;
  return `${Math.max(1, minutes)}m staked`;
}

export function formatLockRemaining(ms) {
  const total = Math.max(0, Math.ceil(Number(ms) / 1000));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  if (days > 0) return `${days}d ${hours}h left`;
  const minutes = Math.floor((total % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m left`;
  return `${Math.max(1, minutes)}m left`;
}

export function shortAddress(address) {
  if (!address) return '';
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
