import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { fetchUserProfile, updateUserProfile } from './userData';

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
  const [editingBio, setEditingBio] = useState(false);
  const [bioDraft, setBioDraft] = useState('');

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
      setBioDraft(data?.profileBio ?? '');
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [walletAddress]);

  const handleSaveBio = async () => {
    if (!connectedAddress || !isOwnProfile) return;
    await updateUserProfile(connectedAddress, { profileBio: bioDraft });
    setProfile((p) => (p ? { ...p, profileBio: bioDraft } : null));
    setEditingBio(false);
  };

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
        <div className="app-profile-card-pic-wrap">
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
        {isOwnProfile ? (
          <div className="app-profile-bio-block">
            {editingBio ? (
              <>
                <label className="app-modal-label">Bio</label>
                <textarea
                  className="app-profile-bio-input"
                  value={bioDraft}
                  onChange={(e) => setBioDraft(e.target.value)}
                  placeholder="Tell others about yourself…"
                  rows={3}
                />
                <div className="app-profile-bio-actions">
                  <button
                    type="button"
                    className="app-modal-btn app-modal-btn-primary"
                    onClick={handleSaveBio}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    className="app-modal-btn app-modal-btn-secondary"
                    onClick={() => { setEditingBio(false); setBioDraft(profile.profileBio ?? ''); }}
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="app-profile-bio-label">Bio</p>
                <p className="app-profile-bio-text">
                  {profile.profileBio || 'No bio set.'}
                </p>
                <button
                  type="button"
                  className="app-modal-btn app-modal-btn-secondary app-profile-edit-bio"
                  onClick={() => setEditingBio(true)}
                >
                  {profile.profileBio ? 'Edit bio' : 'Add bio'}
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="app-profile-bio-block">
            <p className="app-profile-bio-label">Bio</p>
            <p className="app-profile-bio-text">
              {profile.profileBio || 'No bio set.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
