import { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useAccount } from 'wagmi';
import { getDailyPassage } from '../lib/typeRacerPassages';
import { getDailyWordIndex } from '../lib/wordleWords';
import { supabase } from '../lib/supabase';

function wordCount(text) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

export default function TypeRacerGame({ asPage = false, onClose }) {
  const { address } = useAccount();
  const [passage, setPassage] = useState('');
  const [input, setInput] = useState('');
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  const [completed, setCompleted] = useState(false);
  const [lastStreak, setLastStreak] = useState(null);
  const inputRef = useRef(null);
  const dayIndex = getDailyWordIndex();

  useEffect(() => {
    setPassage(getDailyPassage());
  }, []);

  const elapsedSeconds = startTime && (endTime || Date.now())
    ? ((endTime || Date.now()) - startTime) / 1000
    : 0;
  const words = wordCount(passage);
  const wpm = elapsedSeconds > 0 ? Math.round((words / (elapsedSeconds / 60)) * 10) / 10 : 0;

  const saveStats = useCallback(
    async (finalWpm) => {
      if (!address || !supabase) return;
      const wallet = address.toLowerCase();
      const { data: row } = await supabase
        .from('type_racer_stats')
        .select('*')
        .eq('wallet_address', wallet)
        .maybeSingle();

      let currentStreak = row?.current_streak ?? 0;
      const maxStreak = row?.max_streak ?? 0;
      const lastPlayedDay = row?.last_played_day;

      if (lastPlayedDay == null || lastPlayedDay === dayIndex - 1) {
        currentStreak = (lastPlayedDay === dayIndex - 1 ? currentStreak : 0) + 1;
      } else if (lastPlayedDay !== dayIndex) {
        currentStreak = 1;
      }

      const totalGames = (row?.total_games ?? 0) + 1;
      const totalWpmSum = (row?.total_wpm_sum ?? 0) + finalWpm;

      setLastStreak(currentStreak);

      await supabase.from('type_racer_stats').upsert(
        {
          wallet_address: wallet,
          current_streak: currentStreak,
          max_streak: Math.max(maxStreak, currentStreak),
          last_played_day: dayIndex,
          last_wpm: finalWpm,
          total_games: totalGames,
          total_wpm_sum: totalWpmSum,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'wallet_address' }
      );
    },
    [address, dayIndex]
  );

  useEffect(() => {
    if (!passage || completed) return;
    const normalized = input.trimEnd();
    const target = passage.trimEnd();
    if (normalized.length > 0 && startTime == null) setStartTime(Date.now());
    if (normalized === target && target.length > 0) {
      const now = Date.now();
      setEndTime(now);
      setCompleted(true);
      const start = startTime ?? now;
      const secs = (now - start) / 1000;
      const finalWpm = secs > 0 ? Math.round((words / (secs / 60)) * 10) / 10 : 0;
      saveStats(finalWpm);
    }
  }, [input, passage, completed, startTime, saveStats, words]);

  const header = (
    <div className="flex items-center justify-between p-4 border-b border-gray-800">
      <h2 className="text-xl font-bold text-gray-100">J00BA&apos;s Type Racer</h2>
      <button
        type="button"
        onClick={onClose}
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800"
        aria-label="Back to games"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm">Back</span>
      </button>
    </div>
  );

  return (
    <div className="flex flex-col h-full min-h-0 overflow-auto">
      <div className="bg-gray-900 border-b border-gray-800 w-full max-w-3xl mx-auto flex-1 min-h-0 flex flex-col">
        {header}
        <div className={`flex-1 min-h-0 flex flex-col items-center justify-center gap-6 ${asPage ? 'p-6 py-8' : 'p-4'}`}>
          {!passage ? (
            <p className="text-gray-400">Loading…</p>
          ) : completed ? (
            <div className="text-center space-y-2">
              <p className="text-green-400 font-semibold text-lg">Done!</p>
              <p className="text-gray-300">Speed: <span className="font-bold text-white">{wpm} WPM</span></p>
              <p className="text-gray-400 text-sm">Words: {words} · Time: {(elapsedSeconds).toFixed(1)}s</p>
              {lastStreak != null && (
                <p className="text-indigo-400 text-sm">Streak: {lastStreak} day{lastStreak !== 1 ? 's' : ''}</p>
              )}
            </div>
          ) : (
            <>
              <div className="w-full max-w-2xl">
                <p className="text-gray-300 text-lg leading-relaxed mb-4 font-mono whitespace-pre-wrap">
                  {passage}
                </p>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Start typing here..."
                  className="w-full min-h-[120px] p-4 rounded-lg border-2 border-gray-600 bg-gray-800 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-lg leading-relaxed resize-none"
                  spellCheck={false}
                  autoFocus
                  disabled={completed}
                />
              </div>
              {startTime && !completed && (
                <p className="text-gray-400 text-sm">
                  Time: {((Date.now() - startTime) / 1000).toFixed(1)}s
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
