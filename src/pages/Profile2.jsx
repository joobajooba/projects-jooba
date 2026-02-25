import { useEffect, useMemo, useState } from 'react';
import { useAccount } from 'wagmi';
import { useUser } from '../hooks/useUser';
import { useWordleStats } from '../hooks/useWordleStats';
import { useConnectionsStats } from '../hooks/useConnectionsStats';
import { useEditProfile } from '../context/EditProfileContext';
import { supabase } from '../lib/supabase';
import { isValidEthereumAddress, isValidUrl } from '../utils/walletSecurity';
import { checkRateLimit } from '../utils/rateLimit';
import NFTSelector from '../components/NFTSelector';
import MosaicBuilder from '../components/MosaicBuilder';
import './Profile2.css';

function getMosaicDims(gridSize) {
  if (gridSize === '4x4') return 4;
  return 2;
}

export default function Profile2() {
  const { address, isConnected } = useAccount();
  const { user, loading, refetch } = useUser();
  const { requestNFTsMosaicEdit, setRequestNFTsMosaicEdit } = useEditProfile();
  const { stats: wordleStats } = useWordleStats();
  const { stats: connectionsStats } = useConnectionsStats();

  const [isEditingLayout, setIsEditingLayout] = useState(false);
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

  // Profile age in days (from first wallet connection / created_at)
  const profileAgeDays = useMemo(() => {
    const createdAt = user?.created_at;
    if (!createdAt) return null;
    const created = new Date(createdAt);
    const now = new Date();
    const days = Math.floor((now - created) / (24 * 60 * 60 * 1000));
    return days;
  }, [user?.created_at]);

  // Record a profile view when a logged-in wallet views this profile (rate-limited: 1 per viewer per profile per 24h)
  useEffect(() => {
    if (!address || !user?.wallet_address || !supabase) return;
    const viewer = address.toLowerCase();
    const viewed = user.wallet_address.toLowerCase();
    const rateLimitKey = `profile_view_${viewer}_${viewed}`;
    if (!checkRateLimit(rateLimitKey, 1, 24 * 60 * 60 * 1000)) return;

    (async () => {
      const { error } = await supabase.from('profile_views').insert({
        viewer_wallet_address: viewer,
        viewed_wallet_address: viewed,
      });
      if (!error) refetch();
    })();
  }, [address, user?.wallet_address]);

  useEffect(() => {
    if (requestNFTsMosaicEdit) {
      setIsEditingLayout(true);
      setRequestNFTsMosaicEdit(false);
    }
  }, [requestNFTsMosaicEdit, setRequestNFTsMosaicEdit]);

  useEffect(() => {
    if (!user) return;
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

  const handleNFTSelect = async (imageUrl) => {
    if (nftSelectorSlot === null) return;
    await handleSlotNFTSelect(imageUrl, nftSelectorSlot);
    setNftSelectorSlot(null);
    setShowNFTSelector(false);
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
                <span className="profile2-fieldValue">{user?.username || 'Not set'}</span>
              </div>
              <div className="profile2-field">
                <span className="profile2-fieldLabel">Otherside</span>
                <span className="profile2-fieldValue">{user?.otherisde || 'Not set'}</span>
              </div>
              <div className="profile2-field">
                <span className="profile2-fieldLabel">X</span>
                <span className="profile2-fieldValue">{user?.x || 'Not set'}</span>
              </div>
            </div>
          </section>

          <section className="profile2-card profile2-statsCard">
            <div className="profile2-cardTitle">Profile Statistics</div>
            <div className="profile2-statRow">
              <span className="profile2-statKey">Profile Views</span>
              <span className="profile2-statVal">{user?.profile_view_count ?? 0}</span>
            </div>
            <div className="profile2-statRow">
              <span className="profile2-statKey">Profile Age</span>
              <span className="profile2-statVal">
                {profileAgeDays !== null ? `${profileAgeDays} Days` : '—'}
              </span>
            </div>
            <div className="profile2-statRow">
              <span className="profile2-statKey">Total Bops</span>
              <span className="profile2-statVal">{user?.total_bops ?? 0}</span>
            </div>
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
              className={`profile2-nftSlot ${isEditingLayout ? 'profile2-nftSlotEditable' : ''}`}
              role={isEditingLayout ? 'button' : undefined}
              tabIndex={isEditingLayout ? 0 : undefined}
              onClick={() => isEditingLayout && setNftSelectorSlot(idx)}
              onKeyDown={(e) => {
                if (!isEditingLayout) return;
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

        <div className="profile2-centerRightWrap">
        <section className="profile2-center">
          <div className="profile2-block profile2-uploader">
            <div className="profile2-uploaderBody">
              {user?.image_uploader_url && (
                <div className="profile2-uploaderImageWrap">
                  <img src={user.image_uploader_url} alt="Uploaded" className="profile2-uploaderImage" />
                </div>
              )}
              {isEditingLayout && (
                <button
                  type="button"
                  className="profile2-actionBtn profile2-actionBtnSecondary"
                  onClick={() => setIsEditingLayout(false)}
                >
                  Done
                </button>
              )}
            </div>
          </div>

          <div className="profile2-block profile2-description">
            <div className="profile2-blockTitle">Profile Description</div>
            <div className="profile2-descriptionBody">
              {user?.profile_description ? (
                <p className="profile2-descriptionText">{user.profile_description}</p>
              ) : (
                <p className="profile2-muted">No description set. Use Edit Profile to add one.</p>
              )}
            </div>
          </div>
        </section>

        <section className="profile2-right">
          <div className="profile2-block profile2-mosaicBlock profile2-mosaicBlock-aligned">
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
                  onClick={() => setIsEditingLayout(true)}
                >
                  Add Mosaic
                </button>
              </div>
            )}

            {isEditingLayout && (
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

