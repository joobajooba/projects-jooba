import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './Connections.css';

// Fetch today's Connections puzzle
const fetchTodaysPuzzle = async () => {
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    // Fetch from GitHub JSON file (official NYT Connections answers repository)
    const githubResponse = await fetch('https://raw.githubusercontent.com/Eyefyre/NYT-Connections-Answers/main/connections.json');
    if (!githubResponse.ok) {
      throw new Error('Failed to fetch puzzle data');
    }
    
    const allPuzzles = await githubResponse.json();
    
    // Find today's puzzle by date
    const todaysPuzzle = allPuzzles.find(p => p.date === today);
    
    if (todaysPuzzle) {
      return formatPuzzleFromGitHub(todaysPuzzle);
    }
    
    // If today's puzzle not found, use the most recent one
    const sortedPuzzles = allPuzzles.sort((a, b) => new Date(b.date) - new Date(a.date));
    if (sortedPuzzles.length > 0) {
      return formatPuzzleFromGitHub(sortedPuzzles[0]);
    }
    
    throw new Error('No puzzles available');
    
  } catch (error) {
    console.error('Error fetching Connections puzzle:', error);
    // Return a fallback puzzle
    return getFallbackPuzzle();
  }
};


// Format puzzle data from GitHub JSON
const formatPuzzleFromGitHub = (puzzle) => {
  const allWords = [];
  
  puzzle.answers.forEach((answer, index) => {
    answer.members.forEach(word => {
      allWords.push({
        word: word.toUpperCase(),
        groupIndex: answer.level,
        level: answer.level,
        groupName: answer.group
      });
    });
  });
  
  // Shuffle words
  const shuffled = shuffleArray([...allWords]);
  
  return {
    words: shuffled,
    groups: puzzle.answers.map(a => ({
      level: a.level,
      groupName: a.group,
      members: a.members.map(w => w.toUpperCase())
    })),
    date: puzzle.date
  };
};

// Fallback puzzle if fetch fails
const getFallbackPuzzle = () => {
  const fallback = {
    words: shuffleArray([
      { word: 'HAIL', groupIndex: 0, level: 0, groupName: 'WET WEATHER' },
      { word: 'RAIN', groupIndex: 0, level: 0, groupName: 'WET WEATHER' },
      { word: 'SLEET', groupIndex: 0, level: 0, groupName: 'WET WEATHER' },
      { word: 'SNOW', groupIndex: 0, level: 0, groupName: 'WET WEATHER' },
      { word: 'BUCKS', groupIndex: 1, level: 1, groupName: 'NBA TEAMS' },
      { word: 'HEAT', groupIndex: 1, level: 1, groupName: 'NBA TEAMS' },
      { word: 'JAZZ', groupIndex: 1, level: 1, groupName: 'NBA TEAMS' },
      { word: 'NETS', groupIndex: 1, level: 1, groupName: 'NBA TEAMS' },
      { word: 'OPTION', groupIndex: 2, level: 2, groupName: 'KEYBOARD KEYS' },
      { word: 'RETURN', groupIndex: 2, level: 2, groupName: 'KEYBOARD KEYS' },
      { word: 'SHIFT', groupIndex: 2, level: 2, groupName: 'KEYBOARD KEYS' },
      { word: 'TAB', groupIndex: 2, level: 2, groupName: 'KEYBOARD KEYS' },
      { word: 'KAYAK', groupIndex: 3, level: 3, groupName: 'PALINDROMES' },
      { word: 'LEVEL', groupIndex: 3, level: 3, groupName: 'PALINDROMES' },
      { word: 'MOM', groupIndex: 3, level: 3, groupName: 'PALINDROMES' },
      { word: 'RACECAR', groupIndex: 3, level: 3, groupName: 'PALINDROMES' }
    ]),
    groups: [
      { level: 0, groupName: 'WET WEATHER', members: ['HAIL', 'RAIN', 'SLEET', 'SNOW'] },
      { level: 1, groupName: 'NBA TEAMS', members: ['BUCKS', 'HEAT', 'JAZZ', 'NETS'] },
      { level: 2, groupName: 'KEYBOARD KEYS', members: ['OPTION', 'RETURN', 'SHIFT', 'TAB'] },
      { level: 3, groupName: 'PALINDROMES', members: ['KAYAK', 'LEVEL', 'MOM', 'RACECAR'] }
    ],
    date: new Date().toISOString().split('T')[0]
  };
  return fallback;
};

// Shuffle array
const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export default function Connections() {
  const navigate = useNavigate();
  const [puzzle, setPuzzle] = useState(null);
  const [selectedWords, setSelectedWords] = useState([]);
  const [foundGroups, setFoundGroups] = useState([]);
  const [mistakes, setMistakes] = useState(0);
  const [gameStatus, setGameStatus] = useState('playing'); // 'playing', 'won', 'lost'
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPuzzle = async () => {
      setLoading(true);
      const puzzleData = await fetchTodaysPuzzle();
      setPuzzle(puzzleData);
      setLoading(false);
    };
    loadPuzzle();
  }, []);

  const handleWordClick = (word) => {
    if (gameStatus !== 'playing' || foundGroups.some(g => g.members.includes(word.word))) {
      return;
    }

    setSelectedWords(prev => {
      if (prev.find(w => w.word === word.word)) {
        // Deselect if already selected
        return prev.filter(w => w.word !== word.word);
      } else if (prev.length < 4) {
        // Add to selection
        return [...prev, word];
      } else {
        // Replace selection
        return [word];
      }
    });
  };

  const checkSelection = useCallback(() => {
    if (selectedWords.length !== 4 || !puzzle) return;

    // Get the actual word strings from selected words (normalized and sorted)
    const selectedWordStrings = selectedWords.map(w => w.word.toUpperCase().trim()).sort();
    
    // Check if these words match any group's members exactly
    let matchedGroup = null;
    for (const group of puzzle.groups) {
      const groupMembers = group.members.map(m => m.toUpperCase().trim()).sort();
      // Check if selected words match this group's members exactly
      if (selectedWordStrings.length === groupMembers.length &&
          selectedWordStrings.every((word, idx) => word === groupMembers[idx])) {
        matchedGroup = group;
        break;
      }
    }

    if (matchedGroup) {
      // Check if this group was already found by comparing members
      const matchedMembers = matchedGroup.members.map(m => m.toUpperCase().trim()).sort();
      const isAlreadyFound = foundGroups.some(g => {
        const gMembers = g.members.map(m => m.toUpperCase().trim()).sort();
        return gMembers.length === matchedMembers.length &&
               gMembers.every((m, i) => m === matchedMembers[i]);
      });

      if (isAlreadyFound) {
        // Already found - treat as mistake
        const newMistakes = mistakes + 1;
        setMistakes(newMistakes);
        setSelectedWords([]);
        
        if (newMistakes >= 4) {
          setGameStatus('lost');
          setMessage('Game Over!');
        } else {
          setMessage(`Already found!`);
          setTimeout(() => setMessage(''), 2000);
        }
      } else {
        // New group found!
        setFoundGroups(prev => {
          const newFoundGroups = [...prev, matchedGroup];
          // Check if game is won
          if (newFoundGroups.length === 4) {
            setGameStatus('won');
            setMessage('Perfect!');
          } else {
            setMessage(`Correct! ${matchedGroup.groupName}`);
            setTimeout(() => setMessage(''), 2000);
          }
          return newFoundGroups;
        });
        setSelectedWords([]);
      }
    } else {
      // Wrong selection
      const newMistakes = mistakes + 1;
      setMistakes(newMistakes);
      setSelectedWords([]);
      
      if (newMistakes >= 4) {
        setGameStatus('lost');
        setMessage('Game Over!');
      } else {
        setMessage(`One away...`);
        setTimeout(() => setMessage(''), 2000);
      }
    }
  }, [selectedWords, puzzle, foundGroups, mistakes]);

  useEffect(() => {
    if (selectedWords.length === 4) {
      const timer = setTimeout(() => {
        checkSelection();
      }, 300); // Small delay to show selection
      return () => clearTimeout(timer);
    }
  }, [selectedWords.length, checkSelection]);

  const getLevelColor = (level) => {
    const colors = {
      0: '#f7da21', // Yellow
      1: '#6cbd45', // Green
      2: '#3a9eea', // Blue
      3: '#9d5fb0'  // Purple
    };
    return colors[level] || '#666';
  };

  const getLevelName = (level) => {
    const names = {
      0: 'Yellow',
      1: 'Green',
      2: 'Blue',
      3: 'Purple'
    };
    return names[level] || '';
  };

  const resetGame = () => {
    setSelectedWords([]);
    setFoundGroups([]);
    setMistakes(0);
    setGameStatus('playing');
    setMessage('');
    if (puzzle) {
      setPuzzle({
        ...puzzle,
        words: shuffleArray([...puzzle.words])
      });
    }
  };

  if (loading) {
    return (
      <main className="connections-main">
        <div className="connections-container">
          <div className="connections-loading">Loading puzzle...</div>
        </div>
      </main>
    );
  }

  if (!puzzle) {
    return (
      <main className="connections-main">
        <div className="connections-container">
          <div className="connections-error">Failed to load puzzle. Please try again.</div>
        </div>
      </main>
    );
  }

  return (
    <main className="connections-main">
      <div className="connections-container">
        <div className="connections-header">
          <button className="connections-back-btn" onClick={() => navigate('/games/')}>
            ← Back to Games
          </button>
          <h1 className="connections-title">CONNECTIONS</h1>
          <button className="connections-reset-btn" onClick={resetGame}>
            Reset
          </button>
        </div>

        <div className="connections-subtitle">
          Find groups of four items that share something in common
        </div>

        {message && (
          <div className={`connections-message ${gameStatus}`}>
            {message}
          </div>
        )}

        <div className="connections-mistakes">
          Mistakes remaining: {4 - mistakes}
        </div>

        <div className="connections-board">
          {puzzle.words.map((wordObj, index) => {
            const isSelected = selectedWords.find(w => w.word === wordObj.word);
            const foundGroup = foundGroups.find(g => g.members.includes(wordObj.word));
            const isDisabled = foundGroup || gameStatus !== 'playing';

            return (
              <button
                key={`${wordObj.word}-${index}`}
                className={`connections-word ${isSelected ? 'selected' : ''} ${foundGroup ? 'found' : ''}`}
                style={{
                  backgroundColor: foundGroup ? getLevelColor(foundGroup.level) : '',
                  color: foundGroup ? '#fff' : '',
                  cursor: isDisabled ? 'default' : 'pointer'
                }}
                onClick={() => handleWordClick(wordObj)}
                disabled={isDisabled}
              >
                {wordObj.word}
              </button>
            );
          })}
        </div>

        {selectedWords.length > 0 && selectedWords.length < 4 && (
          <div className="connections-selection-hint">
            Select {4 - selectedWords.length} more
          </div>
        )}

        {foundGroups.length > 0 && (
          <div className="connections-found-groups">
            <h3>Found Groups:</h3>
            {foundGroups.map((group, index) => (
              <div
                key={index}
                className="connections-found-group"
                style={{ backgroundColor: getLevelColor(group.level) }}
              >
                <span className="connections-found-level">{getLevelName(group.level)}</span>
                <span className="connections-found-name">{group.groupName}</span>
                <div className="connections-found-members">
                  {group.members.join(' • ')}
                </div>
              </div>
            ))}
          </div>
        )}

        {gameStatus === 'won' && (
          <div className="connections-win-message">
            <h2>🎉 Perfect!</h2>
            <p>You found all four groups!</p>
          </div>
        )}

        {gameStatus === 'lost' && (
          <div className="connections-lose-message">
            <h2>Game Over</h2>
            <p>You've made 4 mistakes. Try again tomorrow!</p>
          </div>
        )}
      </div>
    </main>
  );
}
