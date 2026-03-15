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
      const { error } = await supabase.from('type_racer_game_results').insert({
        wallet_address: wallet,
        played_day: dayIndex,
        wpm: finalWpm,
      });

      if (error) {
        console.warn('Failed to save Type Racer game result', error);
        return;
      }

      const { data: statsRow } = await supabase
        .from('type_racer_stats')
        .select('current_streak')
        .eq('wallet_address', wallet)
        .maybeSingle();

      setLastStreak(statsRow?.current_streak ?? null);
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

  const gameContent = (
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
                  <p
                    className="text-lg leading-relaxed mb-4 font-mono whitespace-pre-wrap select-none"
                    aria-label="Passage to type"
                  >
                    {passage.split('').map((char, i) => {
                      if (i >= input.length) {
                        return <span key={i} className="text-gray-500">{char}</span>;
                      }
                      const correct = passage[i] === input[i];
                      return (
                        <span
                          key={i}
                          className={correct ? 'text-green-400' : 'text-red-400 bg-red-400/20'}
                        >
                          {char}
                        </span>
                      );
                    })}
                  </p>
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onPaste={(e) => e.preventDefault()}
                    placeholder="Start typing here... (paste disabled)"
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
  );

  if (!asPage) {
    return (
      <div className="flex flex-col h-full min-h-0 overflow-auto">
        {gameContent}
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full">
      <div className="flex-1 min-w-0 flex flex-col h-full min-h-0 overflow-auto">
        {gameContent}
      </div>
      <aside
        className="flex-shrink-0 h-full bg-gray-900/80 border-l border-gray-800 overflow-hidden flex flex-col"
        style={{ width: '15%' }}
        aria-label="Advert"
      >
        <img
          src="/advert-banner.png"
          alt="Advert"
          className="w-full h-full object-contain object-center"
        />
      </aside>
    </div>
  );
}
