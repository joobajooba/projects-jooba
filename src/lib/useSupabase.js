import { useEffect, useState } from 'react';
import { supabase } from './supabase';

/**
 * Hook to test Supabase connection
 * Usage: const { connected, error } = useSupabase();
 */
export function useSupabase() {
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function testConnection() {
      try {
        // Test connection by fetching from a public table or using health check
        const { data, error: err } = await supabase.from('_realtime').select('*').limit(1);
        
        if (err && err.code !== 'PGRST116') {
          // PGRST116 means table doesn't exist, which is fine for connection test
          throw err;
        }
        
        setConnected(true);
        setError(null);
      } catch (err) {
        setError(err.message);
        setConnected(false);
      }
    }

    testConnection();
  }, []);

  return { connected, error };
}
