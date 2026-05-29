const COLLECTION_STATS = [
  { label: 'APE' },
  { label: '4,375' },
  { label: 'ERC-1155' },
  { label: 'MINTING SOON', tone: 'mint' },
];

export default function MintingPlatformPage() {
  return (
    <section className="c-minting-page" aria-label="Minting Platform">
      <article className="c-minting-card">
        <img className="c-minting-card__image" src="/minting-goji.png" alt="GOJI collection artwork" />

        <div className="c-minting-card__content">
          <div>
            <h1 className="c-minting-card__title">GOJI</h1>
            <div className="c-minting-card__creator">
              <img className="c-minting-card__creator-image" src="/minting-goji.png" alt="" aria-hidden="true" />
              <span>
                by <strong>Studio XYZ</strong>
              </span>
            </div>
          </div>

          <ul className="c-minting-card__stats" aria-label="Collection details">
            {COLLECTION_STATS.map((stat) => (
              <li key={stat.label} className={`c-minting-card__stat${stat.tone === 'mint' ? ' is-mint' : ''}`}>
                {stat.label}
              </li>
            ))}
          </ul>
        </div>
      </article>
    </section>
  );
}
