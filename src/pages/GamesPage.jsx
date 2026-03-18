import { useState } from 'react';
import WordleGame from '../components/WordleGame';
import TypeRacerGame from '../components/TypeRacerGame';

export default function GamesPage() {
  const [view, setView] = useState('list'); // 'list' | 'wordle' | 'typeracer'

  if (view === 'wordle') {
    return (
      <WordleGame
        asPage
        onClose={() => setView('list')}
      />
    );
  }

  if (view === 'typeracer') {
    return (
      <TypeRacerGame
        asPage
        onClose={() => setView('list')}
      />
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 overflow-auto">
      <div className="p-6">
        <h1 className="text-xl font-semibold text-gray-100 mb-6">Games</h1>
        <div className="flex flex-wrap gap-4">
          <button
            type="button"
            onClick={() => setView('wordle')}
            className="aspect-square w-[24rem] sm:w-[30rem] rounded-xl border-2 border-gray-600 bg-gray-800 hover:border-indigo-500 hover:bg-gray-700 flex items-center justify-center transition-colors overflow-hidden relative"
            aria-label="Play Wordle"
          >
            <img
              src="/wordle-splash.png"
              alt="Wordle splash art"
              className="absolute inset-0 w-full h-full object-cover"
            />
          </button>
          <button
            type="button"
            onClick={() => setView('typeracer')}
            className="aspect-square w-[24rem] sm:w-[30rem] rounded-xl border-2 border-gray-600 bg-gray-800 hover:border-indigo-500 hover:bg-gray-700 flex items-center justify-center transition-colors overflow-hidden relative"
            aria-label="Play Type Racer"
          >
            <img
              src="/typeracer-splash.png"
              alt="TypeRacer splash art"
              className="absolute inset-0 w-full h-full object-cover"
            />
          </button>
        </div>
      </div>
    </div>
  );
}
