import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { useUser } from '../hooks/useUser';
import { useWordleStats } from '../hooks/useWordleStats';
import { useConnectionsStats } from '../hooks/useConnectionsStats';
import { supabase } from '../lib/supabase';
import { isValidEthereumAddress, sanitizeInput, isValidUrl } from '../utils/walletSecurity';
import { checkRateLimit } from '../utils/rateLimit';
import NFTSelector from '../components/NFTSelector';
import MosaicBuilder from '../components/MosaicBuilder';
import './Profile2.css';

function getMosaicDims(gridSize) {
  if (gridSize === '4x4') return 4;
  return 2;
}

export default function Profile2() {
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const { user, loading, refetch } = useUser();
  const { stats: wordleStats } = useWordleStats();
  const { stats: connectionsStats } = useConnectionsStats();
  const [searchParams, setSearchParams] = useSearchParams();
  const editMode = searchParams.get('edit') === 'true';

  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState('');
  const [otherisde, setOtherisde] = useState('');
  const [x, setX] = useState('');
  const [profilePictureUrl, setProfilePictureUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showNFTSelector, setShowNFTSelector] = useState(false);
  const [nftSelectorSlot, setNftSelectorSlot] = useState(null);
  const [slotUrls, setSlotUrls] = useState(['', '', '', '', '']);
  const [mosaic, setMosaic] = useState(null);
  const [showMosaicBuilder, setShowMosaicBuilder] = useState(false);

  const nftSlots = useMemo(() => {
    return slotUrls.map((url) => ({ url }));
  }, [slotUrls]);

  const mosaicDim = getMosaicDims(mosaic?.gridSize);
  const mosaicCells = mosaic?.cells || [];

  useEffect(() => {
    setIsEditing(editMode);
  }, [editMode]);

  useEffect(() => {
    if (!user) return;
    setUsername(user.username || '');
    setOtherisde(user.otherisde || '');
    setX(user.x || '');
    setProfilePictureUrl(user.profile_picture_url || '');
    setSlotUrls([
      user.nft_slot_1_url || '',
      user.nft_slot_2_url || '',
      user.nft_slot_3_url || '',
      user.nft_slot_4_url || '',
      user.nft_slot_5_url || '',
    ]);
    setMosaic(user.mosaic || null);
  }, [user]);

  const handleSave = async () => {
    if (!address || !supabase) return;
    if (!isValidEthereumAddress(address)) return;

    const rateLimitKey = `profile2_update_${address.toLowerCase()}`;
    if (!checkRateLimit(rateLimitKey, 10, 60000)) {
      alert('Too many update attempts. Please wait a moment and try again.');
      return;
    }

    try {
      const updateData = {};

      const sanitizedUsername = sanitizeInput(username, 50);
      const sanitizedOtherisde = sanitizeInput(otherisde, 50);
      const sanitizedX = sanitizeInput(x, 50);

      updateData.username = sanitizedUsername || null;
      updateData.otherisde = sanitizedOtherisde || null;
      updateData.x = sanitizedX || null;

      if (profilePictureUrl && !isValidUrl(profilePictureUrl)) {
        alert('Invalid profile picture URL');
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
      setIsEditing(false);
      setSearchParams({});
    } catch (err) {
      console.error('Unexpected error saving profile:', err);
      alert(`Failed to save profile: ${err.message}`);
    }
  };

  const handleNFTSelect = async (imageUrl, nftData = null) => {
    if (!address || !supabase) return;
    if (!isValidEthereumAddress(address)) {
      alert('Invalid wallet address');
      return;
    }
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
      const updateData = { profile_picture_url: imageUrl };

      const walletAddress = address.toLowerCase();
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

    const rateLimitKey = `profile2_nft_slot_update_${address.toLowerCase()}`;
    if (!checkRateLimit(rateLimitKey, 20, 60000)) {
      alert('Too many update attempts. Please wait a moment and try again.');
      return;
    }

    const urlCol = `nft_slot_${slotIndex + 1}_url`;

    setUploading(true);
    try {
      const updateData = { [urlCol]: imageUrl };
      const walletAddress = address.toLowerCase();

      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('wallet_address', walletAddress);

      if (error) {
        console.error('Error saving slot NFT:', error);
        alert(`Failed to save: ${error.message}`);
        return;
      }

      setSlotUrls((prev) => {
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
    }
  };

  const handleMosaicSave = async (newMosaic) => {
    if (!address || !supabase) return;
    if (!isValidEthereumAddress(address)) return;

    const rateLimitKey = `profile2_mosaic_update_${address.toLowerCase()}`;
    if (!checkRateLimit(rateLimitKey, 10, 60000)) {
      alert('Too many mosaic updates. Please wait a moment and try again.');
      return;
    }

    setUploading(true);
    try {
      const walletAddress = address.toLowerCase();
      const { error } = await supabase
        .from('users')
        .update({ mosaic: newMosaic })
        .eq('wallet_address', walletAddress);

      if (error) {
        console.error('Error saving mosaic:', error);
        alert(`Failed to save mosaic: ${error.message}`);
        return;
      }

      setMosaic(newMosaic);
      await refetch();
    } catch (err) {
      console.error('Error saving mosaic:', err);
      alert('Failed to save mosaic. Check console for details.');
    } finally {
      setUploading(false);
      setShowMosaicBuilder(false);
    }
  };

  if (!isConnected) {
    return (
      <main className="profile2-main">
        <div className="profile2-empty">
          <p>Please connect your wallet to view your profile.</p>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="profile2-main">
        <div className="profile2-empty">
          <p>Loading profile...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="profile2-main">
      <div className="profile2-grid">
        <aside className="profile2-left">
          <section className="profile2-card profile2-userCard">
            <div className="profile2-avatarOuter">
              <div className="profile2-avatarFrame">
                {profilePictureUrl ? (
                  <img
                    src={profilePictureUrl}
                    alt="Profile"
                    className="profile2-avatar"
                  />
                ) : (
                  <div className="profile2-avatarPlaceholder">No Pic</div>
                )}
              </div>
            </div>

            <div className="profile2-fields">
              <div className="profile2-field">
                <span className="profile2-fieldLabel">Username</span>
                {isEditing ? (
                  <input
                    className="profile2-input"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                ) : (
                  <span className="profile2-fieldValue">{username || 'Not set'}</span>
                )}
              </div>
              <div className="profile2-field">
                <span className="profile2-fieldLabel">Otherside</span>
                {isEditing ? (
                  <input
                    className="profile2-input"
                    type="text"
                    value={otherisde}
                    onChange={(e) => setOtherisde(e.target.value)}
                  />
                ) : (
                  <span className="profile2-fieldValue">{otherisde || 'Not set'}</span>
                )}
              </div>
              <div className="profile2-field">
                <span className="profile2-fieldLabel">X</span>
                {isEditing ? (
                  <input
                    className="profile2-input"
                    type="text"
                    value={x}
                    onChange={(e) => setX(e.target.value)}
                  />
                ) : (
                  <span className="profile2-fieldValue">{x || 'Not set'}</span>
                )}
              </div>
            </div>

            {isEditing && (
              <div className="profile2-userActions">
                <button
                  type="button"
                  className="profile2-actionBtn profile2-actionBtnSmall"
                  onClick={() => setShowNFTSelector(true)}
                  disabled={uploading}
                >
                  {uploading ? 'Saving...' : 'Choose Profile NFT'}
                </button>
              </div>
            )}
          </section>

          <section className="profile2-card profile2-statsCard">
            <div className="profile2-cardTitle">Profile Statistics</div>
            <div className="profile2-statSectionTitle">Wordle</div>
            <div className="profile2-statRow">
              <span className="profile2-statKey">Wordle Streak</span>
              <span className="profile2-statVal">{wordleStats?.currentStreak ?? 0}</span>
            </div>
            <div className="profile2-statRow">
              <span className="profile2-statKey">Avg Guesses</span>
              <span className="profile2-statVal">{wordleStats?.averageGuesses ?? 0}</span>
            </div>
            <div className="profile2-statSectionTitle">Connections</div>
            <div className="profile2-statRow">
              <span className="profile2-statKey">Connections Wins</span>
              <span className="profile2-statVal">{connectionsStats?.totalWins ?? 0}</span>
            </div>
            <div className="profile2-statRow">
              <span className="profile2-statKey">Avg Mistakes</span>
              <span className="profile2-statVal">{connectionsStats?.averageMistakesUsed ?? '—'}</span>
            </div>
            <div className="profile2-statRow">
              <span className="profile2-statKey">Streak</span>
              <span className="profile2-statVal">{connectionsStats?.dailyStreak ?? 0}</span>
            </div>
          </section>
        </aside>

        <section className="profile2-nftCol" aria-label="NFT slots">
          {nftSlots.map((slot, idx) => (
            <div
              key={idx}
              className={`profile2-nftSlot ${isEditing ? 'profile2-nftSlotEditable' : ''}`}
              role={isEditing ? 'button' : undefined}
              tabIndex={isEditing ? 0 : undefined}
              onClick={() => isEditing && setNftSelectorSlot(idx)}
              onKeyDown={(e) => {
                if (!isEditing) return;
                if (e.key === 'Enter' || e.key === ' ') setNftSelectorSlot(idx);
              }}
            >
              {slot.url ? (
                <img src={slot.url} alt={`NFT slot ${idx + 1}`} />
              ) : (
                <span className="profile2-nftSlotLabel">NFT</span>
              )}
            </div>
          ))}
        </section>

        <section className="profile2-center">
          <div className="profile2-block profile2-uploader">
            <div className="profile2-blockTitle">Image Uploader</div>
            <div className="profile2-uploaderBody">
              {isEditing ? (
                <>
                  <p className="profile2-muted">
                    Select NFTs by clicking the slots, then save when you’re ready.
                  </p>
                  <div className="profile2-editActions">
                    <button
                      type="button"
                      className="profile2-actionBtn"
                      onClick={handleSave}
                      disabled={uploading}
                    >
                      {uploading ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      type="button"
                      className="profile2-actionBtn profile2-actionBtnSecondary"
                      onClick={() => {
                        setIsEditing(false);
                        setSearchParams({});
                      }}
                      disabled={uploading}
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="profile2-muted">
                    Edit your profile picture, NFTs, and mosaic from here.
                  </p>
                  <button
                    type="button"
                    className="profile2-actionBtn"
                    onClick={() => setSearchParams({ edit: 'true' })}
                  >
                    Edit Profile
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="profile2-block profile2-description">
            <div className="profile2-blockTitle">Profile Description</div>
            <div className="profile2-descriptionBody">
              <p className="profile2-muted">
                Description support isn’t wired up yet — this panel matches the new layout and is ready
                to connect to a future bio/description field.
              </p>
            </div>
          </div>
        </section>

        <section className="profile2-right">
          <div className="profile2-block profile2-mosaicBlock">
            <div className="profile2-blockTitle">Profile Mosaic</div>

            {mosaicCells?.length ? (
              <div
                className="profile2-mosaic"
                style={{
                  '--profile2-cols': mosaicDim,
                  '--profile2-rows': mosaicDim,
                }}
              >
                {Array.from({ length: mosaicDim * mosaicDim }).map((_, i) => {
                  const cell = mosaicCells[i];
                  return (
                    <div key={i} className="profile2-mosaicCell">
                      {cell?.imageUrl ? <img src={cell.imageUrl} alt="" /> : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="profile2-mosaicEmpty">
                <p className="profile2-muted">No mosaic set yet.</p>
                <button
                  type="button"
                  className="profile2-actionBtn profile2-actionBtnSecondary"
                  onClick={() => setSearchParams({ edit: 'true' })}
                >
                  Add Mosaic
                </button>
              </div>
            )}

            {isEditing && (
              <div className="profile2-mosaicActions">
                <button
                  type="button"
                  className="profile2-actionBtn profile2-actionBtnSecondary"
                  onClick={() => setShowMosaicBuilder(true)}
                  disabled={uploading}
                >
                  {mosaicCells?.length ? 'Edit Mosaic' : 'Add Mosaic'}
                </button>
              </div>
            )}
          </div>
        </section>
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

      {showMosaicBuilder && (
        <MosaicBuilder
          initialMosaic={mosaic}
          onSave={handleMosaicSave}
          onClose={() => setShowMosaicBuilder(false)}
        />
      )}
    </main>
  );
}

