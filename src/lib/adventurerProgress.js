export const MAX_ADVENTURER_LEVEL = 10;

export const ADVENTURER_LEVELS = [
  { level: 1, xp: 0, slots: 1 },
  { level: 2, xp: 300, slots: 2 },
  { level: 3, xp: 900, slots: 3 },
  { level: 4, xp: 2200, slots: 4 },
  { level: 5, xp: 4500, slots: 5 },
  { level: 6, xp: 8000, slots: 5 },
  { level: 7, xp: 13000, slots: 5 },
  { level: 8, xp: 20000, slots: 5 },
  { level: 9, xp: 30000, slots: 5 },
  { level: 10, xp: 45000, slots: 5 },
];

export const XP_PROMPT_SUCCESS = 15;
export const XP_PROMPT_FAIL = 5;
export const XP_DUNGEON_FOUND = 40;
export const XP_DUNGEON_MINTED = 80;
export const XP_DUNGEON_DISCARDED = 15;

/** One-time Chapter 1 Impz holdings floor (snapshot); never lowers earned XP. */
export const IMPZ_HOLDINGS_XP_FLOORS = [
  { minImpz: 20, level: 3, xp: 900 },
  { minImpz: 10, level: 2, xp: 300 },
];

export function floorXpForImpzCount(impzCount = 0) {
  const count = Math.max(0, Number(impzCount) || 0);
  for (const row of IMPZ_HOLDINGS_XP_FLOORS) {
    if (count >= row.minImpz) return row.xp;
  }
  return 0;
}

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
    nextLevelXp: 300,
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
