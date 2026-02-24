import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { useUser } from '../hooks/useUser';
import { useEditProfile } from '../context/EditProfileContext';
import { supabase } from '../lib/supabase';
import { isValidEthereumAddress, sanitizeInput, isValidUrl } from '../utils/walletSecurity';
import { checkRateLimit } from '../utils/rateLimit';
import NFTSelector from './NFTSelector';
import './EditProfilePanel.css';

export default function EditProfilePanel() {
  const { isOpen, closeEditPanel } = useEditProfile();
  const { address } = useAccount();
  const { user, refetch } = useUser();

  const [username, setUsername] = useState('');
  const [otherisde, setOtherisde] = useState('');
  const [x, setX] = useState('');
  const [profilePictureUrl, setProfilePictureUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showNFTSelector, setShowNFTSelector] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      setUsername(user.username || '');
      setOtherisde(user.otherisde || '');
      setX(user.x || '');
      setProfilePictureUrl(user.profile_picture_url || '');
    }
  }, [isOpen, user]);

  const handleSave = async () => {
    if (!address || !supabase) return;
    if (!isValidEthereumAddress(address)) return;

    const rateLimitKey = `edit_panel_save_${address.toLowerCase()}`;
    if (!checkRateLimit(rateLimitKey, 10, 60000)) {
      alert('Too many update attempts. Please wait a moment and try again.');
      return;
    }

    setUploading(true);
    try {
      const updateData = {
        username: sanitizeInput(username, 50) || null,
        otherisde: sanitizeInput(otherisde, 50) || null,
        x: sanitizeInput(x, 50) || null,
      };

      if (profilePictureUrl && !isValidUrl(profilePictureUrl)) {
        alert('Invalid profile picture URL');
        setUploading(false);
        return;
      }
      updateData.profile_picture_url = profilePictureUrl || null;

      const walletAddress = address.toLowerCase();
      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('wallet_address', walletAddress);

      if (error) {
        console.error('Error saving profile:', error);
        alert(`Failed to save profile: ${error.message}`);
        return;
      }

      await refetch();
      closeEditPanel();
    } catch (err) {
      console.error('Unexpected error saving profile:', err);
      alert(`Failed to save profile: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleNFTSelect = async (imageUrl) => {
    if (!address || !supabase) return;
    if (imageUrl && !isValidUrl(imageUrl)) {
      alert('Invalid image URL');
      return;
    }

    setUploading(true);
    try {
      const walletAddress = address.toLowerCase();
      const { error } = await supabase
        .from('users')
        .update({ profile_picture_url: imageUrl || null })
        .eq('wallet_address', walletAddress);

      if (error) {
        console.error('Error saving profile picture:', error);
        alert(`Failed to save: ${error.message}`);
        return;
      }

      setProfilePictureUrl(imageUrl || '');
      await refetch();
    } catch (err) {
      console.error('Error saving profile picture:', err);
      alert('Failed to save. Please check console for details.');
    } finally {
      setUploading(false);
      setShowNFTSelector(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="edit-profile-overlay"
        onClick={closeEditPanel}
        onKeyDown={(e) => e.key === 'Escape' && closeEditPanel()}
        role="button"
        tabIndex={0}
        aria-label="Close panel"
      />
      <div className="edit-profile-panel" role="dialog" aria-labelledby="edit-profile-title">
        <div className="edit-profile-panel-header">
          <h2 id="edit-profile-title" className="edit-profile-panel-title">
            Edit Profile
          </h2>
          <button
            type="button"
            className="edit-profile-panel-close"
            onClick={closeEditPanel}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="edit-profile-panel-body">
          <div className="edit-profile-avatar-wrap">
            {profilePictureUrl ? (
              <img src={profilePictureUrl} alt="Profile" className="edit-profile-avatar-img" />
            ) : (
              <div className="edit-profile-avatar-placeholder">No Pic</div>
            )}
            <button
              type="button"
              className="edit-profile-panel-btn edit-profile-panel-btn-secondary"
              onClick={() => setShowNFTSelector(true)}
              disabled={uploading}
            >
              {uploading ? 'Saving...' : 'Choose Profile NFT'}
            </button>
          </div>

          <div className="edit-profile-field">
            <label className="edit-profile-label">Username</label>
            <input
              type="text"
              className="edit-profile-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className="edit-profile-field">
            <label className="edit-profile-label">Otherside</label>
            <input
              type="text"
              className="edit-profile-input"
              value={otherisde}
              onChange={(e) => setOtherisde(e.target.value)}
            />
          </div>
          <div className="edit-profile-field">
            <label className="edit-profile-label">X</label>
            <input
              type="text"
              className="edit-profile-input"
              value={x}
              onChange={(e) => setX(e.target.value)}
            />
          </div>

          <div className="edit-profile-panel-actions">
            <button
              type="button"
              className="edit-profile-panel-btn edit-profile-panel-btn-primary"
              onClick={handleSave}
              disabled={uploading}
            >
              {uploading ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              className="edit-profile-panel-btn edit-profile-panel-btn-secondary"
              onClick={closeEditPanel}
              disabled={uploading}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      {showNFTSelector && (
        <NFTSelector
          onSelect={handleNFTSelect}
          onClose={() => setShowNFTSelector(false)}
        />
      )}
    </>
  );
}
