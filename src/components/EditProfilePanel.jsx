import { useEffect, useState, useRef } from 'react';
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
  const [profileDescription, setProfileDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showNFTSelector, setShowNFTSelector] = useState(false);
  const slotUploadRef = useRef(null);

  useEffect(() => {
    if (isOpen && user) {
      setUsername(user.username || '');
      setOtherisde(user.otherisde || '');
      setX(user.x || '');
      setProfilePictureUrl(user.profile_picture_url || '');
      setProfileDescription(user.profile_description || '');
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
        profile_description: sanitizeInput(profileDescription, 500) || null,
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

  // Upload image to first empty NFT slot (Image Uploader panel on profile)
  const handleSlotImageUpload = async (e) => {
    const file = e?.target?.files?.[0];
    if (!file || !address || !supabase) return;

    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowed.includes(file.type)) {
      alert('Please choose a JPEG, PNG, GIF, or WebP image.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be 5 MB or smaller.');
      return;
    }

    const rateLimitKey = `edit_panel_slot_upload_${address.toLowerCase()}`;
    if (!checkRateLimit(rateLimitKey, 10, 60000)) {
      alert('Too many uploads. Please wait a moment and try again.');
      return;
    }

    const slotUrls = [
      user?.nft_slot_1_url,
      user?.nft_slot_2_url,
      user?.nft_slot_3_url,
      user?.nft_slot_4_url,
      user?.nft_slot_5_url,
    ];
    const firstEmptyIndex = slotUrls.findIndex((url) => !url || !url.trim());
    if (firstEmptyIndex === -1) {
      alert('All 5 Image Uploader slots are full. Edit your profile page to replace one.');
      return;
    }

    setUploading(true);
    const walletAddress = address.toLowerCase();
    const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
    const path = `${walletAddress}/slot-${firstEmptyIndex + 1}-${Date.now()}.${ext}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from('profile-pictures')
        .upload(path, file, { upsert: true });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        alert(`Upload failed: ${uploadError.message}`);
        return;
      }

      const { data: urlData } = supabase.storage.from('profile-pictures').getPublicUrl(path);
      const publicUrl = urlData?.publicUrl || '';

      const urlCol = `nft_slot_${firstEmptyIndex + 1}_url`;
      const { error: updateError } = await supabase
        .from('users')
        .update({ [urlCol]: publicUrl })
        .eq('wallet_address', walletAddress);

      if (updateError) {
        console.error('Error saving image to slot:', updateError);
        alert(`Save failed: ${updateError.message}`);
        return;
      }

      await refetch();
    } catch (err) {
      console.error('Image upload error:', err);
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
      if (slotUploadRef.current) slotUploadRef.current.value = '';
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
              Choose Profile NFT
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
          <div className="edit-profile-field edit-profile-uploader-field">
            <label className="edit-profile-label">Image Uploader</label>
            <p className="edit-profile-field-hint">Add an image to your profile&apos;s Image Uploader panel.</p>
            <input
              ref={slotUploadRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="edit-profile-file-input"
              onChange={handleSlotImageUpload}
              aria-label="Upload image for Image Uploader panel"
            />
            <button
              type="button"
              className="edit-profile-panel-btn edit-profile-panel-btn-secondary"
              onClick={() => slotUploadRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? 'Uploading...' : 'Upload image'}
            </button>
          </div>
          <div className="edit-profile-field">
            <label className="edit-profile-label">Profile description</label>
            <textarea
              className="edit-profile-input edit-profile-textarea"
              value={profileDescription}
              onChange={(e) => setProfileDescription(e.target.value)}
              placeholder="Tell others about yourself..."
              rows={4}
              maxLength={500}
            />
            <span className="edit-profile-char-count">{profileDescription.length}/500</span>
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
