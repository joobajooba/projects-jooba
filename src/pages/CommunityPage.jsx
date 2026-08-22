import { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import collection from '../data/collection.json';
import { fetchCommunityProfiles, formatAccountCreatedAt } from '../lib/communityProfiles';
import { ADVENTURES_API } from '../lib/adventuresApi';

const COLLECTION_BY_ID = new Map(collection.map((impling) => [String(impling.id), impling]));

const SORT_OPTIONS = [
  { id: 'holders', label: 'Largest Holders' },
  { id: 'level', label: 'Highest Level' },
  { id: 'newest', label: 'New Users' },
  { id: 'oldest', label: 'Oldest Users' },
];

function shortenAddress(address) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function createdStamp(profile) {
  const time = Date.parse(profile?.created_at || '');
  return Number.isNaN(time) ? 0 : time;
}

function sortProfiles(profiles, sortBy) {
  return [...profiles].sort((left, right) => {
    if (sortBy === 'holders') {
      return (
        (right.total_implingz ?? 0) - (left.total_implingz ?? 0) ||
        (right.level ?? 1) - (left.level ?? 1)
      );
    }
    if (sortBy === 'level') {
      return (right.level ?? 1) - (left.level ?? 1) || (right.xp ?? 0) - (left.xp ?? 0);
    }
    if (sortBy === 'newest') {
      return createdStamp(right) - createdStamp(left);
    }
    return createdStamp(left) - createdStamp(right);
  });
}

export default function CommunityPage() {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState([]);
  const [sortBy, setSortBy] = useState('holders');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const sortedProfiles = useMemo(() => sortProfiles(profiles, sortBy), [profiles, sortBy]);

  useEffect(() => {
    const controller = new AbortController();

    Promise.all([
      fetchCommunityProfiles({ signal: controller.signal }),
      fetch(ADVENTURES_API, { signal: controller.signal }).then(async (response) => {
        const data = await response.json().catch(() => ({}));
        return data.accounts ?? [];
      }).catch(() => []),
    ])
      .then(([savedProfiles, accounts]) => {
        const byWallet = new Map(
          accounts.map((account) => [String(account.wallet_address || '').toLowerCase(), account])
        );
        setProfiles(
          savedProfiles.map((profile) => {
            const live = byWallet.get(String(profile.wallet_address || '').toLowerCase());
            return {
              ...profile,
              xp: live?.xp ?? profile.xp ?? 0,
              level: live?.level ?? profile.level ?? 1,
              created_at: profile.created_at || live?.created_at || null,
            };
          })
        );
      })
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
          <p className="community-page__links">
            <Link to="/community/hall-of-fame">Hall of Fame →</Link>
          </p>
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
            <>
              <div className="community-directory__toolbar">
                <label className="community-directory__sort" htmlFor="community-sort">
                  <span>Sort</span>
                  <select
                    id="community-sort"
                    value={sortBy}
                    onChange={(event) => setSortBy(event.target.value)}
                  >
                    {SORT_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="community-directory__table-wrap">
                <table className="community-directory__table">
                  <thead>
                    <tr>
                      <th scope="col">Profile pic</th>
                      <th scope="col">Nickname</th>
                      <th scope="col">Public address</th>
                      <th scope="col">Total</th>
                      <th scope="col">Tier 1</th>
                      <th scope="col">Tier 2</th>
                      <th scope="col">Tier 3</th>
                      <th scope="col">Level</th>
                      <th scope="col">XP</th>
                      <th scope="col">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedProfiles.map((profile) => {
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
                          <td className="community-directory__count">{profile.total_implingz ?? 0}</td>
                          <td className="community-directory__count">{profile.tier_1_count ?? 0}</td>
                          <td className="community-directory__count">{profile.tier_2_count ?? 0}</td>
                          <td className="community-directory__count">{profile.tier_3_count ?? 0}</td>
                          <td className="community-directory__count">{profile.level ?? 1}</td>
                          <td className="community-directory__count">{profile.xp ?? 0}</td>
                          <td className="community-directory__joined">
                            {formatAccountCreatedAt(profile.created_at)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
