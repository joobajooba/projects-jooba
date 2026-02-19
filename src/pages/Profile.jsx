import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { useUser } from '../hooks/useUser';
import { supabase } from '../lib/supabase';
import NFTSelector from '../components/NFTSelector';
import './Profile.css';

export default function Profile() {
  const { address, isConnected } = useAccount();
  const { user, loading, refetch } = useUser();
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
  const [profileSearchNotFound, setProfileSearchNotFound] = useState(false);

  const displayedUser = viewedUser ?? user;
  const isOwnProfile = !viewedUser;

  useEffect(() => {
    if (viewUsernameParam && supabase) {
      setProfileSearchNotFound(false);
      let cancelled = false;
      (async () => {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .ilike('username', viewUsernameParam)
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
    }
  }, [displayedUser]);

  useEffect(() => {
    setIsEditing(editMode && isOwnProfile);
  }, [editMode, isOwnProfile]);

  const handleNFTSelect = async (imageUrl) => {
    if (!address || !supabase) {
      console.error('Missing address or Supabase client');
      return;
    }

    if (nftSelectorSlot !== null) {
      await handleSlotNFTSelect(imageUrl, nftSelectorSlot);
      setNftSelectorSlot(null);
      return;
    }

    setUploading(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ profile_picture_url: imageUrl })
        .eq('wallet_address', address.toLowerCase());

      if (error) {
        console.error('Error saving NFT profile picture:', error);
        alert(`Failed to save NFT as profile picture: ${error.message}`);
        return;
      }

      setProfilePictureUrl(imageUrl);
      await refetch();
    } catch (err) {
      console.error('Error saving NFT profile picture:', err);
      alert('Failed to save NFT as profile picture. Please check console for details.');
    } finally {
      setUploading(false);
      setShowNFTSelector(false);
    }
  };

  const handleSlotNFTSelect = async (imageUrl, slotIndex) => {
    if (!address || !supabase) return;
    const col = `nft_slot_${slotIndex + 1}_url`;
    setUploading(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ [col]: imageUrl })
        .eq('wallet_address', address.toLowerCase());

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

    try {
      const updateData = {};
      // Include all fields - convert empty strings to null for database
      if (username !== undefined) updateData.username = (username && username.trim()) || null;
      if (otherisde !== undefined) updateData.otherisde = (otherisde && otherisde.trim()) || null;
      if (x !== undefined) updateData.x = (x && x.trim()) || null;
      if (profilePictureUrl !== undefined) updateData.profile_picture_url = profilePictureUrl || null;

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
        .eq('wallet_address', address.toLowerCase())
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
            {profilePictureUrl ? (
              <img src={profilePictureUrl} alt="Profile" className="profile-picture" />
            ) : (
              <div className="profile-picture-placeholder">
                <span>No Picture</span>
              </div>
            )}
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
            {isOwnProfile && (
              <div className="profile-actions profile-actions-left">
                {isEditing ? (
                  <>
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
                  </>
                ) : (
                  <button 
                    onClick={() => {
                      setIsEditing(true);
                      setSearchParams({ edit: 'true' });
                    }} 
                    className="profile-button"
                  >
                    Edit Profile
                  </button>
                )}
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
              onChange={(e) => setProfileSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && setSearchParams({ username: profileSearchInput.trim() })}
              className="profile-search-input-short"
            />
            <button
              type="button"
              onClick={() => setSearchParams({ username: profileSearchInput.trim() })}
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
