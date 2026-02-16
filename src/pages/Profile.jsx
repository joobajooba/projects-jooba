import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { useUser } from '../hooks/useUser';
import { supabase } from '../lib/supabase';
import './Profile.css';

export default function Profile() {
  const { address, isConnected } = useAccount();
  const { user, loading, refetch } = useUser();
  const [searchParams, setSearchParams] = useSearchParams();
  const editMode = searchParams.get('edit') === 'true';
  const [isEditing, setIsEditing] = useState(editMode);
  const [username, setUsername] = useState('');
  const [otherisde, setOtherisde] = useState('');
  const [x, setX] = useState('');
  const [profilePictureUrl, setProfilePictureUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (user) {
      setUsername(user.username || '');
      setOtherisde(user.otherisde || '');
      setX(user.x || '');
      setProfilePictureUrl(user.profile_picture_url || '');
    }
  }, [user]);

  useEffect(() => {
    setIsEditing(editMode);
  }, [editMode]);

  const handlePictureChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !address || !supabase) {
      console.error('Missing file, address, or Supabase client');
      return;
    }

    setUploading(true);
    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${address.toLowerCase()}-${Date.now()}.${fileExt}`;
      const filePath = `profile-pictures/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-pictures')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        alert('Failed to upload picture. Please ensure the Supabase Storage bucket "profile-pictures" exists and is configured.');
        return;
      }

      // Get public URL
      const { data } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(filePath);

      setProfilePictureUrl(data.publicUrl);

      // Update user record
      await supabase
        .from('users')
        .update({ profile_picture_url: data.publicUrl })
        .eq('wallet_address', address.toLowerCase());
    } catch (err) {
      console.error('Error uploading picture:', err);
      alert('Failed to upload picture. Please check console for details.');
    } finally {
      setUploading(false);
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
            {isEditing && (
              <label className="profile-picture-upload">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePictureChange}
                  disabled={uploading}
                />
                {uploading ? 'Uploading...' : 'Upload Picture'}
              </label>
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
          <div className="profile-actions">
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
        </div>
      </div>
    </main>
  );
}
