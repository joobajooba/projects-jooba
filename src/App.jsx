import { useEffect, useState } from 'react';
import { supabase } from './lib/supabaseClient';
import { playClickSound } from './lib/clickSound';
import WalletTopBarButton from './components/WalletTopBarButton';
import StudioHomeModal from './components/StudioHomeModal';

function IconMonitor() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <rect x="3" y="4" width="18" height="12" rx="1.5" />
      <path d="M8 20h8M12 16v4" strokeLinecap="round" />
    </svg>
  );
}

function IconPhone() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <rect x="7" y="3" width="10" height="18" rx="2" />
      <path d="M10 18h4" strokeLinecap="round" />
    </svg>
  );
}

function IconHome() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path
        d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PhaseCaptionLines({ phase, name, instrument, compact }) {
  const row = (label, value) => (
    <div className="studio-phase-line">
      <span className="studio-phase-line-label">{label}</span>
      <span className="studio-phase-line-sep"> | </span>
      <span className="studio-phase-line-value">{value}</span>
    </div>
  );

  return (
    <figcaption className={`studio-phase-caption${compact ? ' studio-phase-caption--compact' : ''}`}>
      {row('Phase', String(phase))}
      {row('Name', name)}
      {row('Instrument', instrument)}
    </figcaption>
  );
}

function IconSquare3Stack3d() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.429 9.75 2.25 12l4.179 2.25m0-4.5 5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0 4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0-5.571 3-5.571-3"
      />
    </svg>
  );
}

function IconChartBar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M4.5 19.5h15" strokeLinecap="round" />
      <path d="M7.5 16.5v-4.5M12 16.5v-9M16.5 16.5v-6.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconSparkles() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M12 3.75 13.95 8.1 18.3 10.05 13.95 12 12 16.35 10.05 12 5.7 10.05 10.05 8.1 12 3.75Z" strokeLinejoin="round" />
      <path d="M18.75 15.75 19.65 17.85 21.75 18.75 19.65 19.65 18.75 21.75 17.85 19.65 15.75 18.75 17.85 17.85 18.75 15.75ZM5.25 14.25l.6 1.35 1.35.6-1.35.6-.6 1.35-.6-1.35-1.35-.6 1.35-.6.6-1.35Z" strokeLinejoin="round" />
    </svg>
  );
}

function IconDiscord() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.317 4.37a19.8 19.8 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

function IconX() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function Shell({ children, previewMode, onTogglePreview, activeStudioPage, onSelectStudioPage }) {
  const nextIsMobile = previewMode === 'desktop';
  return (
    <div className="app-shell" data-preview={previewMode}>
      <aside className="app-sidebar" aria-label="Sidebar">
        <div className="app-sidebar-brand">
          <img src="/mayc-outline.png" alt="MAYC outline" />
        </div>
        <nav className="app-sidebar-nav" aria-label="Studio pages">
          <button
            type="button"
            className="app-sidebar-nav-btn"
            onClick={() => onSelectStudioPage('home')}
            title="Home Page"
            aria-label="Home Page"
            aria-current={activeStudioPage === 'home' ? 'page' : undefined}
          >
            <IconHome />
          </button>
          <button
            type="button"
            className="app-sidebar-nav-btn"
            onClick={() => onSelectStudioPage('other')}
            title="Other Pages"
            aria-label="Other Pages"
            aria-current={activeStudioPage === 'other' ? 'page' : undefined}
          >
            <IconSquare3Stack3d />
          </button>
          <button
            type="button"
            className="app-sidebar-nav-btn"
            onClick={() => onSelectStudioPage('studio')}
            title="Studio"
            aria-label="Studio"
            aria-current={activeStudioPage === 'studio' ? 'page' : undefined}
          >
            <IconSparkles />
          </button>
        </nav>
        <button
          type="button"
          className="app-sidebar-toggle"
          onClick={onTogglePreview}
          title={nextIsMobile ? 'Preview mobile width' : 'Use full desktop width'}
          aria-label={nextIsMobile ? 'Switch to mobile layout preview' : 'Switch to desktop layout'}
        >
          {previewMode === 'desktop' ? <IconPhone /> : <IconMonitor />}
        </button>
      </aside>
      <div className="app-main-col">
        <div className="app-main-stage">
          <header className="app-topbar" aria-label="Top bar">
            <span className="app-topbar-title">Studio J00BA</span>
            <div className="app-topbar-inner">
              <WalletTopBarButton />
            </div>
          </header>
          <div className="app-main-body">
            <div className="corner-frames" aria-hidden="true">
              <div className="corner-frame-br" />
              <div className="corner-frame-bl" />
            </div>
            <main className="app-content">
              <div className="app-content-inner">{children}</div>
            </main>
            <div className="overlay-scanlines" aria-hidden="true" />
            <div className="overlay-vignette" aria-hidden="true" />
            <div className="overlay-glow-sweep" aria-hidden="true" />
          </div>
          <footer className="app-footer" aria-label="Footer">
            <div className="app-footer-social">
              <a
                className="app-footer-social-link"
                href="https://discord.gg/Z4nuZYgwHP"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Discord"
              >
                <IconDiscord />
              </a>
              <a
                className="app-footer-social-link"
                href="https://x.com/StudioJ00BA"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="X (Twitter)"
              >
                <IconX />
              </a>
            </div>
            <a
              className="app-footer-apechain"
              href="https://apechain.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Apechain"
            >
              <img src="/apechain-logo-mark.png" alt="" width={40} height={40} decoding="async" />
            </a>
          </footer>
        </div>
      </div>
    </div>
  );
}

function StudioHomeTeamBody() {
  const members = [
    {
      src: '/team-jooba.png',
      name: 'J00BA',
      role: 'web3 / Artist',
      alt: 'J00BA team portrait',
    },
    {
      src: '/team-okidokie.png',
      name: 'OkiDokie',
      role: 'Sound Engineer / Artist',
      alt: 'OkiDokie team portrait',
    },
    {
      src: '/team-melvolio.png',
      name: 'Melvolio',
      role: 'Developer',
      alt: 'Melvolio team portrait',
    },
  ];

  return (
    <div className="studio-home-team-grid">
      {members.map((m) => (
        <div key={m.name} className="studio-home-team-member">
          <div className="studio-home-team-avatar">
            <img src={m.src} alt={m.alt} width={512} height={512} decoding="async" />
          </div>
          <p className="studio-home-team-name">{m.name}</p>
          <p className="studio-home-team-role">{m.role}</p>
        </div>
      ))}
    </div>
  );
}

function StudioHomeInformationBody() {
  return (
    <>
      <section className="studio-home-modal-section">
        <h3 className="studio-home-modal-section-title">Backstory</h3>
        <p>
          Our team is made up of a group of friends who wanted to learn new skills while enjoying the
          journey. Each of us brings different skill sets and perspectives, including scripting, art,
          music + sound engineering, and data analytics, which allows us to approach projects creatively
          and collaboratively. We came together to combine our strengths, stay focused, and build
          something meaningful.
        </p>
      </section>
      <section className="studio-home-modal-section">
        <h3 className="studio-home-modal-section-title">Our Goal</h3>
        <p>
          We set out to develop a unique, engaging, and challenging project that would strengthen our
          abilities while contributing to the growth and support of the ApeChain ecosystem and its
          communities.
        </p>
        <p>
          Our first project will unfold in four phases of NFT releases, all connected under a single
          concept with a shared purpose. Each phase ties back to the ApeChain ecosystem and the Otherside
          experience. More details will be revealed in the coming months.
        </p>
      </section>
    </>
  );
}

function StudioLandingContent({
  heroTitle,
  showInfoPanels,
  onOpenHomeModal,
  phase2ImageSrc = '/phase2-elf.png',
  phase2ImageAlt = 'Phase 2, to be confirmed, Bass',
  phase3ImageSrc = null,
  phase3ImageAlt = 'Phase 3, to be confirmed, Drums',
  phase4TbcBox = false,
}) {
  return (
    <div className="studio-page studio-page--home">
      <header className="studio-home-hero">
        <div className="studio-home-hero-label-row">
          <span className="studio-home-hero-line" aria-hidden="true" />
          <span className="studio-home-hero-label">Coming to Apechain</span>
          <span className="studio-home-hero-line" aria-hidden="true" />
        </div>
        <h1 className="studio-home-hero-title">{heroTitle}</h1>
      </header>
      {showInfoPanels ? (
        <nav className="studio-home-panels" aria-label="Studio sections">
          <button
            type="button"
            className="studio-home-panel"
            onClick={() => onOpenHomeModal('information')}
          >
            Information
          </button>
          <button type="button" className="studio-home-panel" onClick={() => onOpenHomeModal('team')}>
            The Team
          </button>
          <button type="button" className="studio-home-panel" onClick={() => onOpenHomeModal('yuga')}>
            Yuga Assets
          </button>
        </nav>
      ) : null}
      <div className="studio-phase-row studio-phase-row--horizontal">
        <figure className="studio-phase-card studio-phase-card--compact">
          <div className="studio-phase-thumb studio-phase-thumb--compact">
            <img className="studio-phase-img" src="/phase1-bops.png" alt="Phase 1, Bops, Guitar" />
          </div>
          <PhaseCaptionLines phase={1} name="Bops" instrument="Guitar" compact />
        </figure>
        <figure className="studio-phase-card studio-phase-card--compact">
          <div className="studio-phase-thumb studio-phase-thumb--compact">
            <img className="studio-phase-img" src={phase2ImageSrc} alt={phase2ImageAlt} />
          </div>
          <PhaseCaptionLines phase={2} name="TBC" instrument="Bass" compact />
        </figure>
        <figure className="studio-phase-card studio-phase-card--compact">
          <div
            className={
              phase3ImageSrc
                ? 'studio-phase-thumb studio-phase-thumb--compact'
                : 'studio-phase-thumb studio-phase-thumb--blank studio-phase-thumb--compact'
            }
            aria-hidden={!phase3ImageSrc}
          >
            {phase3ImageSrc ? (
              <img className="studio-phase-img" src={phase3ImageSrc} alt={phase3ImageAlt} />
            ) : null}
          </div>
          <PhaseCaptionLines phase={3} name="TBC" instrument="Drums" compact />
        </figure>
        <figure className="studio-phase-card studio-phase-card--compact">
          {phase4TbcBox ? (
            <div className="studio-phase-thumb studio-phase-thumb--compact studio-phase-thumb--tbc" aria-hidden>
              <span className="studio-phase-thumb-tbc-label">TBC</span>
            </div>
          ) : (
            <div className="studio-phase-thumb studio-phase-thumb--blank studio-phase-thumb--compact" aria-hidden />
          )}
          <PhaseCaptionLines phase={4} name="TBC" instrument="Vocals" compact />
        </figure>
      </div>
    </div>
  );
}

function formatEth(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return '0 ETH';
  return `${n.toFixed(3)} ETH`;
}

function getMonthKey(timestamp) {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function getDonutColor(index) {
  const palette = ['#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#ef4444', '#14b8a6', '#f97316', '#64748b'];
  return palette[index % palette.length];
}

function buildMonthOptions(year = 2026) {
  const out = [];
  for (let m = 1; m <= 12; m += 1) out.push(`${year}-${String(m).padStart(2, '0')}`);
  return out;
}

function StudioAnalysisPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payload, setPayload] = useState(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [collectionFilter, setCollectionFilter] = useState('bayc');
  const [monthStart, setMonthStart] = useState('2026-01');
  const [monthEnd, setMonthEnd] = useState('2026-12');
  const [traitFilterType, setTraitFilterType] = useState('Background');

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await fetch('/api/opensea-sales');
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.detail || data?.error || 'Unable to fetch sales data');
        }
        if (!cancelled) setPayload(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unable to fetch sales data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const collections = payload?.collections || [];
  const filteredCollections = collections.filter((c) => c.key === collectionFilter);
  const mergedSales = filteredCollections
    .flatMap((collection) =>
      (collection.sales || []).map((sale) => ({
        ...sale,
        collectionKey: collection.key,
        collectionLabel: collection.label,
      }))
    )
    .sort((a, b) => {
      const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return tb - ta;
    });
  const monthOptions = buildMonthOptions(2026);

  const timeFilteredSales =
    mergedSales.filter((sale) => {
      const monthKey = getMonthKey(sale.timestamp);
      if (!monthKey) return false;
      const [from, to] = monthStart <= monthEnd ? [monthStart, monthEnd] : [monthEnd, monthStart];
      return monthKey >= from && monthKey <= to;
    });
  const filteredVolume = timeFilteredSales.reduce((sum, sale) => sum + Number(sale.priceEth || 0), 0);

  const traitTypeOptions = Array.from(
    new Set(
      timeFilteredSales.flatMap((sale) => (sale.traits || []).map((trait) => trait.traitType)).filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b));

  useEffect(() => {
    if (!traitTypeOptions.length) return;
    if (!traitTypeOptions.includes(traitFilterType)) {
      setTraitFilterType(traitTypeOptions.includes('Background') ? 'Background' : traitTypeOptions[0]);
    }
  }, [traitTypeOptions, traitFilterType]);

  const donutGroupsMap = new Map();
  for (const sale of timeFilteredSales) {
    const trait = (sale.traits || []).find((item) => item.traitType === traitFilterType);
    const traitValue = String(trait?.value ?? 'Unknown');
    const prev = donutGroupsMap.get(traitValue) || { label: traitValue, count: 0, volumeEth: 0 };
    prev.count += 1;
    prev.volumeEth += Number(sale.priceEth || 0);
    donutGroupsMap.set(traitValue, prev);
  }
  const donutGroups = Array.from(donutGroupsMap.values()).sort((a, b) => b.count - a.count);
  const donutTotal = donutGroups.reduce((sum, item) => sum + item.count, 0);
  let donutOffset = 0;
  const donutSegments = donutGroups.map((item, index) => {
    const fraction = donutTotal > 0 ? item.count / donutTotal : 0;
    const segment = { ...item, fraction, offset: donutOffset, color: getDonutColor(index) };
    donutOffset += fraction;
    return segment;
  });

  const filterPanel = filterOpen ? (
    <aside id="analysis-filter-panel" className="studio-nft-analysis-filter-panel" aria-label="Sales filters">
      <h2 className="studio-nft-analysis-filter-title">Filter Collections</h2>
      <div className="studio-nft-analysis-filter-options">
        <button
          type="button"
          className={`studio-nft-analysis-filter-option${
            collectionFilter === 'bayc' ? ' studio-nft-analysis-filter-option--active' : ''
          }`}
          onClick={() => setCollectionFilter('bayc')}
        >
          BAYC
        </button>
        <button
          type="button"
          className={`studio-nft-analysis-filter-option${
            collectionFilter === 'mayc' ? ' studio-nft-analysis-filter-option--active' : ''
          }`}
          onClick={() => setCollectionFilter('mayc')}
        >
          MAYC
        </button>
      </div>
      <h2 className="studio-nft-analysis-filter-title studio-nft-analysis-filter-title--spaced">Time Filter</h2>
      <div className="studio-nft-analysis-filter-options">
        <label className="studio-nft-analysis-filter-label">Start Month</label>
        <select
          className="studio-nft-analysis-filter-select"
          value={monthStart}
          onChange={(e) => setMonthStart(e.target.value)}
          aria-label="Start month"
        >
          {monthOptions.map((option) => (
            <option key={`start-${option}`} value={option}>
              {option}
            </option>
          ))}
        </select>
        <label className="studio-nft-analysis-filter-label">End Month</label>
        <select
          className="studio-nft-analysis-filter-select"
          value={monthEnd}
          onChange={(e) => setMonthEnd(e.target.value)}
          aria-label="End month"
        >
          {monthOptions.map((option) => (
            <option key={`end-${option}`} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
    </aside>
  ) : null;

  return (
    <div className="studio-page studio-nft-analysis" aria-label="Analysis page">
      <header className="studio-nft-analysis-head">
        <div className="studio-nft-analysis-head-row">
          <h1 className="studio-nft-analysis-title">Ape Sales Analysis</h1>
          <button
            type="button"
            className="studio-nft-analysis-filter-toggle"
            onClick={() => setFilterOpen((v) => !v)}
            aria-expanded={filterOpen}
            aria-controls="analysis-filter-panel"
          >
            Filters
          </button>
        </div>
      </header>

      {loading ? (
        <p className="studio-nft-analysis-status">Loading OpenSea sales...</p>
      ) : error ? (
        <div className="studio-nft-analysis-panel studio-nft-analysis-panel--error">
          <p className="studio-nft-analysis-lead">Could not load OpenSea sales data.</p>
          <p>{error}</p>
        </div>
      ) : (
        <div className="studio-nft-analysis-body">
          <div className="studio-nft-analysis-shell">
            <section className="studio-nft-analysis-panel studio-nft-analysis-layout">
            <div className="studio-nft-analysis-chart-col">
              <div className="studio-nft-analysis-chart-head">
                <h2 className="studio-nft-analysis-section-title">Trait Distribution</h2>
                <select
                  className="studio-nft-analysis-trait-select"
                  value={traitFilterType}
                  onChange={(e) => setTraitFilterType(e.target.value)}
                  aria-label="Trait type"
                >
                  {traitTypeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div className="studio-nft-analysis-donut-wrap">
                <svg className="studio-nft-analysis-donut" viewBox="0 0 42 42" role="img" aria-label="Trait donut chart">
                  <circle cx="21" cy="21" r="15.9155" fill="transparent" stroke="rgba(172, 198, 142, 0.15)" strokeWidth="6" />
                  {donutSegments.map((segment) => (
                    <circle
                      key={segment.label}
                      cx="21"
                      cy="21"
                      r="15.9155"
                      fill="transparent"
                      stroke={segment.color}
                      strokeWidth="6"
                      strokeDasharray={`${segment.fraction * 100} ${100 - segment.fraction * 100}`}
                      strokeDashoffset={25 - segment.offset * 100}
                    />
                  ))}
                </svg>
                <ul className="studio-nft-analysis-donut-legend">
                  {donutSegments.map((segment) => (
                    <li key={segment.label}>
                      <span className="studio-nft-analysis-donut-swatch" style={{ background: segment.color }} />
                      <span className="studio-nft-analysis-donut-label">{segment.label}</span>
                      <strong>{segment.count}</strong>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="studio-nft-analysis-table-col">
              <p className="studio-nft-analysis-muted">
                Showing {timeFilteredSales.length} sales | Total volume: {formatEth(filteredVolume)}
              </p>
              <div className="studio-nft-analysis-table-wrap">
                <table className="studio-nft-analysis-table">
                  <thead>
                    <tr>
                      <th>Collection</th>
                      <th>Token</th>
                      <th>Sale Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {timeFilteredSales.length ? (
                      timeFilteredSales.map((sale) => (
                        <tr key={sale.eventId || `${sale.collectionKey}-${sale.tokenId}-${sale.timestamp}`}>
                          <td>{sale.collectionKey.toUpperCase()}</td>
                          <td>{sale.name || `Token #${sale.tokenId || 'N/A'}`}</td>
                          <td>{formatEth(sale.priceEth)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3}>No sales found for the selected filter.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            </section>
            {filterPanel ? <div className="studio-nft-analysis-filter-col">{filterPanel}</div> : null}
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [status, setStatus] = useState('checking');
  const [previewMode, setPreviewMode] = useState('desktop');
  const [studioPage, setStudioPage] = useState('home');
  const [homeModal, setHomeModal] = useState(null);

  useEffect(() => {
    if (studioPage !== 'home') setHomeModal(null);
  }, [studioPage]);

  useEffect(() => {
    if (!supabase) {
      setStatus('missing_env');
      return;
    }
    let cancelled = false;
    supabase.auth
      .getSession()
      .then(({ error }) => {
        if (cancelled) return;
        setStatus(error ? 'error' : 'ok');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onPointerDown = (e) => {
      if (e.button !== 0) return;
      playClickSound();
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, []);

  const togglePreview = () => {
    setPreviewMode((m) => (m === 'desktop' ? 'mobile' : 'desktop'));
  };

  const shellProps = {
    previewMode,
    onTogglePreview: togglePreview,
    activeStudioPage: studioPage,
    onSelectStudioPage: setStudioPage,
  };

  if (status === 'missing_env') {
    return (
      <Shell {...shellProps}>
        <div className="app-message">
          <p>
            Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> (see{' '}
            <code>.env.example</code>).
          </p>
        </div>
      </Shell>
    );
  }

  if (status === 'checking') {
    return (
      <Shell {...shellProps}>
        <div className="app-message">
          <p>Connecting…</p>
        </div>
      </Shell>
    );
  }

  if (status === 'error') {
    return (
      <Shell {...shellProps}>
        <div className="app-message">
          <p>
            Supabase reachable but the session check failed (check URL, key, and project status).
          </p>
        </div>
      </Shell>
    );
  }

  let studioMain;
  if (studioPage === 'home') {
    studioMain = (
      <StudioLandingContent
        heroTitle="Studio JOOBA"
        showInfoPanels
        onOpenHomeModal={setHomeModal}
        phase2ImageSrc="/phase2-home-silhouette.png"
        phase2ImageAlt="Phase 2, elfin silhouette on olive green, Bass"
        phase3ImageSrc="/phase3-home-silhouette.png"
        phase3ImageAlt="Phase 3, bold silhouette on grey, Drums"
        phase4TbcBox
      />
    );
  } else if (studioPage === 'other') {
    studioMain = (
      <div className="studio-page studio-page--other" aria-label="Other pages">
        <div className="studio-other-row">
          <button
            type="button"
            className="studio-other-tile studio-other-tile--action"
            onClick={() => setStudioPage('other-analysis')}
            aria-label="Open analysis page"
            title="Analysis"
          >
            <IconChartBar />
          </button>
          <div className="studio-other-tile" />
          <div className="studio-other-tile" />
        </div>
      </div>
    );
  } else if (studioPage === 'other-analysis') {
    studioMain = <StudioAnalysisPage />;
  } else {
    studioMain = (
      <div className="studio-page studio-page--studio" aria-label="Studio page">
        <h1 className="studio-page-title">Studio</h1>
        <p className="studio-studio-dev-note">In Development</p>
      </div>
    );
  }

  const homeModalTitle =
    homeModal === 'information'
      ? 'Information'
      : homeModal === 'team'
        ? 'The Team'
        : homeModal === 'yuga'
          ? 'Yuga Assets'
          : '';

  return (
    <>
      <Shell {...shellProps}>{studioMain}</Shell>
      <StudioHomeModal
        open={homeModal != null}
        title={homeModalTitle}
        onClose={() => setHomeModal(null)}
        dialogClassName={
          homeModal === 'team'
            ? 'studio-home-modal-dialog--team'
            : homeModal === 'yuga'
              ? 'studio-home-modal-dialog--yuga'
              : undefined
        }
      >
        {homeModal === 'information' ? (
          <StudioHomeInformationBody />
        ) : homeModal === 'team' ? (
          <StudioHomeTeamBody />
        ) : homeModal === 'yuga' ? (
          <div className="studio-home-yuga-assets">
            <figure className="studio-home-yuga-figure">
              <div className="studio-home-yuga-thumb">
                <img src="/mayc-9419.png" alt="MAYC #9419" />
              </div>
              <figcaption className="studio-home-yuga-id">#9419</figcaption>
            </figure>
            <figure className="studio-home-yuga-figure">
              <div className="studio-home-yuga-thumb studio-home-yuga-thumb--otherdeed">
                <img src="/otherdeed-20314.png" alt="Otherdeed #20314" />
              </div>
              <figcaption className="studio-home-yuga-id">#20314</figcaption>
            </figure>
          </div>
        ) : null}
      </StudioHomeModal>
    </>
  );
}
