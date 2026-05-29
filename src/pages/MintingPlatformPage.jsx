const COLLECTION_STATS = [
  { label: 'APE', tone: 'ape' },
  { label: '4,375', tone: 'supply', icon: 'stack' },
  { label: 'ERC-1155', tone: 'standard' },
  { label: 'MINTING SOON', tone: 'mint' },
];

const STAGES = ['Stage 1', 'Stage 2', 'Stage 3', 'Stage 4', 'Stage 5'];

export default function MintingPlatformPage() {
  return (
    <section className="c-minting-page" aria-label="Minting Platform">
      <div className="c-minting-page__layout">
        <article className="c-minting-card">
          <img className="c-minting-card__image" src="/minting-goji.png" alt="GOJI collection artwork" />

          <div className="c-minting-card__content">
            <div>
              <h1 className="c-minting-card__title">GOJI</h1>
              <div className="c-minting-card__creator">
                <img className="c-minting-card__creator-image" src="/minting-creator.png" alt="" aria-hidden="true" />
                <span>
                  by <strong>Studio XYZ</strong>
                </span>
              </div>
            </div>

            <ul className="c-minting-card__stats" aria-label="Collection details">
              {COLLECTION_STATS.map((stat) => (
                <li key={stat.label} className={`c-minting-card__stat is-${stat.tone}`}>
                  {stat.icon === 'stack' ? (
                    <svg className="c-minting-card__stat-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                      <path d="m12 3.5 8 4-8 4-8-4 8-4Z" />
                      <path d="m4 11.5 8 4 8-4" />
                      <path d="m4 15.5 8 4 8-4" />
                    </svg>
                  ) : null}
                  {stat.label}
                </li>
              ))}
            </ul>
          </div>
        </article>

        <section className="c-minting-stages" aria-label="Minting stages">
          {STAGES.map((stage) => (
            <div key={stage} className="c-minting-stages__item">
              <h2 className="c-minting-stages__label">{stage}</h2>
            </div>
          ))}
        </section>
      </div>
    </section>
  );
}
