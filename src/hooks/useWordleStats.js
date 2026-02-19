import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { supabase } from '../lib/supabase';

/**
 * Hook to fetch Wordle statistics for the current user
 * Returns: games played, win rate, current streak, average guesses, etc.
 */
export function useWordleStats() {
  const { address } = useAccount();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!address || !supabase) {
      setStats(null);
      return;
    }

    const fetchStats = async () => {
      setLoading(true);
      setError(null);

      try {
        const walletAddress = address.toLowerCase();

        // Fetch all games for this user
        const { data: games, error: fetchError } = await supabase
          .from('wordle_games')
          .select('*')
          .eq('wallet_address', walletAddress)
          .order('game_date', { ascending: false });

        if (fetchError) {
          throw fetchError;
        }

        if (!games || games.length === 0) {
          setStats({
            totalGames: 0,
            wins: 0,
            losses: 0,
            winRate: 0,
            currentStreak: 0,
            longestStreak: 0,
            averageGuesses: 0,
            games: []
          });
          return;
        }

        // Calculate statistics
        const wins = games.filter(g => g.won).length;
        const losses = games.filter(g => !g.won).length;
        const winRate = games.length > 0 ? (wins / games.length) * 100 : 0;
        
        // Calculate average guesses (only for won games)
        const wonGames = games.filter(g => g.won);
        const averageGuesses = wonGames.length > 0
          ? wonGames.reduce((sum, g) => sum + g.guesses, 0) / wonGames.length
          : 0;

        // Calculate current streak
        let currentStreak = 0;
        const sortedGames = [...games].sort((a, b) => 
          new Date(b.game_date) - new Date(a.game_date)
        );
        
        for (const game of sortedGames) {
          if (game.won) {
            currentStreak++;
          } else {
            break;
          }
        }

        // Calculate longest streak
        let longestStreak = 0;
        let tempStreak = 0;
        for (const game of sortedGames) {
          if (game.won) {
            tempStreak++;
            longestStreak = Math.max(longestStreak, tempStreak);
          } else {
            tempStreak = 0;
          }
        }

        setStats({
          totalGames: games.length,
          wins,
          losses,
          winRate: Math.round(winRate * 10) / 10, // Round to 1 decimal
          currentStreak,
          longestStreak,
          averageGuesses: Math.round(averageGuesses * 10) / 10, // Round to 1 decimal
          games: sortedGames
        });
      } catch (err) {
        console.error('Error fetching Wordle stats:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [address]);

  return { stats, loading, error };
}
