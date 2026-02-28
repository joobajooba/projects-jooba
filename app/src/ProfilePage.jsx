import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { getAlchemyApiKey } from './lib/alchemy';
import { loadProfile } from './profileStorage';
import { fetchUserProfile } from './userData';
import MosaicCreator from './MosaicCreator';

function formatAddress(addr) {
  if (!addr || addr.length < 10) return addr || '';
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default function ProfilePage() {
  const { walletAddress: paramAddress } = useParams();
  const { address: connectedAddress } = useAccount();
  const walletAddress = paramAddress?.toLowerCase() || connectedAddress?.toLowerCase();
  const isOwnProfile = connectedAddress && walletAddress === connectedAddress.toLowerCase();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mosaicOpen, setMosaicOpen] = useState(false);

  function withLocalFallback(data) {
    if (!data || !isOwnProfile || !connectedAddress) return data;
    const local = loadProfile(connectedAddress);
    if (!local) return data;
    return {
      ...data,
      username: data.username || local.username || '',
      profilePictureUrl: data.profilePictureUrl || local.profilePictureUrl || '',
      profileBio: data.profileBio || local.profileBio || '',
      profilePictureBorder: data.profilePictureBorder || local.profilePictureBorder || '',
    };
  }

  async function refreshProfile() {
    if (!walletAddress) return;
    setLoading(true);
    const data = await fetchUserProfile(walletAddress);
    setProfile(withLocalFallback(data));
    setLoading(false);
  }

  useEffect(() => {
    if (!walletAddress) {
      setLoading(false);
      setProfile(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const data = await fetchUserProfile(walletAddress);
      if (cancelled) return;
      setProfile(withLocalFallback(data));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [walletAddress, isOwnProfile, connectedAddress]);

  useEffect(() => {
    if (!isOwnProfile || !walletAddress) return;
    const handler = (e) => {
      const updatedAddress = e?.detail?.walletAddress;
      if (!updatedAddress || updatedAddress !== walletAddress) return;
      refreshProfile();
    };
    window.addEventListener('profile-updated', handler);
    return () => window.removeEventListener('profile-updated', handler);
  }, [isOwnProfile, walletAddress]);

  if (!walletAddress) {
    return (
      <div className="app-main-inner">
        <h1>Profile</h1>
        <p>Connect your wallet to view your profile, or use a profile link.</p>
        <Link to="/" className="app-profile-back">← Back</Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="app-main-inner">
        <p>Loading profile…</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="app-main-inner">
        <h1>Profile</h1>
        <p>No profile found for this address.</p>
        <Link to="/" className="app-profile-back">← Back</Link>
      </div>
    );
  }

  const profileAgeDays = profile.firstLoggedInAt
    ? Math.floor((Date.now() - new Date(profile.firstLoggedInAt).getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  const displayName = profile.username || 'Unnamed';

  return (
    <div className="app-main-inner app-profile-page">
      <div className="app-profile-left">
        <div className="app-profile-info-panel">
          <div className={`app-profile-info-pic-wrap${profile.profilePictureBorder ? ` profile-pic-border profile-pic-border-${profile.profilePictureBorder}` : ''}`}>
            {profile.profilePictureUrl ? (
              <img src={profile.profilePictureUrl} alt="" className="app-profile-info-pic" />
            ) : (
              <div className="app-profile-info-pic app-profile-info-pic-placeholder">
                <span className="app-sidebar-profile-emoji">☺</span>
              </div>
            )}
          </div>
          <p className="app-profile-info-line">Username | {displayName}</p>
          <p className="app-profile-info-line">Otherside | {displayName}</p>
          <p className="app-profile-info-line">X | {displayName}</p>
        </div>

        <div className="app-profile-nft-column">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="app-profile-nft-cell" aria-label={`NFT slot ${i}`}>
              NFT
            </div>
          ))}
        </div>

        <div className="app-profile-uploader-panel">
          <h3 className="app-profile-panel-heading">Image Uploader</h3>
        </div>

        <div className="app-profile-sep" aria-hidden />

        <div className="app-profile-stat-panel app-profile-stat-row3">
          <h3 className="app-profile-panel-heading">Profile Statistics</h3>
          <p className="app-profile-stat-line">Profile Views |</p>
          <p className="app-profile-stat-line">Profile Age | {profileAgeDays} Days</p>
          <p className="app-profile-stat-line">Total Bops |</p>
        </div>

        <div className="app-profile-desc-panel">
          <h3 className="app-profile-panel-heading">Profile Description</h3>
          <p className="app-profile-desc-text">{profile.profileBio || 'No bio set.'}</p>
        </div>

        <div className="app-profile-stat-panel app-profile-stat-row4">
          <h3 className="app-profile-panel-heading">Wordle Statistics</h3>
          <p className="app-profile-stat-line">Wordle Streak |</p>
          <p className="app-profile-stat-line">Average Guesses |</p>
          <p className="app-profile-stat-line">Leaderboard Ranking |</p>
        </div>

        <div className="app-profile-stat-panel app-profile-stat-row5">
          <h3 className="app-profile-panel-heading">Connections Statistics</h3>
          <p className="app-profile-stat-line">Connections Streak |</p>
          <p className="app-profile-stat-line">Connections Wins |</p>
          <p className="app-profile-stat-line">Connections Avg Mistakes |</p>
        </div>

        <div className="app-profile-stat-panel app-profile-stat-row6">
          <h3 className="app-profile-panel-heading">Typeracer Statistics</h3>
          <p className="app-profile-stat-line">Typeracer Streak</p>
          <p className="app-profile-stat-line">Leaderboard Ranking |</p>
        </div>
      </div>

      <div className="app-profile-mosaic-column">
        <div className="app-profile-mosaic-panel">
          <h2 className="app-profile-mosaic-panel-title">Profile Mosaic</h2>
          {isOwnProfile && connectedAddress && (
            <button
              type="button"
              className="app-profile-mosaic-btn"
              onClick={() => setMosaicOpen(true)}
            >
              Create 2×2 / 4×4 mosaic
            </button>
          )}
        </div>
      </div>

      {mosaicOpen && isOwnProfile && connectedAddress && (
        <MosaicCreator
          ownerAddress={connectedAddress}
          apiKeyEth={getAlchemyApiKey(import.meta.env.VITE_ALCHEMY_API_KEY_ETH || import.meta.env.VITE_ALCHEMY_API_KEY)}
          apiKeyApechain={getAlchemyApiKey(import.meta.env.VITE_ALCHEMY_API_KEY_APECHAIN || import.meta.env.VITE_ALCHEMY_API_KEY)}
          onClose={() => setMosaicOpen(false)}
        />
      )}
    </div>
  );
}
