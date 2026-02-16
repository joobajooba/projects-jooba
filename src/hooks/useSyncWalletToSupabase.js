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
    console.log('🔍 useSyncWalletToSupabase - isConnected:', isConnected, 'address:', address);
    
    // Only sync if wallet is connected and we haven't synced this address yet
    if (!isConnected || !address || syncedRef.current === address) {
      if (!isConnected) console.log('⏸️ Wallet not connected, skipping sync');
      if (!address) console.log('⏸️ No address, skipping sync');
      if (syncedRef.current === address) console.log('✅ Already synced this address');
      return;
    }

    async function syncWalletAddress() {
      console.log('🚀 Starting wallet sync for:', address);
      
      // Skip if Supabase client is not initialized (missing env var)
      if (!supabase) {
        console.error('❌ Supabase client not initialized. Set VITE_SUPABASE_ANON_KEY in environment variables.');
        console.error('Current env check:', {
          url: import.meta.env.VITE_SUPABASE_URL,
          hasKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
          keyLength: import.meta.env.VITE_SUPABASE_ANON_KEY?.length || 0
        });
        return;
      }
      
      console.log('✅ Supabase client initialized');

      try {
        const walletAddress = address.toLowerCase();

        // First, check if user already exists
        const { data: existingUser, error: checkError } = await supabase
          .from('users')
          .select('wallet_address')
          .eq('wallet_address', walletAddress)
          .maybeSingle();

        if (checkError && checkError.code !== 'PGRST116') {
          console.error('Error checking existing user:', checkError);
          return;
        }

        let result;
        if (existingUser) {
          // User already exists, no need to update
          console.log('Wallet address already exists in Supabase:', address);
          syncedRef.current = address;
          return;
        } else {
          // Insert new user - only use wallet_address column
          console.log('📝 Inserting new wallet address:', walletAddress);
          result = await supabase
            .from('users')
            .insert({
              wallet_address: walletAddress,
            })
            .select();

          if (result.error) {
            console.error('❌ Error syncing wallet to Supabase:', result.error);
            console.error('Error code:', result.error.code);
            console.error('Error message:', result.error.message);
            console.error('Error details:', JSON.stringify(result.error, null, 2));
            
            // Check if it's an RLS policy error
            if (result.error.message?.includes('row-level security') || result.error.code === '42501') {
              console.error('⚠️ Row Level Security (RLS) is blocking inserts.');
              console.error('You need to create a policy in Supabase that allows users to insert their own wallet_address.');
              console.error('Go to: https://supabase.com/dashboard/project/jitkwbatwymqtlzxiyil/auth/policies');
            }
            return;
          }

          console.log('✅ SUCCESS! Wallet address synced to Supabase:', address);
          console.log('✅ Inserted data:', result.data);
          syncedRef.current = address; // Mark as synced
        }
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
