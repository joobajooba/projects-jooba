export const MAX_ADVENTURER_LEVEL = 10;

export const ADVENTURER_LEVELS = [
  { level: 1, xp: 0, slots: 1 },
  { level: 2, xp: 500, slots: 2 },
  { level: 3, xp: 1500, slots: 3 },
  { level: 4, xp: 4000, slots: 4 },
  { level: 5, xp: 8000, slots: 5 },
  { level: 6, xp: 14000, slots: 5 },
  { level: 7, xp: 22000, slots: 5 },
  { level: 8, xp: 32000, slots: 5 },
  { level: 9, xp: 45000, slots: 5 },
  { level: 10, xp: 60000, slots: 5 },
];

export const XP_PROMPT_SUCCESS = 25;
export const XP_PROMPT_FAIL = 8;
export const XP_DUNGEON_FOUND = 100;
export const XP_DUNGEON_MINTED = 200;
export const XP_DUNGEON_DISCARDED = 40;

export function progressFromXp(xp = 0) {
  const safeXp = Math.max(0, Number(xp) || 0);
  let current = ADVENTURER_LEVELS[0];

  for (const row of ADVENTURER_LEVELS) {
    if (safeXp >= row.xp) current = row;
  }

  const next =
    current.level >= MAX_ADVENTURER_LEVEL
      ? null
      : ADVENTURER_LEVELS.find((row) => row.level === current.level + 1) ?? null;
  const span = next ? next.xp - current.xp : 1;
  const intoLevel = next ? safeXp - current.xp : span;

  return {
    xp: safeXp,
    level: current.level,
    slots: current.slots,
    nextLevelXp: next?.xp ?? null,
    progressRatio: next ? Math.min(1, intoLevel / span) : 1,
  };
}

export function emptyAdventurerAccount(walletAddress = '') {
  return {
    wallet_address: walletAddress,
    xp: 0,
    level: 1,
    active_adventures: 0,
    slots: 1,
    nextLevelXp: 500,
    progressRatio: 0,
  };
}

export function decorateAccount(account) {
  const progress = progressFromXp(account?.xp ?? 0);
  return {
    ...emptyAdventurerAccount(account?.wallet_address ?? ''),
    ...account,
    ...progress,
  };
}
