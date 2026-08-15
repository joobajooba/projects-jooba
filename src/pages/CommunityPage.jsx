import { useEffect, useState } from 'react';
import collection from '../data/collection.json';
import { fetchCommunityProfiles } from '../lib/communityProfiles';

const COLLECTION_BY_ID = new Map(collection.map((impling) => [String(impling.id), impling]));

function shortenAddress(address) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export default function CommunityPage() {
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
                  </tr>
                </thead>
                <tbody>
                  {profiles.map((profile) => {
                    const avatar = COLLECTION_BY_ID.get(String(profile.avatar_token_id ?? ''));

                    return (
                      <tr key={profile.wallet_address}>
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
                          <a
                            href={`https://robinhoodchain.blockscout.com/address/${profile.wallet_address}`}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={`View wallet ${profile.wallet_address} on Blockscout`}
                          >
                            <span className="community-directory__address-full">
                              {profile.wallet_address}
                            </span>
                            <span className="community-directory__address-short">
                              {shortenAddress(profile.wallet_address)}
                            </span>
                          </a>
                        </td>
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
