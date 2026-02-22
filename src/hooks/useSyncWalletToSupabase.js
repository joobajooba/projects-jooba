import { useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';
import { supabase } from '../lib/supabase';
import { isValidEthereumAddress } from '../utils/walletSecurity';

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

      // Validate wallet address before inserting
      if (!isValidEthereumAddress(address)) {
        console.error('❌ Invalid wallet address format:', address);
        return;
      }

      try {
        const walletAddress = address.toLowerCase();

        // Upsert: insert if new, do nothing on conflict so we never get 409
        const result = await supabase
          .from('users')
          .upsert(
            { wallet_address: walletAddress },
            { onConflict: 'wallet_address', ignoreDuplicates: true }
          );

        if (result.error) {
          // 409 / 23505 = already exists, treat as success
          const isConflict = result.error.code === '23505' || result.error.message?.includes('409') || result.error.message?.toLowerCase().includes('duplicate');
          if (isConflict) {
            syncedRef.current = address;
            return;
          }
          console.error('Error syncing wallet to Supabase:', result.error.message);
          return;
        }

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
