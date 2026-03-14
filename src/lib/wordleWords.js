/**
 * Wordle word list - same source as NYT Wordle (stuartpb/wordles).
 * Answers only; we use this list for both answers and valid guesses for simplicity.
 */
const WORDLES_URL = 'https://raw.githubusercontent.com/stuartpb/wordles/main/wordles.json';

let cachedWords = null;

export async function getWordleWords() {
  if (cachedWords) return cachedWords;
  try {
    const res = await fetch(WORDLES_URL);
    if (!res.ok) throw new Error('Failed to fetch word list');
    const data = await res.json();
    cachedWords = Array.isArray(data) ? data.map((w) => w.toLowerCase()) : [];
    return cachedWords;
  } catch (e) {
    console.warn('Wordle word list fetch failed, using fallback', e);
    cachedWords = FALLBACK_WORDS;
    return cachedWords;
  }
}

/** NYT Wordle reference: first game June 19, 2021. Same word for everyone by calendar day. */
export function getDailyWordIndex() {
  const ref = new Date(Date.UTC(2021, 5, 19)); // June 19, 2021
  const today = new Date();
  const refDay = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diffMs = todayDay - refDay;
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  return Math.max(0, diffDays);
}

export function getDailyWord(words) {
  if (!words || words.length === 0) return null;
  const index = getDailyWordIndex();
  return words[index % words.length];
}

/** Fallback if CDN is down - small subset so the game still loads */
const FALLBACK_WORDS = [
  'cigar', 'rebut', 'sissy', 'humph', 'awake', 'blush', 'focal', 'evade', 'naval', 'serve',
  'heath', 'dwarf', 'model', 'karma', 'stink', 'grade', 'quiet', 'bench', 'abate', 'feign',
  'major', 'death', 'fresh', 'crust', 'stool', 'colon', 'abase', 'marry', 'react', 'batty',
  'pride', 'floss', 'helix', 'croak', 'staff', 'paper', 'unfed', 'whelp', 'trawl', 'outdo',
  'adobe', 'crazy', 'sower', 'repay', 'digit', 'crate', 'cluck', 'spike', 'mimic', 'pound',
];
