import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { useUser } from '../hooks/useUser';
import { useWordleStats } from '../hooks/useWordleStats';
import { useConnectionsStats } from '../hooks/useConnectionsStats';
import './Profile2.css';

function getMosaicDims(gridSize) {
  if (gridSize === '4x4') return 4;
  return 2;
}

export default function Profile2() {
  const navigate = useNavigate();
  const { isConnected } = useAccount();
  const { user, loading } = useUser();
  const { stats: wordleStats } = useWordleStats();
  const { stats: connectionsStats } = useConnectionsStats();

  const nftSlots = useMemo(() => {
    if (!user) return Array.from({ length: 5 }, () => ({ url: '' }));
    return [
      { url: user.nft_slot_1_url || '' },
      { url: user.nft_slot_2_url || '' },
      { url: user.nft_slot_3_url || '' },
      { url: user.nft_slot_4_url || '' },
      { url: user.nft_slot_5_url || '' },
    ];
  }, [user]);

  const mosaicDim = getMosaicDims(user?.mosaic?.gridSize);
  const mosaicCells = user?.mosaic?.cells || [];

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
                {user?.profile_picture_url ? (
                  <img
                    src={user.profile_picture_url}
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
              <span className="profile2-statKey">Wordle Streak</span>
              <span className="profile2-statVal">{wordleStats?.currentStreak ?? 0}</span>
            </div>
            <div className="profile2-statRow">
              <span className="profile2-statKey">Avg Guesses</span>
              <span className="profile2-statVal">{wordleStats?.averageGuesses ?? 0}</span>
            </div>
            <div className="profile2-divider" />
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
            <div key={idx} className="profile2-nftSlot">
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
              <p className="profile2-muted">
                To change your profile image / NFTs, use the editor on the original profile page.
              </p>
              <button
                type="button"
                className="profile2-actionBtn"
                onClick={() => navigate('/profile/?edit=true')}
              >
                Open Profile Editor
              </button>
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
                  onClick={() => navigate('/profile/?edit=true')}
                >
                  Add Mosaic
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

