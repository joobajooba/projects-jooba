import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { supabase } from '../lib/supabase';

/**
 * Hook to fetch Connections game statistics for the current user.
 * Returns: total wins, total games, average mistakes (lives) used when won, daily streak.
 */
export function useConnectionsStats() {
  const { address } = useAccount();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!address || !supabase) {
      setStats({
        totalGames: 0,
        totalWins: 0,
        averageMistakesUsed: 0,
        dailyStreak: 0,
        games: [],
      });
      return;
    }

    const fetchStats = async () => {
      setLoading(true);
      setError(null);

      try {
        const walletAddress = address.toLowerCase();

        const { data: games, error: fetchError } = await supabase
          .from('connections_games')
          .select('*')
          .eq('wallet_address', walletAddress)
          .order('game_date', { ascending: false });

        if (fetchError) {
          throw fetchError;
        }

        if (!games || games.length === 0) {
          setStats({
            totalGames: 0,
            totalWins: 0,
            averageMistakesUsed: 0,
            dailyStreak: 0,
            games: [],
          });
          return;
        }

        const totalWins = games.filter((g) => g.won).length;
        const wonGames = games.filter((g) => g.won);
        const averageMistakesUsed =
          wonGames.length > 0
            ? wonGames.reduce((sum, g) => sum + (g.mistakes_used ?? 0), 0) / wonGames.length
            : 0;

        // Daily streak: consecutive days played (any play counts), ending at most recent game date
        const sortedDates = [...new Set(games.map((g) => g.game_date))].sort(
          (a, b) => new Date(b) - new Date(a)
        );
        let dailyStreak = 0;
        const today = new Date().toISOString().split('T')[0];
        const mostRecent = sortedDates[0];
        // Only count streak if they played today or yesterday (so streak is "current")
        const daysDiff = (new Date(today) - new Date(mostRecent)) / (1000 * 60 * 60 * 24);
        if (daysDiff > 1) {
          dailyStreak = 0;
        } else {
          let expected = new Date(mostRecent);
          for (const d of sortedDates) {
            const expectedStr = expected.toISOString().split('T')[0];
            if (d === expectedStr) {
              dailyStreak++;
              expected.setDate(expected.getDate() - 1);
            } else {
              break;
            }
          }
        }

        setStats({
          totalGames: games.length,
          totalWins,
          averageMistakesUsed: Math.round(averageMistakesUsed * 10) / 10,
          dailyStreak,
          games: games,
        });
      } catch (err) {
        console.error('Error fetching Connections stats:', err);
        setError(err?.message ?? 'Failed to load stats');
        setStats({
          totalGames: 0,
          totalWins: 0,
          averageMistakesUsed: 0,
          dailyStreak: 0,
          games: [],
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [address]);

  return { stats, loading, error };
}
