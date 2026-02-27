import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { fetchUserProfile } from './userData';

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

  async function refreshProfile() {
    if (!walletAddress) return;
    setLoading(true);
    const data = await fetchUserProfile(walletAddress);
    setProfile(data);
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
      setProfile(data);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [walletAddress]);

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

  return (
    <div className="app-main-inner app-profile-page">
      <Link to="/" className="app-profile-back">← Back</Link>
      <div className="app-profile-card">
        <div className={`app-profile-card-pic-wrap${profile.profilePictureBorder ? ` profile-pic-border profile-pic-border-${profile.profilePictureBorder}` : ''}`}>
          {profile.profilePictureUrl ? (
            <img
              src={profile.profilePictureUrl}
              alt=""
              className="app-profile-card-pic"
            />
          ) : (
            <div className="app-profile-card-pic app-profile-card-pic-placeholder">
              <span className="app-sidebar-profile-emoji">☺</span>
            </div>
          )}
        </div>
        <h1 className="app-profile-card-username">
          {profile.username || 'Unnamed'}
        </h1>
        <div className="app-profile-card-address" title={walletAddress}>
          {formatAddress(walletAddress)}
        </div>
        {profile.firstLoggedInAt && (
          <p className="app-profile-card-meta">
            Member since {new Date(profile.firstLoggedInAt).toLocaleDateString()}
          </p>
        )}
        <div className="app-profile-bio-block">
          <p className="app-profile-bio-label">Bio</p>
          <p className="app-profile-bio-text">
            {profile.profileBio || 'No bio set.'}
          </p>
        </div>
      </div>
    </div>
  );
}
