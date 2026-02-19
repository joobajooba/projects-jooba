import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './Wordle.css';

// Word list - 5-letter words (you can expand this or fetch from an API)
const WORDS = [
  'APPLE', 'BEACH', 'CHAIR', 'DANCE', 'EARTH', 'FLAME', 'GLASS', 'HEART',
  'IMAGE', 'JAZZY', 'KNIFE', 'LIGHT', 'MAGIC', 'NIGHT', 'OCEAN', 'PIANO',
  'QUART', 'RIVER', 'STORM', 'TABLE', 'UNITY', 'VALUE', 'WATER', 'YOUTH',
  'ZEBRA', 'BRAVE', 'CLOUD', 'DREAM', 'EAGLE', 'FROST', 'GREEN', 'HAPPY',
  'IVORY', 'JUMBO', 'KNEEL', 'LEMON', 'MUSIC', 'NOVEL', 'OLIVE', 'POWER',
  'QUICK', 'ROYAL', 'SMILE', 'TIGER', 'ULTRA', 'VIVID', 'WHEAT', 'XENON',
  'YACHT', 'ZONAL', 'BLAZE', 'CRANE', 'DROVE', 'ELITE', 'FLAIR', 'GRACE',
  'HONEY', 'INBOX', 'JOKER', 'KAYAK', 'LUNAR', 'MERRY', 'NINJA', 'OPERA',
  'PEARL', 'QUERY', 'RADIO', 'SCOUT', 'TULIP', 'URBAN', 'VOCAL', 'WALTZ',
  'XENIA', 'YOGIC', 'ZONED', 'BREAD', 'CRISP', 'DUSKY', 'ELBOW', 'FJORD',
  'GLIDE', 'HOVER', 'INLAY', 'JUMPS', 'KNEAD', 'LATCH', 'MIXER', 'NUDGE',
  'OCTAL', 'PIXEL', 'QUART', 'RELAY', 'SPLIT', 'TREND', 'UNZIP', 'VEXED',
  'WHELP', 'XYLOL', 'YODEL', 'ZONAL'
];

// Get today's word (same word for everyone on the same day)
const getTodaysWord = () => {
  const today = new Date();
  const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
  return WORDS[dayOfYear % WORDS.length].toUpperCase();
};

export default function Wordle() {
  const navigate = useNavigate();
  const [word, setWord] = useState('');
  const [guesses, setGuesses] = useState([]);
  const [currentGuess, setCurrentGuess] = useState('');
  const [gameStatus, setGameStatus] = useState('playing'); // 'playing', 'won', 'lost'
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Initialize with today's word
    setWord(getTodaysWord());
    // Load saved game state from localStorage
    const saved = localStorage.getItem('wordle-game');
    if (saved) {
      const savedData = JSON.parse(saved);
      const savedDate = new Date(savedData.date);
      const today = new Date();
      // Only restore if it's the same day
      if (savedDate.toDateString() === today.toDateString()) {
        setGuesses(savedData.guesses || []);
        setGameStatus(savedData.gameStatus || 'playing');
      }
    }
  }, []);

  // Save game state
  useEffect(() => {
    if (word) {
      localStorage.setItem('wordle-game', JSON.stringify({
        date: new Date().toISOString(),
        guesses,
        gameStatus,
        word
      }));
    }
  }, [guesses, gameStatus, word]);

  const checkWord = useCallback((guess) => {
    // Check if word is valid (5 letters, in word list)
    if (guess.length !== 5) return false;
    return WORDS.includes(guess.toUpperCase());
  }, []);

  const evaluateGuess = (guess, target) => {
    const result = Array(5).fill('absent');
    const targetLetters = target.split('');
    const guessLetters = guess.split('');

    // First pass: mark correct positions
    for (let i = 0; i < 5; i++) {
      if (guessLetters[i] === targetLetters[i]) {
        result[i] = 'correct';
        targetLetters[i] = null; // Mark as used
      }
    }

    // Second pass: mark present letters
    for (let i = 0; i < 5; i++) {
      if (result[i] !== 'correct') {
        const index = targetLetters.indexOf(guessLetters[i]);
        if (index !== -1) {
          result[i] = 'present';
          targetLetters[index] = null; // Mark as used
        }
      }
    }

    return result;
  };

  const handleKeyPress = (key) => {
    if (gameStatus !== 'playing') return;

    if (key === 'Enter') {
      if (currentGuess.length !== 5) {
        setMessage('Word must be 5 letters');
        setTimeout(() => setMessage(''), 2000);
        return;
      }

      if (!checkWord(currentGuess)) {
        setMessage('Not a valid word');
        setTimeout(() => setMessage(''), 2000);
        return;
      }

      const upperGuess = currentGuess.toUpperCase();
      const newGuesses = [...guesses, upperGuess];
      setGuesses(newGuesses);
      setCurrentGuess('');

      if (upperGuess === word) {
        setGameStatus('won');
        setMessage('Congratulations! You won!');
      } else if (newGuesses.length >= 6) {
        setGameStatus('lost');
        setMessage(`Game Over! The word was ${word}`);
      }
    } else if (key === 'Backspace') {
      setCurrentGuess(prev => prev.slice(0, -1));
    } else if (key.length === 1 && /[A-Za-z]/.test(key)) {
      if (currentGuess.length < 5) {
        setCurrentGuess(prev => prev + key.toUpperCase());
      }
    }
  };

  // Keyboard event handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Enter' || e.key === 'Backspace' || /^[A-Za-z]$/.test(e.key)) {
        e.preventDefault();
        handleKeyPress(e.key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentGuess, gameStatus, word]);

  const resetGame = () => {
    setGuesses([]);
    setCurrentGuess('');
    setGameStatus('playing');
    setMessage('');
    setWord(getTodaysWord());
    localStorage.removeItem('wordle-game');
  };

  return (
    <main className="wordle-main">
      <div className="wordle-container">
        <div className="wordle-header">
          <button className="wordle-back-btn" onClick={() => navigate('/games/')}>
            ← Back to Games
          </button>
          <h1 className="wordle-title">WORDLE</h1>
          <button className="wordle-reset-btn" onClick={resetGame}>
            Reset
          </button>
        </div>

        {message && (
          <div className={`wordle-message ${gameStatus}`}>
            {message}
          </div>
        )}

        <div className="wordle-board">
          {Array.from({ length: 6 }).map((_, rowIndex) => {
            const guess = guesses[rowIndex] || '';
            const isCurrentRow = rowIndex === guesses.length;
            const evaluation = guesses[rowIndex] ? evaluateGuess(guesses[rowIndex], word) : null;

            return (
              <div key={rowIndex} className="wordle-row">
                {Array.from({ length: 5 }).map((_, colIndex) => {
                  const letter = isCurrentRow && colIndex < currentGuess.length
                    ? currentGuess[colIndex]
                    : guess[colIndex] || '';
                  const state = evaluation ? evaluation[colIndex] : '';

                  return (
                    <div
                      key={colIndex}
                      className={`wordle-tile ${state} ${isCurrentRow && colIndex === currentGuess.length ? 'active' : ''}`}
                    >
                      {letter}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        <div className="wordle-keyboard">
          <div className="keyboard-row">
            {['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'].map(key => (
              <button
                key={key}
                className="keyboard-key"
                onClick={() => handleKeyPress(key)}
              >
                {key}
              </button>
            ))}
          </div>
          <div className="keyboard-row">
            {['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'].map(key => (
              <button
                key={key}
                className="keyboard-key"
                onClick={() => handleKeyPress(key)}
              >
                {key}
              </button>
            ))}
          </div>
          <div className="keyboard-row">
            <button className="keyboard-key keyboard-key-wide" onClick={() => handleKeyPress('Enter')}>
              ENTER
            </button>
            {['Z', 'X', 'C', 'V', 'B', 'N', 'M'].map(key => (
              <button
                key={key}
                className="keyboard-key"
                onClick={() => handleKeyPress(key)}
              >
                {key}
              </button>
            ))}
            <button className="keyboard-key keyboard-key-wide" onClick={() => handleKeyPress('Backspace')}>
              ⌫
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
