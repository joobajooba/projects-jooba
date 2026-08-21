/** Chapter 1 public open (UTC). Keep in sync with api/adventures-gate.js. */
export const ADVENTURES_CHAPTER1_OPENS_AT_MS = Date.parse('2026-08-22T20:00:00.000Z');

export function isAdventuresChapter1Open(now = Date.now()) {
  return Number(now) >= ADVENTURES_CHAPTER1_OPENS_AT_MS;
}

export function msUntilAdventuresChapter1(now = Date.now()) {
  return Math.max(0, ADVENTURES_CHAPTER1_OPENS_AT_MS - Number(now));
}

export function chapter1CountdownParts(now = Date.now()) {
  const remaining = msUntilAdventuresChapter1(now);
  const totalSeconds = Math.floor(remaining / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return {
    remaining,
    hours,
    minutes,
    seconds,
    open: remaining <= 0,
  };
}

export function padCountdownUnit(value) {
  return String(Math.max(0, Number(value) || 0)).padStart(2, '0');
}
