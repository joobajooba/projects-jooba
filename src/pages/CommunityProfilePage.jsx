import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import collection from '../data/collection.json';
import { fetchCommunityProfiles } from '../lib/communityProfiles';
import { fetchAdventurerAccount } from '../lib/adventuresApi';

const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;
const COLLECTION_BY_ID = new Map(collection.map((impling) => [String(impling.id), impling]));

function shortenAddress(address) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export default function CommunityProfilePage() {
  const { walletAddress = '' } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!ADDRESS_PATTERN.test(walletAddress)) {
      setError('This community profile address is invalid.');
      setLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    setLoading(true);
    setError('');

    Promise.all([
      fetchCommunityProfiles({ walletAddress, signal: controller.signal }),
      fetchAdventurerAccount(walletAddress, { signal: controller.signal }).catch(() => null),
    ])
      .then(([[savedProfile], accountData]) => {
        if (!savedProfile) throw new Error('This adventurer has not saved a community profile.');
        setProfile({
          ...savedProfile,
          xp: accountData?.account?.xp ?? savedProfile.xp ?? 0,
          level: accountData?.account?.level ?? savedProfile.level ?? 1,
        });
      })
      .catch((requestError) => {
        if (requestError.name !== 'AbortError') {
          setError(requestError.message || 'Could not load this community profile.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [walletAddress]);

  const avatar = profile
    ? COLLECTION_BY_ID.get(String(profile.avatar_token_id ?? ''))
    : null;

  return (
    <div className="community-profile-page">
      <div className="community-profile-page__inner">
        <Link className="community-profile-page__back" to="/community">
          ← Back to Community
        </Link>

        {loading && <p className="community-profile-page__message">Loading adventurer…</p>}

        {!loading && error && (
          <p className="community-profile-page__message community-profile-page__message--error" role="alert">
            {error}
          </p>
        )}

        {!loading && profile && (
          <>
            <header className="community-profile-page__header">
              <p className="profile-page__eyebrow">Community adventurer</p>
              <h1>{profile.nickname || 'Unnamed Adventurer'}</h1>
              <p>{shortenAddress(profile.wallet_address)}</p>
            </header>

            <div className="community-profile-card">
              <aside className="community-profile-card__identity">
                <div className="community-profile-card__avatar">
                  {avatar ? (
                    <img src={avatar.image} alt={avatar.name} />
                  ) : (
                    <span aria-hidden="true">?</span>
                  )}
                </div>
                <strong>{profile.nickname || 'Unnamed Adventurer'}</strong>
                <span>{shortenAddress(profile.wallet_address)}</span>
              </aside>

              <section className="community-profile-card__details">
                <div>
                  <p className="profile-page__eyebrow">Profile bio</p>
                  <h2>About this adventurer</h2>
                  <p className="community-profile-card__bio">
                    {profile.bio || 'This adventurer has not written a bio yet.'}
                  </p>
                </div>

                <div className="community-profile-stats">
                  <div>
                    <span>Total IMPLINGz</span>
                    <strong>{profile.total_implingz ?? 0}</strong>
                  </div>
                  <div>
                    <span>Tier 1</span>
                    <strong>{profile.tier_1_count ?? 0}</strong>
                  </div>
                  <div>
                    <span>Tier 2</span>
                    <strong>{profile.tier_2_count ?? 0}</strong>
                  </div>
                  <div>
                    <span>Tier 3</span>
                    <strong>{profile.tier_3_count ?? 0}</strong>
                  </div>
                  <div>
                    <span>Level</span>
                    <strong>{profile.level ?? 1}</strong>
                  </div>
                  <div>
                    <span>XP</span>
                    <strong>{profile.xp ?? 0}</strong>
                  </div>
                </div>
              </section>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
