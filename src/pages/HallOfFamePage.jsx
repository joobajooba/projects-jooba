import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import collection from '../data/collection.json';
import { fetchCommunityProfiles } from '../lib/communityProfiles';
import { HALL_OF_FAME_MEMBERS } from '../lib/hallOfFame';

const COLLECTION_BY_ID = new Map(collection.map((impling) => [String(impling.id), impling]));

function shortenAddress(address) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export default function HallOfFamePage() {
  const [totals, setTotals] = useState({});

  useEffect(() => {
    const controller = new AbortController();

    fetchCommunityProfiles({ signal: controller.signal })
      .then((profiles) => {
        const next = {};
        for (const profile of profiles) {
          next[String(profile.wallet_address || '').toLowerCase()] = Number(
            profile.total_implingz ?? 0
          );
        }
        setTotals(next);
      })
      .catch(() => {
        setTotals({});
      });

    return () => controller.abort();
  }, []);

  return (
    <div className="community-page hall-of-fame-page">
      <div className="community-page__inner">
        <header className="community-page__header">
          <p className="profile-page__eyebrow">Implingz Community</p>
          <h1>Hall of Fame</h1>
          <p>Commemorating distinguished Impz holders. This founding roster is set by hand for now.</p>
        </header>

        <section className="hall-of-fame-grid" aria-label="Hall of Fame members">
          {HALL_OF_FAME_MEMBERS.map((member) => {
            const avatar = COLLECTION_BY_ID.get(String(member.avatarTokenId));
            const total = totals[member.walletAddress.toLowerCase()];

            return (
              <Link
                key={member.walletAddress}
                className="hall-of-fame-card"
                to={`/community/${member.walletAddress}`}
              >
                <div className="hall-of-fame-card__portrait">
                  {avatar ? (
                    <img src={avatar.image} alt={avatar.name} />
                  ) : (
                    <span aria-hidden="true">★</span>
                  )}
                </div>
                <p className="hall-of-fame-card__badge">
                  {Number.isFinite(total) ? `${total.toLocaleString()} Impz` : 'Impz'}
                </p>
                <strong>{member.nickname}</strong>
                <span>{shortenAddress(member.walletAddress)}</span>
              </Link>
            );
          })}
        </section>
      </div>
    </div>
  );
}
