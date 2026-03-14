import { useState, useEffect, useCallback } from 'react';
import { X, ArrowLeft } from 'lucide-react';
import { useAccount } from 'wagmi';
import { getWordleWords, getDailyWord, getDailyWordIndex } from '../lib/wordleWords';
import { supabase } from '../lib/supabase';

const ROWS = 6;
const COLS = 5;
const KEYS_ROW1 = 'QWERTYUIOP';
const KEYS_ROW2 = 'ASDFGHJKL';
const KEYS_ROW3 = 'ZXCVBNM';

function Cell({ letter, status, large }) {
  const c =
    status === 'correct'
      ? 'bg-green-600 border-green-600'
      : status === 'present'
        ? 'bg-yellow-500 border-yellow-500'
        : status === 'absent'
          ? 'bg-gray-600 border-gray-600'
          : 'bg-gray-800 border-gray-600';
  const size = large ? 'w-14 h-14 sm:w-16 sm:h-16 text-xl' : 'w-12 h-12 sm:w-14 sm:h-14 text-lg';
  return (
    <div
      className={`flex items-center justify-center border-2 font-bold uppercase ${size} ${c} text-white`}
    >
      {letter || ''}
    </div>
  );
}

export default function WordleGame({ isOpen = true, asPage = false, onClose }) {
  const { address } = useAccount();
  const [words, setWords] = useState([]);
  const [target, setTarget] = useState(null);
  const [guesses, setGuesses] = useState([]);
  const [current, setCurrent] = useState('');
  const [status, setStatus] = useState('playing'); // 'playing' | 'won' | 'lost'
  const [loading, setLoading] = useState(true);

  const dayIndex = getDailyWordIndex();
  const show = asPage || isOpen;

  useEffect(() => {
    if (!show) return;
    let cancelled = false;
    setLoading(true);
    getWordleWords().then((list) => {
      if (cancelled) return;
      setWords(list);
      const word = getDailyWord(list);
      setTarget(word || '');
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [show]);

  const resetIfNewDay = useCallback(() => {
    const stored = sessionStorage.getItem('wordle_state');
    if (stored) {
      try {
        const { day, guesses: g, current: c, status: s } = JSON.parse(stored);
        if (day === dayIndex && target) {
          setGuesses(g || []);
          setCurrent(c || '');
          setStatus(s || 'playing');
          return;
        }
      } catch (_) {}
    }
    setGuesses([]);
    setCurrent('');
    setStatus('playing');
  }, [dayIndex, target]);

  useEffect(() => {
    if (target) resetIfNewDay();
  }, [target, resetIfNewDay]);

  useEffect(() => {
    if (!target) return;
    sessionStorage.setItem(
      'wordle_state',
      JSON.stringify({ day: dayIndex, guesses, current, status })
    );
  }, [guesses, current, status, dayIndex, target]);

  const saveStats = useCallback(
    async (won, numGuesses) => {
      if (!address || !supabase) return;
      const wallet = address.toLowerCase();
      const { data: row } = await supabase
        .from('wordle_stats')
        .select('*')
        .eq('wallet_address', wallet)
        .maybeSingle();

      const totalGames = (row?.total_games ?? 0) + 1;
      const totalWins = (row?.total_wins ?? 0) + (won ? 1 : 0);
      const totalGuesses = (row?.total_guesses ?? 0) + numGuesses;
      const avgGuesses = totalWins > 0 ? totalGuesses / totalWins : 0;

      let currentStreak = row?.current_streak ?? 0;
      const maxStreak = row?.max_streak ?? 0;
      const lastPlayedDay = row?.last_played_day;

      if (won) {
        if (lastPlayedDay == null || lastPlayedDay === dayIndex - 1) {
          currentStreak = (lastPlayedDay === dayIndex - 1 ? currentStreak : 0) + 1;
        } else if (lastPlayedDay !== dayIndex) {
          currentStreak = 1;
        }
      } else {
        currentStreak = 0;
      }

      await supabase.from('wordle_stats').upsert(
        {
          wallet_address: wallet,
          current_streak: currentStreak,
          max_streak: Math.max(maxStreak, currentStreak),
          total_wins: totalWins,
          total_games: totalGames,
          total_guesses: totalGuesses,
          wins_in_one: (row?.wins_in_one ?? 0) + (won && numGuesses === 1 ? 1 : 0),
          avg_guesses: Math.round(avgGuesses * 100) / 100,
          last_played_day: dayIndex,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'wallet_address' }
      );
    },
    [address, dayIndex]
  );

  const getLetterStatus = (letter, index, guess) => {
    if (!target) return 'absent';
    const t = target.toLowerCase();
    const g = guess.toLowerCase();
    const l = letter.toLowerCase();
    if (t[index] === l) return 'correct';
    const inTarget = t.split('').filter((c) => c === l).length;
    const exactMatches = t.split('').filter((c, i) => g[i] === l && t[i] === l).length;
    let yellowsBefore = 0;
    for (let i = 0; i < index; i++) {
      if (g[i] === l && t[i] !== l) yellowsBefore++;
    }
    if (inTarget > exactMatches + yellowsBefore) return 'present';
    return 'absent';
  };

  const keyStatus = {};
  guesses.forEach((g) => {
    g.split('').forEach((letter, i) => {
      const s = getLetterStatus(letter, i, g);
      const l = letter.toUpperCase();
      if (!keyStatus[l] || s === 'correct') keyStatus[l] = s;
      else if (s === 'present' && keyStatus[l] !== 'correct') keyStatus[l] = 'present';
    });
  });

  const handleKey = (key) => {
    if (status !== 'playing' || !target) return;
    if (key === 'ENTER') {
      if (current.length !== 5) return;
      const word = current.toLowerCase();
      if (!words.includes(word)) return;
      const newGuesses = [...guesses, current];
      setGuesses(newGuesses);
      setCurrent('');
      if (word === target) {
        setStatus('won');
        saveStats(true, newGuesses.length);
      } else if (newGuesses.length >= ROWS) {
        setStatus('lost');
        saveStats(false, newGuesses.length);
      }
      return;
    }
    if (key === 'BACK') {
      setCurrent((c) => c.slice(0, -1));
      return;
    }
    if (current.length < 5 && /^[A-Za-z]$/.test(key)) {
      setCurrent((c) => (c + key).toUpperCase().slice(0, 5));
    }
  };

  useEffect(() => {
    if (!show) return;
    const onKey = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleKey('ENTER');
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleKey('BACK');
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        e.preventDefault();
        handleKey(e.key.toUpperCase());
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [show, current, guesses, status, target, words]);

  if (!show) return null;

  const header = (
    <div className="flex items-center justify-between p-4 border-b border-gray-800">
      <h2 className="text-xl font-bold text-gray-100">Wordle</h2>
      <button
        type="button"
        onClick={onClose}
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800"
        aria-label={asPage ? 'Back to games' : 'Close'}
      >
        {asPage ? (
          <>
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back</span>
          </>
        ) : (
          <X className="w-5 h-5" />
        )}
      </button>
    </div>
  );

  const keyClass = asPage
    ? 'w-10 h-12 sm:w-12 sm:h-14 text-sm'
    : 'w-8 h-10 sm:w-9 sm:h-11 text-sm';
  const specialKeyClass = asPage
    ? 'px-4 py-2.5 text-xs min-w-[3rem] sm:min-w-[3.5rem]'
    : 'px-3 py-2 text-xs min-w-[2.5rem]';

  const content = (
    <>
      {header}
        <div className={`flex-1 min-h-0 flex flex-col items-center justify-center gap-6 ${asPage ? 'p-6 py-8' : 'p-4'}`}>
          {loading ? (
            <p className="text-gray-400 py-8">Loading…</p>
          ) : (
            <>
              <div className="flex flex-col gap-1.5 shrink-0">
                {Array.from({ length: ROWS }, (_, row) => (
                  <div key={row} className="flex gap-1 sm:gap-1.5 justify-center">
                    {Array.from({ length: COLS }, (_, col) => {
                      const guess = guesses[row];
                      const letter = guess ? guess[col] : row === guesses.length ? current[col] : '';
                      const status = guess
                        ? getLetterStatus(guess[col], col, guess)
                        : null;
                      return <Cell key={col} letter={letter} status={status} large={asPage} />;
                    })}
                  </div>
                ))}
              </div>
              {status === 'won' && (
                <p className="text-green-400 font-semibold text-center">
                  You won in {guesses.length} {guesses.length === 1 ? 'guess' : 'guesses'}!
                </p>
              )}
              {status === 'lost' && (
                <p className="text-gray-300 text-center">
                  The word was <span className="font-bold text-white uppercase">{target}</span>
                </p>
              )}
              <div className="flex flex-col gap-2 w-full max-w-[min(100%,28rem)] shrink-0">
                <div className="flex justify-center gap-1 flex-nowrap">
                  {KEYS_ROW1.split('').map((k) => {
                    const s = keyStatus[k];
                    const bg = s === 'correct' ? 'bg-green-600' : s === 'present' ? 'bg-yellow-500' : s === 'absent' ? 'bg-gray-600' : 'bg-gray-700 hover:bg-gray-600';
                    return (
                      <button key={k} type="button" onClick={() => handleKey(k)} className={`${keyClass} ${bg} text-white font-bold rounded shrink-0`}>
                        {k}
                      </button>
                    );
                  })}
                </div>
                <div className="flex justify-center gap-1 flex-nowrap">
                  {KEYS_ROW2.split('').map((k) => {
                    const s = keyStatus[k];
                    const bg = s === 'correct' ? 'bg-green-600' : s === 'present' ? 'bg-yellow-500' : s === 'absent' ? 'bg-gray-600' : 'bg-gray-700 hover:bg-gray-600';
                    return (
                      <button key={k} type="button" onClick={() => handleKey(k)} className={`${keyClass} ${bg} text-white font-bold rounded shrink-0`}>
                        {k}
                      </button>
                    );
                  })}
                </div>
                <div className="flex justify-center gap-1 flex-nowrap">
                  <button type="button" onClick={() => handleKey('ENTER')} className={`${specialKeyClass} h-12 sm:h-14 bg-gray-600 hover:bg-gray-500 text-gray-200 font-semibold rounded shrink-0`}>
                    ENTER
                  </button>
                  {KEYS_ROW3.split('').map((k) => {
                    const s = keyStatus[k];
                    const bg = s === 'correct' ? 'bg-green-600' : s === 'present' ? 'bg-yellow-500' : s === 'absent' ? 'bg-gray-600' : 'bg-gray-700 hover:bg-gray-600';
                    return (
                      <button key={k} type="button" onClick={() => handleKey(k)} className={`${keyClass} ${bg} text-white font-bold rounded shrink-0`}>
                        {k}
                      </button>
                    );
                  })}
                  <button type="button" onClick={() => handleKey('BACK')} className={`${specialKeyClass} h-12 sm:h-14 bg-gray-600 hover:bg-gray-500 text-gray-200 font-semibold rounded shrink-0`}>
                    ⌫
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
    </>
  );

  if (asPage) {
    return (
      <div className="flex flex-col h-full min-h-0 overflow-auto">
        <div className="bg-gray-900 border-b border-gray-800 w-full max-w-3xl mx-auto flex-1 min-h-0 flex flex-col">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70"
      role="dialog"
      aria-modal="true"
      aria-label="Wordle game"
    >
      <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-auto">
        {content}
      </div>
    </div>
  );
}
