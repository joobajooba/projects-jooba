import { useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';
import { supabase } from '../lib/supabase';

/**
 * Hook to automatically sync connected wallet address to Supabase users table
 * Uses upsert to handle both new users and existing users
 */
export function useSyncWalletToSupabase() {
  const { address, isConnected } = useAccount();
  const syncedRef = useRef(false);

  useEffect(() => {
    // Only sync if wallet is connected and we haven't synced this address yet
    if (!isConnected || !address || syncedRef.current === address) {
      return;
    }

    async function syncWalletAddress() {
      // Skip if Supabase client is not initialized (missing env var)
      if (!supabase) {
        console.warn('Supabase client not initialized. Set VITE_SUPABASE_ANON_KEY in environment variables.');
        return;
      }

      try {
        const walletAddress = address.toLowerCase();
        const now = new Date().toISOString();

        // First, check if user already exists
        const { data: existingUser } = await supabase
          .from('users')
          .select('wallet_address')
          .eq('wallet_address', walletAddress)
          .single();

        let result;
        if (existingUser) {
          // Update existing user
          result = await supabase
            .from('users')
            .update({ updated_at: now })
            .eq('wallet_address', walletAddress)
            .select();
        } else {
          // Insert new user
          result = await supabase
            .from('users')
            .insert({
              wallet_address: walletAddress,
              created_at: now,
              updated_at: now,
            })
            .select();
        }

        if (result.error) {
          console.error('Error syncing wallet to Supabase:', result.error);
          return;
        }

        console.log('Wallet address synced to Supabase:', address);
        syncedRef.current = address; // Mark as synced
      } catch (err) {
        console.error('Unexpected error syncing wallet:', err);
      }
    }

    syncWalletAddress();
  }, [address, isConnected]);

  // Reset synced ref when wallet disconnects
  useEffect(() => {
    if (!isConnected) {
      syncedRef.current = false;
    }
  }, [isConnected]);
}
