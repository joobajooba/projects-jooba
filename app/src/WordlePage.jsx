import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { fetchWordleStats, upsertWordleStats } from './userData';

const WORD_LEN = 5;
const MAX_GUESSES = 6;
const EPOCH_UTC = Date.UTC(2021, 5, 19); // 2021-06-19 (commonly used Wordle epoch)
const WORDLIST_URL = 'https://raw.githubusercontent.com/chantastic/wordle-words/master/index.mjs';
const WORDLIST_CACHE_KEY = 'wordle:wordlists:v1';
const WORDLIST_CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function dayIndexUtc(now = new Date()) {
  const t = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.floor((t - EPOCH_UTC) / (24 * 60 * 60 * 1000));
}

function msUntilNextDayUtc(now = new Date()) {
  const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  return tomorrow.getTime() - now.getTime();
}

function formatCountdown(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${h}h ${m}m ${s}s`;
}

function evaluateGuess(solution, guess) {
  const sol = solution.split('');
  const g = guess.split('');
  const res = Array(WORD_LEN).fill('absent'); // 'correct' | 'present' | 'absent'
  const used = Array(WORD_LEN).fill(false);

  // First pass: correct
  for (let i = 0; i < WORD_LEN; i++) {
    if (g[i] === sol[i]) {
      res[i] = 'correct';
      used[i] = true;
      g[i] = null;
    }
  }
  // Second pass: present
  for (let i = 0; i < WORD_LEN; i++) {
    if (!g[i]) continue;
    const idx = sol.findIndex((ch, j) => !used[j] && ch === g[i]);
    if (idx >= 0) {
      res[i] = 'present';
      used[idx] = true;
    }
  }
  return res;
}

function mergeKeyStatus(prev, next) {
  const rank = { absent: 0, present: 1, correct: 2 };
  if (!prev) return next;
  return rank[next] > rank[prev] ? next : prev;
}

const KEY_ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];

export default function WordlePage() {
  const { address } = useAccount();
  const idx = useMemo(() => dayIndexUtc(), []);
  const [lists, setLists] = useState({ status: 'loading', answers: [], all: [] }); // status: loading|ok|error
  const solution = useMemo(() => {
    if (!lists.answers.length) return '';
    return lists.answers[(idx % lists.answers.length + lists.answers.length) % lists.answers.length];
  }, [idx, lists.answers]);
  const storageKey = useMemo(() => `wordle:${idx}`, [idx]);
  const validSet = useMemo(() => new Set(lists.all), [lists.all]);

  const [guesses, setGuesses] = useState([]); // array of strings
  const [current, setCurrent] = useState('');
  const [statusRows, setStatusRows] = useState([]); // array of arrays of statuses
  const [message, setMessage] = useState('');
  const [done, setDone] = useState(false);
  const [playedTodayFromServer, setPlayedTodayFromServer] = useState(false);
  const [nextIn, setNextIn] = useState('');

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.guesses) && Array.isArray(parsed?.statusRows)) {
        setGuesses(parsed.guesses.slice(0, MAX_GUESSES));
        setStatusRows(parsed.statusRows.slice(0, MAX_GUESSES));
        const won = parsed.guesses?.[parsed.guesses.length - 1] === solution;
        const over = won || parsed.guesses.length >= MAX_GUESSES;
        setDone(!!over);
      }
    } catch {
      // ignore
    }
  }, [storageKey, solution]);

  // Server-side "one game per day": if user already played today (e.g. different device or cleared storage), lock game
  useEffect(() => {
    if (!address || !solution) return;
    let cancelled = false;
    (async () => {
      try {
        const normalized = address.toLowerCase();
        const existing = await fetchWordleStats(normalized);
        if (cancelled) return;
        if (existing?.last_played_day != null && Number(existing.last_played_day) === idx) {
          setPlayedTodayFromServer(true);
        }
      } catch {
        // ignore
      }
    })();
    return () => { cancelled = true; };
  }, [address, solution, idx]);

  useEffect(() => {
    if (playedTodayFromServer && guesses.length === 0 && solution) setDone(true);
  }, [playedTodayFromServer, guesses.length, solution]);

  useEffect(() => {
    if (!done) return;
    const tick = () => setNextIn(formatCountdown(msUntilNextDayUtc()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [done]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ guesses, statusRows }));
    } catch {
      // ignore
    }
  }, [storageKey, guesses, statusRows]);

  useEffect(() => {
    if (!done) return;
    if (!address) return;
    if (!solution) return;
    if (!guesses.length) return;
    const normalized = address.toLowerCase();
    const won = guesses[guesses.length - 1] === solution;
    const guessesUsed = guesses.length;
    const submitKey = `wordle:stats_submitted:${normalized}:${idx}`;
    if (localStorage.getItem(submitKey) === '1') return;

    let cancelled = false;
    (async () => {
      const existing = await fetchWordleStats(normalized);
      if (cancelled) return;

      // Prevent double-counting if DB already has this day recorded
      if (existing?.last_played_day != null && Number(existing.last_played_day) === idx) {
        try { localStorage.setItem(submitKey, '1'); } catch {}
        return;
      }

      const prevStreak = Number(existing?.current_streak || 0);
      const prevMax = Number(existing?.max_streak || 0);
      const prevWins = Number(existing?.total_wins || 0);
      const prevGames = Number(existing?.total_games || 0);
      const prevGuesses = Number(existing?.total_guesses || 0);
      const prevWinsInOne = Number(existing?.wins_in_one || 0);
      const prevLastDay = existing?.last_played_day != null ? Number(existing.last_played_day) : null;

      const nextGames = prevGames + 1;
      const nextWins = prevWins + (won ? 1 : 0);
      const nextGuesses = prevGuesses + (won ? guessesUsed : 0);
      const nextWinsInOne = prevWinsInOne + (won && guessesUsed === 1 ? 1 : 0);

      let nextStreak = 0;
      if (won) {
        nextStreak = prevLastDay != null && prevLastDay === idx - 1 ? prevStreak + 1 : 1;
      }
      const nextMax = Math.max(prevMax, nextStreak);
      const avg = nextWins > 0 ? Number((nextGuesses / nextWins).toFixed(2)) : 0;

      const { ok } = await upsertWordleStats(normalized, {
        current_streak: nextStreak,
        max_streak: nextMax,
        total_wins: nextWins,
        total_games: nextGames,
        total_guesses: nextGuesses,
        wins_in_one: nextWinsInOne,
        avg_guesses: avg,
        last_played_day: idx,
        updated_at: new Date().toISOString(),
      });
      if (!cancelled && ok) {
        try { localStorage.setItem(submitKey, '1'); } catch {}
      }
    })();

    return () => { cancelled = true; };
  }, [done, address, solution, guesses, idx]);

  const keyStatus = useMemo(() => {
    const m = {};
    for (let r = 0; r < guesses.length; r++) {
      const g = guesses[r];
      const s = statusRows[r] || [];
      for (let i = 0; i < g.length; i++) {
        const ch = g[i];
        m[ch] = mergeKeyStatus(m[ch], s[i]);
      }
    }
    return m;
  }, [guesses, statusRows]);

  const submit = () => {
    if (done) return;
    if (!solution) return;
    const g = current.toLowerCase();
    if (g.length !== WORD_LEN) {
      setMessage('Not enough letters.');
      return;
    }
    if (!validSet.has(g)) {
      setMessage('Not in word list.');
      return;
    }
    const nextStatuses = evaluateGuess(solution, g);
    const nextGuesses = [...guesses, g].slice(0, MAX_GUESSES);
    const nextRows = [...statusRows, nextStatuses].slice(0, MAX_GUESSES);
    setGuesses(nextGuesses);
    setStatusRows(nextRows);
    setCurrent('');
    setMessage('');
    if (g === solution || nextGuesses.length >= MAX_GUESSES) setDone(true);
  };

  const onKey = (k) => {
    if (done) return;
    if (k === 'enter') return submit();
    if (k === 'backspace') {
      setCurrent((v) => v.slice(0, -1));
      return;
    }
    if (/^[a-z]$/.test(k) && current.length < WORD_LEN) setCurrent((v) => (v + k).slice(0, WORD_LEN));
  };

  useEffect(() => {
    const handler = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const key = String(e.key || '').toLowerCase();
      if (key === 'enter' || key === 'backspace' || /^[a-z]$/.test(key)) {
        e.preventDefault();
        onKey(key);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const cachedRaw = localStorage.getItem(WORDLIST_CACHE_KEY);
        if (cachedRaw) {
          const parsed = JSON.parse(cachedRaw);
          if (
            parsed &&
            Array.isArray(parsed.answers) &&
            Array.isArray(parsed.all) &&
            typeof parsed.savedAt === 'number' &&
            Date.now() - parsed.savedAt < WORDLIST_CACHE_MAX_AGE_MS
          ) {
            setLists({ status: 'ok', answers: parsed.answers, all: parsed.all });
            return;
          }
        }
      } catch {
        // ignore
      }

      try {
        const res = await fetch(WORDLIST_URL, { cache: 'force-cache' });
        const text = await res.text();
        if (cancelled) return;

        const parseBlock = (name) => {
          const start = text.indexOf(`export const ${name} = [`);
          if (start < 0) return [];
          const after = text.slice(start);
          const end = after.indexOf('];');
          if (end < 0) return [];
          const block = after.slice(0, end);
          const words = [];
          block.split('\n').forEach((line) => {
            const m = line.match(/\"([a-z]{5})\"/);
            if (m) words.push(m[1]);
          });
          return words;
        };

        const answers = parseBlock('answers');
        const rest = parseBlock('rest');
        const all = [...answers, ...rest];
        if (!answers.length || !all.length) throw new Error('wordlist_parse_failed');

        setLists({ status: 'ok', answers, all });
        try {
          localStorage.setItem(WORDLIST_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), answers, all }));
        } catch {
          // ignore
        }
      } catch (e) {
        if (cancelled) return;
        setLists({ status: 'error', answers: [], all: [] });
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const rows = useMemo(() => {
    const out = [];
    for (let r = 0; r < MAX_GUESSES; r++) {
      const g = guesses[r] || '';
      const s = statusRows[r] || [];
      const isActive = r === guesses.length && !done;
      const display = isActive ? current : g;
      const cells = [];
      for (let c = 0; c < WORD_LEN; c++) {
        const ch = display[c] ? display[c].toUpperCase() : '';
        const st = s[c] || 'empty';
        cells.push({ ch, st });
      }
      out.push(cells);
    }
    return out;
  }, [guesses, statusRows, current, done]);

  const banner = done
    ? playedTodayFromServer && guesses.length === 0
      ? "You've already played today. Come back tomorrow!"
      : guesses[guesses.length - 1] === solution
        ? 'Nice. You got it.'
        : `The word was ${solution.toUpperCase()}.`
    : message;

  const colorFor = (st) => {
    if (st === 'correct') return '#15803d';
    if (st === 'present') return '#a16207';
    if (st === 'absent') return '#374151';
    return 'rgba(255,255,255,0.06)';
  };

  return (
    <div className="app-main-inner" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ width: '100%', maxWidth: 560 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ marginBottom: 6 }}>Wordle</h1>
          <Link to="/games" style={{ color: 'rgba(255,255,255,0.75)', textDecoration: 'none' }}>← Games</Link>
        </div>
        <p style={{ marginTop: 0, marginBottom: 14, opacity: 0.8 }}>Daily puzzle</p>
      </div>

      {lists.status !== 'ok' && (
        <div style={{ width: '100%', maxWidth: 560, opacity: 0.8, marginBottom: 10, textAlign: 'center' }}>
          {lists.status === 'loading' ? 'Loading word list…' : 'Failed to load word list. Please refresh.'}
        </div>
      )}

      <div style={{ width: '100%', maxWidth: 560, display: 'flex', justifyContent: 'center' }}>
        <div style={{ display: 'grid', gap: 8 }}>
          {rows.map((cells, r) => (
            <div key={r} style={{ display: 'grid', gridTemplateColumns: `repeat(${WORD_LEN}, 56px)`, gap: 8 }}>
              {cells.map((cell, c) => (
                <div
                  key={c}
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 8,
                    border: '1px solid rgba(255,255,255,0.16)',
                    background: colorFor(cell.st),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 24,
                    fontWeight: 900,
                    letterSpacing: '0.08em',
                    userSelect: 'none',
                  }}
                >
                  {cell.ch}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div style={{ width: '100%', maxWidth: 560, marginTop: 14, minHeight: 22, textAlign: 'center' }}>
        {banner ? <div style={{ fontSize: 13, opacity: done ? 0.95 : 0.8 }}>{banner}</div> : null}
        {done && nextIn ? (
          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>Next puzzle in {nextIn}</div>
        ) : null}
      </div>

      <div style={{ width: '100%', maxWidth: 560, marginTop: 14, display: 'grid', gap: 8 }}>
        {KEY_ROWS.map((row, i) => (
          <div key={i} style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
            {i === 2 && (
              <button
                type="button"
                onClick={() => onKey('enter')}
                style={{
                  padding: '0 10px',
                  height: 44,
                  borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.18)',
                  background: 'rgba(255,255,255,0.08)',
                  color: '#fff',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                Enter
              </button>
            )}
            {row.split('').map((ch) => {
              const st = keyStatus[ch];
              const bg = st ? colorFor(st) : 'rgba(255,255,255,0.08)';
              return (
                <button
                  key={ch}
                  type="button"
                  onClick={() => onKey(ch)}
                  style={{
                    width: 40,
                    height: 44,
                    borderRadius: 8,
                    border: '1px solid rgba(255,255,255,0.16)',
                    background: bg,
                    color: '#fff',
                    fontWeight: 900,
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                >
                  {ch.toUpperCase()}
                </button>
              );
            })}
            {i === 2 && (
              <button
                type="button"
                onClick={() => onKey('backspace')}
                style={{
                  padding: '0 10px',
                  height: 44,
                  borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.18)',
                  background: 'rgba(255,255,255,0.08)',
                  color: '#fff',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
                aria-label="Backspace"
                title="Backspace"
              >
                ⌫
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

