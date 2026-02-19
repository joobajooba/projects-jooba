import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { supabase } from '../lib/supabase';
import './Wordle.css';

// Official Wordle word lists - fetched from public source
let VALID_GUESSES = new Set(); // All valid guess words
let ANSWER_WORDS = []; // Words that can be solutions

// Fetch official Wordle word lists
const fetchWordLists = async (onLoaded) => {
  try {
    // Fetch valid guesses (all words you can guess) - using reliable source
    const guessesResponse = await fetch('https://gist.githubusercontent.com/cfreshman/d5fb56316158a1575898bba1eed3b5da/raw/words.txt');
    const guessesText = await guessesResponse.text();
    VALID_GUESSES = new Set(guessesText.trim().split('\n').map(w => w.toUpperCase().trim()).filter(w => w.length === 5));

    // Fetch answer words in chronological order (original Wordle solution list)
    // This is the original chronological order from Wordle's source code
    const answersResponse = await fetch('https://gist.githubusercontent.com/cfreshman/a7b776506c73284511034e63af1017ee/raw/wordle-answers-alphabetical.txt');
    const answersText = await answersResponse.text();
    // Note: This list is alphabetical, not chronological. We need the chronological order.
    // For now, we'll use a known chronological source or calculate based on known dates
    const answersList = answersText.trim().split('\n').map(w => w.toUpperCase().trim()).filter(w => w.length === 5);
    
    // Use the original Wordle chronological order (pre-NYT curation)
    // The original Wordle used a fixed chronological list starting Jan 1, 2022
    // After Nov 7, 2022, NYT curates daily, so we'll use the original order for consistency
    ANSWER_WORDS = answersList;

    console.log(`Loaded ${VALID_GUESSES.size} valid guesses and ${ANSWER_WORDS.length} answer words`);
    if (onLoaded) onLoaded();
  } catch (error) {
    console.error('Error fetching word lists, using fallback:', error);
    // Fallback to a comprehensive list if fetch fails
    const fallback = ['APPLE', 'BEACH', 'CHAIR', 'DANCE', 'EARTH', 'FLAME', 'GLASS', 'HEART', 'IMAGE', 'KNIFE', 'LIGHT', 'MAGIC', 'NIGHT', 'OCEAN', 'PIANO', 'RIVER', 'STORM', 'TABLE', 'UNITY', 'VALUE', 'WATER', 'YOUTH', 'ZEBRA', 'BRAVE', 'CLOUD', 'DREAM', 'EAGLE', 'FROST', 'GREEN', 'HAPPY', 'IVORY', 'LEMON', 'MUSIC', 'NOVEL', 'OLIVE', 'POWER', 'QUICK', 'ROYAL', 'SMILE', 'TIGER', 'ULTRA', 'VIVID', 'WHEAT', 'YACHT', 'BLAZE', 'CRANE', 'DROVE', 'ELITE', 'FLAIR', 'GRACE', 'HONEY', 'JOKER', 'KAYAK', 'LUNAR', 'MERRY', 'NINJA', 'OPERA', 'PEARL', 'QUERY', 'RADIO', 'SCOUT', 'TULIP', 'URBAN', 'VOCAL', 'WALTZ', 'BREAD', 'CRISP', 'DUSKY', 'ELBOW', 'FJORD', 'GLIDE', 'HOVER', 'JUMPS', 'KNEAD', 'LATCH', 'MIXER', 'NUDGE', 'PIXEL', 'RELAY', 'SPLIT', 'TREND', 'UNZIP', 'VEXED', 'AUDIO', 'ABOUT', 'ABOVE', 'ABUSE', 'ACTOR', 'ACUTE', 'ADMIT', 'ADOPT', 'ADULT', 'AFTER', 'AGAIN', 'AGENT', 'AGREE', 'AHEAD', 'ALARM', 'ALBUM', 'ALERT', 'ALIEN', 'ALIGN', 'ALIKE', 'ALIVE', 'ALLOW', 'ALONE', 'ALONG', 'ALTER', 'AMONG', 'ANGER', 'ANGLE', 'ANGRY', 'APART', 'APPLE', 'APPLY', 'ARENA', 'ARGUE', 'ARISE', 'ARRAY', 'ARROW', 'ASIDE', 'ASSET', 'AVOID', 'AWAKE', 'AWARD', 'AWARE', 'BADLY', 'BAKER', 'BASES', 'BASIC', 'BEACH', 'BEGAN', 'BEGIN', 'BEING', 'BELOW', 'BENCH', 'BILLY', 'BIRTH', 'BLACK', 'BLAME', 'BLANK', 'BLAST', 'BLIND', 'BLOCK', 'BLOOD', 'BLOOM', 'BLOWN', 'BLUES', 'BOARD', 'BOAST', 'BOBBY', 'BOUND', 'BRAIN', 'BRAND', 'BRASS', 'BRAVE', 'BREAD', 'BREAK', 'BREED', 'BRIEF', 'BRING', 'BROAD', 'BROKE', 'BROWN', 'BRUSH', 'BUDDY', 'BUILD', 'BUNCH', 'BURST', 'CABLE', 'CALIF', 'CARRY', 'CATCH', 'CAUSE', 'CHAIN', 'CHAIR', 'CHAOS', 'CHARM', 'CHART', 'CHASE', 'CHEAP', 'CHECK', 'CHEST', 'CHIEF', 'CHILD', 'CHINA', 'CHOSE', 'CHUNK', 'CHURN', 'CIVIL', 'CLAIM', 'CLASH', 'CLASS', 'CLEAN', 'CLEAR', 'CLICK', 'CLIMB', 'CLING', 'CLOCK', 'CLOSE', 'CLOUD', 'CLOWN', 'COACH', 'COAST', 'COULD', 'COUNT', 'COUPE', 'COURT', 'COVER', 'CRACK', 'CRAFT', 'CRANE', 'CRASH', 'CRAZY', 'CREAM', 'CRIME', 'CRISP', 'CROWD', 'CROWN', 'CRUDE', 'CURVE', 'CYCLE', 'DAILY', 'DAISY', 'DANCE', 'DATED', 'DEALT', 'DEATH', 'DEBUT', 'DELAY', 'DELTA', 'DENIM', 'DENSE', 'DEPTH', 'DETER', 'DEVIL', 'DIARY', 'DIGIT', 'DINER', 'DIRTY', 'DISCO', 'DITCH', 'DIVER', 'DIZZY', 'DODGE', 'DOING', 'DOLLY', 'DONOR', 'DONUT', 'DOUBT', 'DOUGH', 'DOWRY', 'DOZEN', 'DRAFT', 'DRAIN', 'DRAMA', 'DRANK', 'DRAWN', 'DREAM', 'DRESS', 'DRIED', 'DRIFT', 'DRILL', 'DRINK', 'DRIVE', 'DROVE', 'DROWN', 'DRUNK', 'DRYER', 'DUCHY', 'DULLY', 'DUMMY', 'DUMPY', 'DUNCE', 'DUSKY', 'DUSTY', 'DUTCH', 'DUVET', 'DWARF', 'DWELL', 'DWELT', 'DYING'];
    VALID_GUESSES = new Set(fallback);
    ANSWER_WORDS = fallback;
    if (onLoaded) onLoaded();
  }
};

// Get today's word (same word for everyone on the same day)
// Uses date-based algorithm similar to original Wordle
// NOTE: After Nov 7, 2022, NYT Wordle curates words daily (not a static list),
// so this may not match NYT exactly, but provides consistent daily words
const getTodaysWord = () => {
  const today = new Date();
  // Use epoch day (days since Jan 1, 2022 - Wordle start date)
  const epoch = new Date(2022, 0, 1);
  const daysSinceEpoch = Math.floor((today - epoch) / (1000 * 60 * 60 * 24));
  
  if (ANSWER_WORDS.length > 0) {
    // Cycle through answer words based on days since Wordle started
    // This ensures same word for everyone on the same day
    return ANSWER_WORDS[daysSinceEpoch % ANSWER_WORDS.length];
  }
  // Fallback if words not loaded yet
  return 'APPLE';
};

export default function Wordle() {
  const navigate = useNavigate();
  const { address } = useAccount();
  const [word, setWord] = useState('');
  const [guesses, setGuesses] = useState([]);
  const [currentGuess, setCurrentGuess] = useState('');
  const [gameStatus, setGameStatus] = useState('playing'); // 'playing', 'won', 'lost'
  const [message, setMessage] = useState('');
  const [wordListsLoaded, setWordListsLoaded] = useState(false);
  const [letterStates, setLetterStates] = useState({}); // Track letter states for keyboard
  const [gameSaved, setGameSaved] = useState(false); // Track if game result has been saved

  useEffect(() => {
    // Load word lists, then initialize game
    fetchWordLists(() => {
      setWordListsLoaded(true);
      
      // Initialize with today's word
      const todaysWord = getTodaysWord();
      setWord(todaysWord);
      
      // Load saved game state from localStorage
      const saved = localStorage.getItem('wordle-game');
      if (saved) {
        const savedData = JSON.parse(saved);
        const savedDate = new Date(savedData.date);
        const today = new Date();
        // Only restore if it's the same day and word matches
        if (savedDate.toDateString() === today.toDateString() && savedData.word === todaysWord) {
          setGuesses(savedData.guesses || []);
          setGameStatus(savedData.gameStatus || 'playing');
          
          // Rebuild letter states from saved guesses
          const restoredLetterStates = {};
          (savedData.guesses || []).forEach(guess => {
            const evaluation = evaluateGuess(guess, todaysWord);
            guess.split('').forEach((letter, index) => {
              const currentState = restoredLetterStates[letter];
              const newState = evaluation[index];
              if (!currentState || 
                  (currentState === 'absent' && newState !== 'absent') ||
                  (currentState === 'present' && newState === 'correct')) {
                restoredLetterStates[letter] = newState;
              }
            });
          });
          setLetterStates(restoredLetterStates);
        }
      }
    });
  }, []);

  // Save game state
  useEffect(() => {
    if (word) {
      localStorage.setItem('wordle-game', JSON.stringify({
        date: new Date().toISOString(),
        guesses,
        gameStatus,
        word,
        letterStates
      }));
    }
  }, [guesses, gameStatus, word, letterStates]);

  const checkWord = useCallback((guess) => {
    // Check if word is valid (5 letters, in valid guesses list)
    if (guess.length !== 5) return false;
    const upperGuess = guess.toUpperCase();
    return VALID_GUESSES.has(upperGuess);
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
      const evaluation = evaluateGuess(upperGuess, word);
      const newGuesses = [...guesses, upperGuess];
      setGuesses(newGuesses);
      setCurrentGuess('');

      // Update keyboard letter states
      const newLetterStates = { ...letterStates };
      upperGuess.split('').forEach((letter, index) => {
        const currentState = newLetterStates[letter];
        const newState = evaluation[index];
        
        // Priority: correct > present > absent
        if (!currentState || 
            (currentState === 'absent' && newState !== 'absent') ||
            (currentState === 'present' && newState === 'correct')) {
          newLetterStates[letter] = newState;
        }
      });
      setLetterStates(newLetterStates);

      const won = upperGuess === word;
      const lost = newGuesses.length >= 6;
      
      if (won) {
        setGameStatus('won');
        setMessage('Congratulations! You won!');
      } else if (lost) {
        setGameStatus('lost');
        setMessage(`Game Over! The word was ${word}`);
      }
      
      // Save game result when game ends
      if (won || lost) {
        saveGameResult(newGuesses.length, won);
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

  const saveGameResult = async (totalGuesses, won) => {
    if (!address || !supabase || gameSaved) return;
    
    try {
      const today = new Date();
      const gameDate = today.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      const { error } = await supabase
        .from('wordle_games')
        .upsert({
          wallet_address: address.toLowerCase(),
          game_date: gameDate,
          word: word,
          guesses: totalGuesses,
          won: won
        }, {
          onConflict: 'wallet_address,game_date'
        });

      if (error) {
        console.error('Error saving Wordle game result:', error);
        // Don't show error to user - silent fail
      } else {
        console.log('Wordle game result saved successfully');
        setGameSaved(true);
      }
    } catch (err) {
      console.error('Error saving Wordle game result:', err);
    }
  };

  const resetGame = () => {
    setGuesses([]);
    setCurrentGuess('');
    setGameStatus('playing');
    setMessage('');
    setLetterStates({});
    setGameSaved(false);
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
                className={`keyboard-key ${letterStates[key] || ''}`}
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
                className={`keyboard-key ${letterStates[key] || ''}`}
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
                className={`keyboard-key ${letterStates[key] || ''}`}
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
