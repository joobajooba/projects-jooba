import { Link } from 'react-router-dom';
import collection from '../data/collection.json';
import { HALL_OF_FAME_MEMBERS } from '../lib/hallOfFame';

const COLLECTION_BY_ID = new Map(collection.map((impling) => [String(impling.id), impling]));

function shortenAddress(address) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export default function HallOfFamePage() {
  return (
    <div className="community-page hall-of-fame-page">
      <div className="community-page__inner">
        <header className="community-page__header">
          <p className="profile-page__eyebrow">Implingz Community</p>
          <h1>Hall of Fame</h1>
          <p>
            Commemorating adventurers who hold 30+ IMPLINGz. This founding roster is set by hand
            for now.
          </p>
        </header>

        <section className="hall-of-fame-grid" aria-label="Hall of Fame members">
          {HALL_OF_FAME_MEMBERS.map((member) => {
            const avatar = COLLECTION_BY_ID.get(String(member.avatarTokenId));

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
                <p className="hall-of-fame-card__badge">30+ Impz</p>
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
