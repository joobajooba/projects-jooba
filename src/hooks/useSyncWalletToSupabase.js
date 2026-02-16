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
        console.error('❌ Supabase client not initialized. Set VITE_SUPABASE_ANON_KEY in environment variables.');
        return;
      }

      try {
        const walletAddress = address.toLowerCase();

        // Insert wallet address (or ignore if already exists)
        const result = await supabase
          .from('users')
          .insert({
            wallet_address: walletAddress,
          });

        if (result.error) {
          // If it's a unique constraint violation, user already exists - that's okay
          if (result.error.code === '23505') {
            syncedRef.current = address;
            return;
          }

          // Log other errors for debugging
          console.error('Error syncing wallet to Supabase:', result.error.message);
          return;
        }

        // Success - wallet synced
        syncedRef.current = address;
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
