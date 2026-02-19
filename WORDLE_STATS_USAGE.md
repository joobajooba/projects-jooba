# Wordle Stats Usage Guide

## Database Setup

1. **Run the SQL migration:**
   ```sql
   -- Execute: create-wordle-games-table.sql in Supabase SQL Editor
   ```

   This creates the `wordle_games` table with:
   - `wallet_address` - User's wallet
   - `game_date` - Date played (YYYY-MM-DD)
   - `word` - The word that was played
   - `guesses` - Number of guesses (1-6)
   - `won` - Boolean (true/false)
   - Unique constraint: one game per user per day

## Automatic Tracking

Game results are **automatically saved** when:
- User wins the game (saves with number of guesses)
- User loses the game (saves with 6 guesses)

The game is saved to the database when the game ends, linked to the user's wallet address.

## Using Stats in Your Components

### Example: Display Stats on Profile Page

```javascript
import { useWordleStats } from '../hooks/useWordleStats';

function ProfileStats() {
  const { stats, loading, error } = useWordleStats();

  if (loading) return <div>Loading stats...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!stats || stats.totalGames === 0) {
    return <div>No games played yet</div>;
  }

  return (
    <div className="wordle-stats">
      <h3>Wordle Stats</h3>
      <div className="stat-item">
        <span>Games Played:</span> {stats.totalGames}
      </div>
      <div className="stat-item">
        <span>Win Rate:</span> {stats.winRate}%
      </div>
      <div className="stat-item">
        <span>Current Streak:</span> {stats.currentStreak}
      </div>
      <div className="stat-item">
        <span>Longest Streak:</span> {stats.longestStreak}
      </div>
      <div className="stat-item">
        <span>Average Guesses:</span> {stats.averageGuesses}
      </div>
    </div>
  );
}
```

### Available Stats

The `useWordleStats` hook returns:

```javascript
{
  totalGames: number,      // Total games played
  wins: number,            // Number of wins
  losses: number,         // Number of losses
  winRate: number,        // Win percentage (0-100)
  currentStreak: number,   // Current win streak
  longestStreak: number,   // Longest win streak ever
  averageGuesses: number,  // Average guesses for won games
  games: array            // Array of all games (sorted by date, newest first)
}
```

## Leaderboard Example

### Fetch Top Players

```javascript
// In a leaderboard component
const fetchLeaderboard = async () => {
  const { data, error } = await supabase
    .from('wordle_games')
    .select(`
      wallet_address,
      won,
      guesses,
      game_date
    `)
    .eq('won', true)
    .order('guesses', { ascending: true })
    .order('game_date', { ascending: false })
    .limit(100);

  // Group by wallet_address and calculate stats
  const leaderboard = {};
  data?.forEach(game => {
    if (!leaderboard[game.wallet_address]) {
      leaderboard[game.wallet_address] = {
        wallet: game.wallet_address,
        wins: 0,
        totalGuesses: 0,
        games: []
      };
    }
    leaderboard[game.wallet_address].wins++;
    leaderboard[game.wallet_address].totalGuesses += game.guesses;
    leaderboard[game.wallet_address].games.push(game);
  });

  // Calculate averages and sort
  return Object.values(leaderboard)
    .map(player => ({
      ...player,
      avgGuesses: player.totalGuesses / player.wins
    }))
    .sort((a, b) => {
      // Sort by wins first, then by average guesses
      if (b.wins !== a.wins) return b.wins - a.wins;
      return a.avgGuesses - b.avgGuesses;
    });
};
```

### Streak Leaderboard

```javascript
const fetchStreakLeaderboard = async () => {
  const { data, error } = await supabase
    .from('wordle_games')
    .select('wallet_address, won, game_date')
    .order('game_date', { ascending: false });

  // Calculate streaks for each user
  const streaks = {};
  
  data?.forEach(game => {
    const wallet = game.wallet_address;
    if (!streaks[wallet]) {
      streaks[wallet] = { current: 0, longest: 0, temp: 0 };
    }
    
    if (game.won) {
      streaks[wallet].temp++;
      streaks[wallet].current = Math.max(streaks[wallet].current, streaks[wallet].temp);
      streaks[wallet].longest = Math.max(streaks[wallet].longest, streaks[wallet].temp);
    } else {
      streaks[wallet].temp = 0;
    }
  });

  return Object.entries(streaks)
    .map(([wallet, stats]) => ({ wallet, ...stats }))
    .sort((a, b) => b.longest - a.longest);
};
```

## Next Steps

1. ✅ Database table created
2. ✅ Game results automatically saved
3. ✅ Stats hook available
4. 🎯 Add stats display to Profile page
5. 🎯 Create Leaderboard page/component
6. 🎯 Add streak badges/achievements

## Notes

- **One game per day**: The unique constraint prevents multiple games on the same day
- **Automatic saving**: Games are saved when they end (win or loss)
- **Wallet-based**: All stats are tied to wallet addresses
- **Public read**: Currently allows public read for leaderboards (can be restricted later)
