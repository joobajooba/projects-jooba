const COLLECTION_STATS = [
  { label: 'APE', tone: 'ape' },
  { label: '4,375', tone: 'supply', icon: 'stack' },
  { label: 'ERC-1155', tone: 'standard' },
  { label: 'MINTING SOON', tone: 'mint' },
];

const STAGES = [
  { title: 'Stage 1', description: 'wl (50 spots per community, 3 per wallet)' },
  { title: 'Stage 2', description: 'npc, glyder, zards, mineboy (50 spots per community, 3 per wallet)' },
  { title: 'Stage 3', description: 'bayc, mayc, geez, goats (50 spots per community, 3 per wallet)' },
  { title: 'Stage 4', description: 'goji, hoodlums, typical tigers, otherpet (50 spots per community, 3 per wallet)' },
  { title: 'Stage 5', description: 'jinkyz, punkbits, umbfmc, gobs (50 spots per community, 3 per wallet)' },
  { title: 'Public', description: '(3 per wallet)' },
];

export default function MintingPlatformPage() {
  return (
    <section className="c-minting-page" aria-label="Minting Platform">
      <div className="c-minting-page__layout">
        <div className="c-minting-page__main">
          <article className="c-minting-card">
            <img className="c-minting-card__image" src="/minting-goji.png" alt="J00B-As collection artwork" />

            <div className="c-minting-card__content">
              <div>
                <h1 className="c-minting-card__title">J00B-As</h1>
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
              <div key={stage.title} className="c-minting-stages__item">
                <p className="c-minting-stages__line">
                  <span className="c-minting-stages__label">{stage.title}</span>
                  <span className="c-minting-stages__description">{stage.description}</span>
                </p>
              </div>
            ))}
          </section>
        </div>

        <aside className="c-minting-page__aside" aria-hidden="true" />
      </div>
    </section>
  );
}
