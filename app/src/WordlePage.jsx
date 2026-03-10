import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { answers, all } from 'wordle-words/index.mjs';

const WORD_LEN = 5;
const MAX_GUESSES = 6;
const EPOCH_UTC = Date.UTC(2021, 5, 19); // 2021-06-19 (commonly used Wordle epoch)

function dayIndexUtc(now = new Date()) {
  const t = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.floor((t - EPOCH_UTC) / (24 * 60 * 60 * 1000));
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
  const idx = useMemo(() => dayIndexUtc(), []);
  const solution = useMemo(() => answers[(idx % answers.length + answers.length) % answers.length], [idx]);
  const storageKey = useMemo(() => `wordle:${idx}`, [idx]);
  const validSet = useMemo(() => new Set(all), []);

  const [guesses, setGuesses] = useState([]); // array of strings
  const [current, setCurrent] = useState('');
  const [statusRows, setStatusRows] = useState([]); // array of arrays of statuses
  const [message, setMessage] = useState('');
  const [done, setDone] = useState(false);

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

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ guesses, statusRows }));
    } catch {
      // ignore
    }
  }, [storageKey, guesses, statusRows]);

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
    ? guesses[guesses.length - 1] === solution
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

