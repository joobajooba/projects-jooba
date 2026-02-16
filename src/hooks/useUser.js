import { useEffect, useState, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { supabase } from '../lib/supabase';

/**
 * Hook to get current user data from Supabase based on connected wallet
 * Returns user data if found, null if not found or not connected
 */
export function useUser() {
  const { address, isConnected } = useAccount();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchUser = useCallback(async () => {
    if (!isConnected || !address) {
      setUser(null);
      setLoading(false);
      return;
    }

    // Skip if Supabase client is not initialized
    if (!supabase) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const { data, error: err } = await supabase
        .from('users')
        .select('*')
        .eq('wallet_address', address.toLowerCase())
        .single();

      if (err) {
        if (err.code === 'PGRST116') {
          // No user found - this is okay
          setUser(null);
        } else {
          setError(err.message);
        }
        return;
      }

      setUser(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [address, isConnected]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser, refreshKey]);

  // Function to manually refresh user data
  const refetch = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  return { user, loading, error, refetch };
}
