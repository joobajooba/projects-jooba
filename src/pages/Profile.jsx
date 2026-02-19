import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { useUser } from '../hooks/useUser';
import { useWordleStats } from '../hooks/useWordleStats';
import { supabase } from '../lib/supabase';
import { isValidEthereumAddress, sanitizeInput, isValidUrl } from '../utils/walletSecurity';
import { checkRateLimit } from '../utils/rateLimit';
import NFTSelector from '../components/NFTSelector';
import './Profile.css';

export default function Profile() {
  const { address, isConnected } = useAccount();
  const { user, loading, refetch } = useUser();
  const { stats: wordleStats } = useWordleStats();
  const [searchParams, setSearchParams] = useSearchParams();
  const editMode = searchParams.get('edit') === 'true';
  const viewUsernameParam = searchParams.get('username') || '';
  const [viewedUser, setViewedUser] = useState(null);
  const [profileSearchInput, setProfileSearchInput] = useState('');
  const [isEditing, setIsEditing] = useState(editMode);
  const [username, setUsername] = useState('');
  const [otherisde, setOtherisde] = useState('');
  const [x, setX] = useState('');
  const [profilePictureUrl, setProfilePictureUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showNFTSelector, setShowNFTSelector] = useState(false);
  const [nftSelectorSlot, setNftSelectorSlot] = useState(null);
  const [slotUrls, setSlotUrls] = useState(['', '', '', '', '']);
  const [slotMetadata, setSlotMetadata] = useState([null, null, null, null, null]);
  const [profilePictureMetadata, setProfilePictureMetadata] = useState(null);
  const [profileSearchNotFound, setProfileSearchNotFound] = useState(false);
  const [leaderboardRank, setLeaderboardRank] = useState(null);

  const displayedUser = viewedUser ?? user;
  const isOwnProfile = !viewedUser;

  useEffect(() => {
    if (viewUsernameParam && supabase) {
      setProfileSearchNotFound(false);
      
      // Sanitize search input
      const sanitizedSearch = sanitizeInput(viewUsernameParam, 50);
      if (!sanitizedSearch) {
        setViewedUser(null);
        return;
      }

      let cancelled = false;
      (async () => {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .ilike('username', sanitizedSearch)
          .limit(1)
          .maybeSingle();
        if (!cancelled) {
          if (error) {
            console.error('Error fetching profile by username:', error);
            setViewedUser(null);
            return;
          }
          setViewedUser(data);
          if (!data) setProfileSearchNotFound(true);
        }
      })();
      return () => { cancelled = true; };
    } else {
      setViewedUser(null);
      setProfileSearchNotFound(false);
    }
  }, [viewUsernameParam]);

  useEffect(() => {
    if (displayedUser) {
      setUsername(displayedUser.username || '');
      setOtherisde(displayedUser.otherisde || '');
      setX(displayedUser.x || '');
      setProfilePictureUrl(displayedUser.profile_picture_url || '');
      setSlotUrls([
        displayedUser.nft_slot_1_url || '',
        displayedUser.nft_slot_2_url || '',
        displayedUser.nft_slot_3_url || '',
        displayedUser.nft_slot_4_url || '',
        displayedUser.nft_slot_5_url || ''
      ]);
      setSlotMetadata([
        displayedUser.nft_slot_1_metadata || null,
        displayedUser.nft_slot_2_metadata || null,
        displayedUser.nft_slot_3_metadata || null,
        displayedUser.nft_slot_4_metadata || null,
        displayedUser.nft_slot_5_metadata || null
      ]);
      setProfilePictureMetadata(displayedUser.profile_picture_metadata || null);
    }
  }, [displayedUser]);

  useEffect(() => {
    setIsEditing(editMode && isOwnProfile);
  }, [editMode, isOwnProfile]);

  // Fetch leaderboard ranking
  useEffect(() => {
    if (!address || !supabase || !isOwnProfile) {
      setLeaderboardRank(null);
      return;
    }

    const fetchLeaderboardRank = async () => {
      try {
        // Get all users with their win counts and average guesses
        const { data: allGames, error } = await supabase
          .from('wordle_games')
          .select('wallet_address, won, guesses')
          .eq('won', true);

        if (error) {
          console.error('Error fetching leaderboard:', error);
          return;
        }

        // Calculate stats per user
        const userStats = {};
        allGames?.forEach(game => {
          if (!userStats[game.wallet_address]) {
            userStats[game.wallet_address] = {
              wins: 0,
              totalGuesses: 0,
              games: 0
            };
          }
          userStats[game.wallet_address].wins++;
          userStats[game.wallet_address].totalGuesses += game.guesses;
          userStats[game.wallet_address].games++;
        });

        // Calculate averages and create leaderboard
        const leaderboard = Object.entries(userStats)
          .map(([wallet, stats]) => ({
            wallet,
            wins: stats.wins,
            avgGuesses: stats.totalGuesses / stats.wins
          }))
          .sort((a, b) => {
            // Sort by wins first, then by average guesses (lower is better)
            if (b.wins !== a.wins) return b.wins - a.wins;
            return a.avgGuesses - b.avgGuesses;
          });

        // Find current user's rank
        const walletAddress = address.toLowerCase();
        const rank = leaderboard.findIndex(player => player.wallet === walletAddress) + 1;
        
        if (rank > 0) {
          setLeaderboardRank({
            rank,
            total: leaderboard.length
          });
        } else {
          setLeaderboardRank({
            rank: leaderboard.length + 1,
            total: leaderboard.length + 1
          });
        }
      } catch (err) {
        console.error('Error calculating leaderboard rank:', err);
      }
    };

    fetchLeaderboardRank();
  }, [address, isOwnProfile]);

  const handleNFTSelect = async (imageUrl, nftData = null) => {
    if (!address || !supabase) {
      console.error('Missing address or Supabase client');
      return;
    }

    // Validate wallet address
    if (!isValidEthereumAddress(address)) {
      alert('Invalid wallet address');
      return;
    }

    // Validate image URL
    if (imageUrl && !isValidUrl(imageUrl)) {
      alert('Invalid image URL');
      return;
    }

    if (nftSelectorSlot !== null) {
      await handleSlotNFTSelect(imageUrl, nftSelectorSlot, nftData);
      setNftSelectorSlot(null);
      return;
    }

    setUploading(true);
    try {
      // Extract metadata from NFT
      const metadata = nftData ? {
        attributes: nftData.rawMetadata?.attributes || nftData.metadata?.attributes || [],
        name: nftData.name || nftData.title,
        description: nftData.description || nftData.rawMetadata?.description,
        tokenId: nftData.tokenId,
        contractAddress: nftData.contract?.address || nftData.contractAddress,
        // Store full rawMetadata for future use
        rawMetadata: nftData.rawMetadata || nftData.metadata
      } : null;

      const updateData = { profile_picture_url: imageUrl };
      if (metadata) {
        updateData.profile_picture_metadata = metadata;
      }

      // Ensure wallet_address matches (security check)
      const walletAddress = address.toLowerCase();
      if (!isValidEthereumAddress(walletAddress)) {
        throw new Error('Invalid wallet address format');
      }

      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('wallet_address', walletAddress);

      if (error) {
        console.error('Error saving NFT profile picture:', error);
        alert(`Failed to save NFT as profile picture: ${error.message}`);
        return;
      }

      setProfilePictureUrl(imageUrl);
      if (metadata) {
        setProfilePictureMetadata(metadata);
      }
      await refetch();
    } catch (err) {
      console.error('Error saving NFT profile picture:', err);
      alert('Failed to save NFT as profile picture. Please check console for details.');
    } finally {
      setUploading(false);
      setShowNFTSelector(false);
    }
  };

  const handleSlotNFTSelect = async (imageUrl, slotIndex, nftData = null) => {
    if (!address || !supabase) return;

    // Validate inputs
    if (!isValidEthereumAddress(address)) {
      alert('Invalid wallet address');
      return;
    }

    if (slotIndex < 0 || slotIndex > 4) {
      alert('Invalid slot index');
      return;
    }

    if (imageUrl && !isValidUrl(imageUrl)) {
      alert('Invalid image URL');
      return;
    }

    // Rate limiting: max 20 NFT slot updates per minute per wallet
    const rateLimitKey = `nft_slot_update_${address.toLowerCase()}`;
    if (!checkRateLimit(rateLimitKey, 20, 60000)) {
      alert('Too many update attempts. Please wait a moment and try again.');
      return;
    }

    const urlCol = `nft_slot_${slotIndex + 1}_url`;
    const metadataCol = `nft_slot_${slotIndex + 1}_metadata`;
    
    setUploading(true);
    try {
      // Extract metadata from NFT
      const metadata = nftData ? {
        attributes: nftData.rawMetadata?.attributes || nftData.metadata?.attributes || [],
        name: nftData.name || nftData.title,
        description: nftData.description || nftData.rawMetadata?.description,
        tokenId: nftData.tokenId,
        contractAddress: nftData.contract?.address || nftData.contractAddress,
        // Store full rawMetadata for future use
        rawMetadata: nftData.rawMetadata || nftData.metadata
      } : null;

      const updateData = { [urlCol]: imageUrl };
      if (metadata) {
        updateData[metadataCol] = metadata;
      }

      // Ensure wallet_address matches (security check)
      const walletAddress = address.toLowerCase();
      if (!isValidEthereumAddress(walletAddress)) {
        throw new Error('Invalid wallet address format');
      }

      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('wallet_address', walletAddress);

      if (error) {
        console.error('Error saving slot NFT:', error);
        alert(`Failed to save: ${error.message}`);
        return;
      }
      setSlotUrls(prev => {
        const next = [...prev];
        next[slotIndex] = imageUrl;
        return next;
      });
      if (metadata) {
        setSlotMetadata(prev => {
          const next = [...prev];
          next[slotIndex] = metadata;
          return next;
        });
      }
      await refetch();
    } catch (err) {
      console.error('Error saving slot NFT:', err);
      alert('Failed to save. Please check console for details.');
    } finally {
      setUploading(false);
      setNftSelectorSlot(null);
    }
  };

  const handleSave = async () => {
    if (!address || !supabase) {
      console.error('Missing address or Supabase client');
      return;
    }

    // Validate wallet address
    if (!isValidEthereumAddress(address)) {
      alert('Invalid wallet address');
      return;
    }

    // Rate limiting: max 10 profile updates per minute per wallet
    const rateLimitKey = `profile_update_${address.toLowerCase()}`;
    if (!checkRateLimit(rateLimitKey, 10, 60000)) {
      alert('Too many update attempts. Please wait a moment and try again.');
      return;
    }

    try {
      const updateData = {};
      // Sanitize and validate all inputs
      if (username !== undefined) {
        const sanitized = sanitizeInput(username, 50);
        updateData.username = sanitized || null;
      }
      if (otherisde !== undefined) {
        const sanitized = sanitizeInput(otherisde, 50);
        updateData.otherisde = sanitized || null;
      }
      if (x !== undefined) {
        const sanitized = sanitizeInput(x, 50);
        updateData.x = sanitized || null;
      }
      if (profilePictureUrl !== undefined) {
        // Validate URL if provided
        if (profilePictureUrl && !isValidUrl(profilePictureUrl)) {
          alert('Invalid profile picture URL');
          return;
        }
        updateData.profile_picture_url = profilePictureUrl || null;
      }

      // Ensure wallet_address matches (security check)
      const walletAddress = address.toLowerCase();
      if (!isValidEthereumAddress(walletAddress)) {
        throw new Error('Invalid wallet address format');
      }

      // Don't send empty update
      if (Object.keys(updateData).length === 0) {
        console.log('No data to update');
        return;
      }

      console.log('Updating profile with data:', updateData);
      console.log('Wallet address:', address.toLowerCase());

      const { data, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('wallet_address', walletAddress)
        .select();

      if (error) {
        console.error('Error saving profile:', error);
        console.error('Error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        alert(`Failed to save profile: ${error.message}. Check console for details.`);
        return;
      }

      console.log('Update response:', { data, error });
      
      // If SELECT doesn't return data (RLS policy issue), refetch instead
      if (!data || data.length === 0) {
        console.warn('Update succeeded but SELECT returned no data - likely RLS policy issue. Refetching...');
        // Wait a moment for the update to propagate
        await new Promise(resolve => setTimeout(resolve, 500));
        // Refetch user data
        await refetch();
        setIsEditing(false);
        setSearchParams({});
        return;
      }

      console.log('Profile updated successfully:', data);
      console.log('Updated user data:', data[0]);
      
      // Update local state immediately with returned data
      const updatedUser = data[0];
      setUsername(updatedUser.username || '');
      setOtherisde(updatedUser.otherisde || '');
      setX(updatedUser.x || '');
      setProfilePictureUrl(updatedUser.profile_picture_url || '');
      
      // Refresh user data from database to ensure consistency
      await refetch();
      
      setIsEditing(false);
      setSearchParams({});
    } catch (err) {
      console.error('Unexpected error saving profile:', err);
      alert(`Failed to save profile: ${err.message}. Check console for details.`);
    }
  };

  if (!isConnected) {
    return (
      <main className="profile-main">
        <div className="profile-container">
          <p>Please connect your wallet to view your profile.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="profile-main">
      <div className="profile-container">
        <div className="profile-left-panel">
          <div className="profile-picture-container">
            <div className="profile-picture-wrapper">
              {profilePictureUrl ? (
                <img src={profilePictureUrl} alt="Profile" className="profile-picture" />
              ) : (
                <div className="profile-picture-placeholder">
                  <span>No Picture</span>
                </div>
              )}
            </div>
            {isOwnProfile && isEditing && (
              <div className="profile-picture-actions">
                <button
                  className="profile-picture-nft-btn"
                  onClick={() => setShowNFTSelector(true)}
                  disabled={uploading}
                >
                  {uploading ? 'Saving...' : 'Choose NFT'}
                </button>
              </div>
            )}
            {isOwnProfile && isEditing && (
              <div className="profile-actions profile-actions-left">
                <button onClick={handleSave} className="profile-button">Save</button>
                <button 
                  onClick={() => {
                    setIsEditing(false);
                    setSearchParams({});
                  }} 
                  className="profile-button profile-button-secondary"
                >
                  Cancel
                </button>
              </div>
            )}
            {isOwnProfile && !isEditing && (
              <div className="profile-wordle-stats">
                <div className="profile-stat-item">
                  <span className="profile-stat-label">Wordle Streak:</span>
                  <span className="profile-stat-value">{wordleStats?.currentStreak || 0}</span>
                </div>
                <div className="profile-stat-item">
                  <span className="profile-stat-label">Average Guesses:</span>
                  <span className="profile-stat-value">{wordleStats?.averageGuesses || 0}</span>
                </div>
                <div className="profile-stat-item">
                  <span className="profile-stat-label">Leaderboard Ranking:</span>
                  <span className="profile-stat-value">
                    {leaderboardRank ? `${leaderboardRank.rank}/${leaderboardRank.total}` : '—'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="profile-right-panel">
          <div className="profile-info">
            <div className="profile-field">
              <label>Username:</label>
              {isEditing ? (
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="profile-input"
                />
              ) : (
                <span>{username || 'Not set'}</span>
              )}
            </div>
            <div className="profile-field">
              <label>otherisde:</label>
              {isEditing ? (
                <input
                  type="text"
                  value={otherisde}
                  onChange={(e) => setOtherisde(e.target.value)}
                  className="profile-input"
                />
              ) : (
                <span>{otherisde || 'Not set'}</span>
              )}
            </div>
            <div className="profile-field">
              <label>X:</label>
              {isEditing ? (
                <input
                  type="text"
                  value={x}
                  onChange={(e) => setX(e.target.value)}
                  className="profile-input"
                />
              ) : (
                <span>{x || 'Not set'}</span>
              )}
            </div>
          </div>
        </div>
        <div className="profile-nft-section">
          {profileSearchNotFound && (
            <p className="profile-search-not-found">No profile found for &quot;{viewUsernameParam}&quot;</p>
          )}
          <div className="profile-nft-slots-row">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={`profile-nft-slot-wrapper ${isEditing ? 'profile-nft-slot-editable' : ''}`}
              >
                <div
                  className={`profile-nft-slot ${isEditing ? 'profile-nft-slot-editable' : ''}`}
                  onClick={() => isEditing && setNftSelectorSlot(i)}
                  role={isEditing ? 'button' : undefined}
                  tabIndex={isEditing ? 0 : undefined}
                  onKeyDown={(e) => isEditing && (e.key === 'Enter' || e.key === ' ') && setNftSelectorSlot(i)}
                >
                  {slotUrls[i] ? (
                    <img src={slotUrls[i]} alt={`Slot ${i + 1}`} />
                  ) : (
                    <span className="profile-nft-slot-placeholder">
                      {isEditing ? 'Choose NFT' : ''}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="profile-search-section-right">
          <div className="profile-search-bar">
            {viewUsernameParam && (
              <button
                type="button"
                className="profile-search-back-btn"
                onClick={() => {
                  setSearchParams({});
                  setProfileSearchInput('');
                }}
              >
                Back to profile
              </button>
            )}
            <input
              type="text"
              placeholder="Search profile by username..."
              value={profileSearchInput}
              onChange={(e) => {
                const sanitized = sanitizeInput(e.target.value, 50);
                setProfileSearchInput(sanitized);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const sanitized = sanitizeInput(profileSearchInput, 50);
                  if (sanitized) {
                    setSearchParams({ username: sanitized });
                  }
                }
              }}
              className="profile-search-input-short"
            />
            <button
              type="button"
              onClick={() => {
                const sanitized = sanitizeInput(profileSearchInput, 50);
                if (sanitized) {
                  setSearchParams({ username: sanitized });
                }
              }}
            >
              Search
            </button>
          </div>
        </div>
      </div>
      {(showNFTSelector || nftSelectorSlot !== null) && (
        <NFTSelector
          onSelect={handleNFTSelect}
          onClose={() => {
            setShowNFTSelector(false);
            setNftSelectorSlot(null);
          }}
        />
      )}
    </main>
  );
}
