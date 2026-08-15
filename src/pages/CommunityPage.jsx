import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import collection from '../data/collection.json';
import { fetchCommunityProfiles } from '../lib/communityProfiles';

const COLLECTION_BY_ID = new Map(collection.map((impling) => [String(impling.id), impling]));

function shortenAddress(address) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export default function CommunityPage() {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    fetchCommunityProfiles({ signal: controller.signal })
      .then(setProfiles)
      .catch((requestError) => {
        if (requestError.name !== 'AbortError') {
          setError(requestError.message || 'Could not load the community.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, []);

  function openProfile(walletAddress) {
    navigate(`/community/${walletAddress}`);
  }

  return (
    <div className="community-page">
      <div className="community-page__inner">
        <header className="community-page__header">
          <p className="profile-page__eyebrow">The connected realm</p>
          <h1>Community</h1>
          <p>Adventurer profiles saved and verified by their wallets.</p>
        </header>

        <section className="community-directory" aria-busy={loading}>
          {loading && <p className="community-directory__message">Loading adventurers…</p>}

          {!loading && error && (
            <p className="community-directory__message community-directory__message--error" role="alert">
              {error}
            </p>
          )}

          {!loading && !error && profiles.length === 0 && (
            <p className="community-directory__message">
              No profiles have been saved yet. The first adventurer can claim this board.
            </p>
          )}

          {!loading && !error && profiles.length > 0 && (
            <div className="community-directory__table-wrap">
              <table className="community-directory__table">
                <thead>
                  <tr>
                    <th scope="col">Profile pic</th>
                    <th scope="col">Nickname</th>
                    <th scope="col">Public address</th>
                    <th scope="col">Tier 1</th>
                    <th scope="col">Tier 2</th>
                    <th scope="col">Tier 3</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.map((profile) => {
                    const avatar = COLLECTION_BY_ID.get(String(profile.avatar_token_id ?? ''));

                    return (
                      <tr
                        key={profile.wallet_address}
                        className="community-directory__row"
                        role="link"
                        tabIndex={0}
                        aria-label={`View ${profile.nickname || shortenAddress(profile.wallet_address)}'s profile`}
                        onClick={() => openProfile(profile.wallet_address)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            openProfile(profile.wallet_address);
                          }
                        }}
                      >
                        <td>
                          <div className="community-directory__avatar">
                            {avatar ? (
                              <img src={avatar.image} alt={avatar.name} />
                            ) : (
                              <span aria-hidden="true">?</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <strong>{profile.nickname || 'Unnamed Adventurer'}</strong>
                        </td>
                        <td>
                          <span className="community-directory__address">
                            {shortenAddress(profile.wallet_address)}
                          </span>
                        </td>
                        <td className="community-directory__count">{profile.tier_1_count ?? 0}</td>
                        <td className="community-directory__count">{profile.tier_2_count ?? 0}</td>
                        <td className="community-directory__count">{profile.tier_3_count ?? 0}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
