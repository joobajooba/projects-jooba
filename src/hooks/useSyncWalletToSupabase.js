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
      console.log('🔍 Supabase client details:', {
        url: supabase?.supabaseUrl,
        hasKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
        keyPreview: import.meta.env.VITE_SUPABASE_ANON_KEY?.substring(0, 20) + '...',
        keyLength: import.meta.env.VITE_SUPABASE_ANON_KEY?.length || 0
      });

      try {
        const walletAddress = address.toLowerCase();
        console.log('📝 Attempting to insert wallet address:', walletAddress);
        console.log('🔑 Supabase URL:', supabase?.supabaseUrl);
        console.log('🔑 Has anon key:', !!import.meta.env.VITE_SUPABASE_ANON_KEY);

        // Try upsert approach - insert or ignore if exists
        // Remove .select() to avoid needing SELECT policy
        const result = await supabase
          .from('users')
          .insert({
            wallet_address: walletAddress,
          });

        if (result.error) {
          // If it's a unique constraint violation, user already exists - that's okay
          if (result.error.code === '23505') {
            console.log('✅ Wallet address already exists in Supabase:', address);
            syncedRef.current = address;
            return;
          }

          console.error('❌ Error syncing wallet to Supabase:', result.error);
          console.error('Error code:', result.error.code);
          console.error('Error message:', result.error.message);
          console.error('Error details:', JSON.stringify(result.error, null, 2));
          console.error('Full error object:', result.error);
          
          // Check if it's an RLS policy error
          if (result.error.message?.includes('row-level security') || result.error.code === '42501') {
            console.error('⚠️ Row Level Security (RLS) is blocking inserts.');
            console.error('Policy exists but may not be active. Check:');
            console.error('1. RLS is enabled on the table');
            console.error('2. Policy is enabled (toggle ON)');
            console.error('3. Policy has WITH CHECK (true)');
            console.error('Go to: https://supabase.com/dashboard/project/jitkwbatwymqtlzxiyil/auth/policies');
          }
          return;
        }

        console.log('✅ SUCCESS! Wallet address synced to Supabase:', address);
        console.log('✅ Result:', result);
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
