import { useEffect, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
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

function formatCurrency(value, unit = 'ETH') {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return `0 ${unit}`;
  return `${n.toFixed(3)} ${unit}`;
}

function toTimestampMs(timestamp) {
  if (timestamp == null || timestamp === '') return NaN;
  if (typeof timestamp === 'number') return timestamp < 1e12 ? timestamp * 1000 : timestamp;
  const maybeNumber = Number(timestamp);
  if (Number.isFinite(maybeNumber) && String(timestamp).trim() !== '') {
    return maybeNumber < 1e12 ? maybeNumber * 1000 : maybeNumber;
  }
  return new Date(timestamp).getTime();
}

function formatSaleDate(timestamp) {
  const ts = toTimestampMs(timestamp);
  if (!Number.isFinite(ts)) return 'N/A';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return 'N/A';
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${day}/${month}/${year}`;
}

function getDonutColor(index) {
  const palette = [
    '#2563eb',
    '#16a34a',
    '#f59e0b',
    '#9333ea',
    '#ef4444',
    '#06b6d4',
    '#f97316',
    '#84cc16',
    '#ec4899',
    '#64748b',
  ];
  return palette[index % palette.length];
}

function StudioAnalysisPage() {
  const PROJECTS = {
    mayc: {
      key: 'mayc',
      label: 'Mutant Ape Yacht Club',
      shortLabel: 'MAYC',
      endpoint: '/api/opensea-mayc-sales',
      volumeUnit: 'ETH',
    },
    bayc: {
      key: 'bayc',
      label: 'Bored Ape Yacht Club',
      shortLabel: 'BAYC',
      endpoint: '/api/opensea-bayc-sales',
      volumeUnit: 'ETH',
    },
    napc: {
      key: 'napc',
      label: 'Not a Punks Cult',
      shortLabel: 'NAPC',
      endpoint: '/api/opensea-napc-sales',
      volumeUnit: 'APE',
    },
  };

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sales, setSales] = useState([]);
  const [viewMode, setViewMode] = useState('dashboard');
  const [selectedProject, setSelectedProject] = useState('mayc');
  const [projectPickerOpen, setProjectPickerOpen] = useState(false);
  const [selectedTraitType, setSelectedTraitType] = useState('');
  const [snapshotConfirmOpen, setSnapshotConfirmOpen] = useState(false);
  const [snapshotError, setSnapshotError] = useState('');
  const [snapshotBusy, setSnapshotBusy] = useState(false);
  const projectPickerRef = useRef(null);
  const chartPanelRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await fetch(PROJECTS[selectedProject].endpoint);
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.detail || data?.error || 'Unable to fetch sales data');
        }
        if (!cancelled) setSales(Array.isArray(data?.sales) ? data.sales : []);
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
  }, [selectedProject]);

  useEffect(() => {
    const onPointerDown = (event) => {
      if (!projectPickerRef.current) return;
      if (!projectPickerRef.current.contains(event.target)) {
        setProjectPickerOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  const normalizedSales = sales
    .map((sale) => ({
      ...sale,
      timestampMs: toTimestampMs(sale.timestamp),
      saleDate: formatSaleDate(sale.timestamp),
      apeLabel: sale.apeId ? `#${sale.apeId}` : sale.name || 'N/A',
      collection: PROJECTS[selectedProject].shortLabel,
      traits: Array.isArray(sale.traits) ? sale.traits : [],
    }))
    .filter((sale) => Number.isFinite(sale.timestampMs))
    .sort((a, b) => {
      const ta = Number.isFinite(a.timestampMs) ? a.timestampMs : 0;
      const tb = Number.isFinite(b.timestampMs) ? b.timestampMs : 0;
      return tb - ta;
    });

  const totalVolume = normalizedSales.reduce((sum, sale) => sum + Number(sale.priceEth || 0), 0);
  const traitTypes = Array.from(
    new Set(normalizedSales.flatMap((sale) => sale.traits.map((trait) => trait.traitType)).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

  const traitTypeMap = new Map();
  for (const sale of normalizedSales) {
    for (const trait of sale.traits) {
      const traitType = trait?.traitType || 'Unknown';
      const traitValue = String(trait?.value ?? 'Unknown');
      if (!traitTypeMap.has(traitType)) traitTypeMap.set(traitType, new Map());
      const valueMap = traitTypeMap.get(traitType);
      valueMap.set(traitValue, (valueMap.get(traitValue) || 0) + 1);
    }
  }

  useEffect(() => {
    if (!traitTypes.length) {
      setSelectedTraitType('');
      return;
    }
    if (!selectedTraitType || !traitTypes.includes(selectedTraitType)) {
      setSelectedTraitType(traitTypes[0]);
    }
  }, [traitTypes, selectedTraitType]);

  const selectedTraitBars = selectedTraitType
    ? Array.from(traitTypeMap.get(selectedTraitType)?.entries() || [])
        .map(([label, count], index) => ({
          label,
          count,
          color: getDonutColor(index),
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 15)
    : [];
  const maxTraitCount = selectedTraitBars.reduce((max, item) => Math.max(max, item.count), 0);
  const salesTimeline = [...normalizedSales]
    .sort((a, b) => {
      const ta = Number.isFinite(a.timestampMs) ? a.timestampMs : 0;
      const tb = Number.isFinite(b.timestampMs) ? b.timestampMs : 0;
      return ta - tb;
    })
    .map((sale) => ({
      timestampMs: sale.timestampMs,
      price: Number(sale.priceEth || 0),
      saleDate: sale.saleDate,
    }));
  const timelineMaxPrice = salesTimeline.reduce((max, point) => Math.max(max, point.price), 0);
  const timelinePath = salesTimeline.length
    ? salesTimeline
        .map((point, index) => {
          const x =
            salesTimeline.length > 1 ? (index / (salesTimeline.length - 1)) * 100 : 50;
          const y = timelineMaxPrice > 0 ? 100 - (point.price / timelineMaxPrice) * 100 : 100;
          return `${x},${y}`;
        })
        .join(' ')
    : '';
  const timelineStart = salesTimeline[0]?.saleDate || '';
  const timelineEnd = salesTimeline[salesTimeline.length - 1]?.saleDate || '';

  const openSnapshotConfirm = () => {
    setSnapshotError('');
    setSnapshotConfirmOpen(true);
  };

  const downloadSnapshot = async () => {
    if (!chartPanelRef.current) return;
    setSnapshotBusy(true);
    setSnapshotError('');
    try {
      const canvas = await html2canvas(chartPanelRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#0b120b',
        logging: false,
      });
      const jpg = canvas.toDataURL('image/jpeg', 0.98);
      const link = document.createElement('a');
      link.href = jpg;
      link.download = `${PROJECTS[selectedProject].shortLabel.toLowerCase()}-graph-snapshot.jpeg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setSnapshotConfirmOpen(false);
    } catch (err) {
      setSnapshotError(err instanceof Error ? err.message : 'Snapshot export failed.');
    } finally {
      setSnapshotBusy(false);
    }
  };

  return (
    <div className="studio-page studio-nft-analysis" aria-label="Analysis page">
      <header className="studio-nft-analysis-head">
        <div className="studio-nft-analysis-head-row">
          <h1 className="studio-nft-analysis-title">Project Analysis</h1>
          <div className="studio-nft-analysis-view-toggle" role="tablist" aria-label="Sales view mode">
            <button
              type="button"
              className={`studio-nft-analysis-view-btn${
                viewMode === 'dashboard' ? ' studio-nft-analysis-view-btn--active' : ''
              }`}
              onClick={() => setViewMode('dashboard')}
              role="tab"
              aria-selected={viewMode === 'dashboard'}
            >
              Dashboard
            </button>
            <button
              type="button"
              className={`studio-nft-analysis-view-btn${
                viewMode === 'table' ? ' studio-nft-analysis-view-btn--active' : ''
              }`}
              onClick={() => setViewMode('table')}
              role="tab"
              aria-selected={viewMode === 'table'}
            >
              Datatable
            </button>
            <div className="studio-nft-analysis-project-select" ref={projectPickerRef}>
              <button
                type="button"
                className="studio-nft-analysis-view-btn"
                onClick={() => setProjectPickerOpen((open) => !open)}
                aria-haspopup="dialog"
                aria-expanded={projectPickerOpen}
              >
                Select Project
              </button>
              {projectPickerOpen ? (
                <div className="studio-nft-analysis-project-menu" role="dialog" aria-label="Select NFT project">
                  {Object.values(PROJECTS).map((project) => (
                    <button
                      key={project.key}
                      type="button"
                      className={`studio-nft-analysis-project-option${
                        selectedProject === project.key
                          ? ' studio-nft-analysis-project-option--active'
                          : ''
                      }`}
                      onClick={() => {
                        setSelectedProject(project.key);
                        setProjectPickerOpen(false);
                      }}
                    >
                      {project.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <button
              type="button"
              className="studio-nft-analysis-view-btn"
              onClick={openSnapshotConfirm}
              disabled={viewMode !== 'dashboard' || loading || !!error || snapshotBusy}
            >
              Download Snapshot
            </button>
          </div>
        </div>
      </header>

      {loading ? (
        <p className="studio-nft-analysis-status">
          Loading last 500 {PROJECTS[selectedProject].shortLabel} sales...
        </p>
      ) : error ? (
        <div className="studio-nft-analysis-panel studio-nft-analysis-panel--error">
          <p className="studio-nft-analysis-lead">Could not load OpenSea sales data.</p>
          <p>{error}</p>
        </div>
      ) : viewMode === 'dashboard' ? (
        <div className="studio-nft-analysis-panel" ref={chartPanelRef}>
          <div className="studio-nft-analysis-bar-head">
            <p className="studio-nft-analysis-muted">
              Last {normalizedSales.length} sales | Total volume:{' '}
              {formatCurrency(totalVolume, PROJECTS[selectedProject].volumeUnit)}
            </p>
            <label className="studio-nft-analysis-bar-filter">
              Trait Type
              <select
                value={selectedTraitType}
                onChange={(event) => setSelectedTraitType(event.target.value)}
                disabled={!traitTypes.length}
              >
                {traitTypes.map((traitType) => (
                  <option key={traitType} value={traitType}>
                    {traitType}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {selectedTraitBars.length ? (
            <ul className="studio-nft-analysis-bar-list">
              {selectedTraitBars.map((item) => (
                <li key={item.label} className="studio-nft-analysis-bar-row">
                  <div className="studio-nft-analysis-bar-track">
                    <span
                      className="studio-nft-analysis-bar-fill"
                      style={{
                        height: `${maxTraitCount > 0 ? (item.count / maxTraitCount) * 100 : 0}%`,
                      }}
                    />
                    <strong
                      className="studio-nft-analysis-bar-row-count"
                      style={{
                        bottom: `calc(${maxTraitCount > 0 ? (item.count / maxTraitCount) * 100 : 0}% + 0.2rem)`,
                      }}
                    >
                      {item.count}
                    </strong>
                  </div>
                  <span className="studio-nft-analysis-bar-row-label">{item.label}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="studio-nft-analysis-status">No trait data available for this selection.</p>
          )}
          <div className="studio-nft-analysis-line-panel">
            <div className="studio-nft-analysis-line-head">
              <h2 className="studio-nft-analysis-section-title">Sales Over Time</h2>
              <span className="studio-nft-analysis-line-meta">
                {salesTimeline.length} sales | Max: {formatCurrency(timelineMaxPrice, PROJECTS[selectedProject].volumeUnit)}
              </span>
            </div>
            <div className="studio-nft-analysis-line-wrap">
              {salesTimeline.length ? (
                <svg
                  className="studio-nft-analysis-line-chart"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  role="img"
                  aria-label="Line chart of sale prices over time"
                >
                  <line x1="0" y1="100" x2="100" y2="100" className="studio-nft-analysis-line-axis-stroke" />
                  <line x1="0" y1="0" x2="0" y2="100" className="studio-nft-analysis-line-axis-stroke" />
                  <polyline
                    points={timelinePath}
                    fill="none"
                    stroke="#9fb4c8"
                    strokeWidth="0.5"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                </svg>
              ) : (
                <p className="studio-nft-analysis-status">No timeline data available.</p>
              )}
            </div>
            {salesTimeline.length ? (
              <div className="studio-nft-analysis-line-axis">
                <span>{timelineStart}</span>
                <span>Price ({PROJECTS[selectedProject].volumeUnit})</span>
                <span>{timelineEnd}</span>
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="studio-nft-analysis-panel">
          <p className="studio-nft-analysis-muted">
            Showing {normalizedSales.length} sales | Total volume:{' '}
            {formatCurrency(totalVolume, PROJECTS[selectedProject].volumeUnit)}
          </p>
          <div className="studio-nft-analysis-table-wrap">
            <table className="studio-nft-analysis-table">
              <thead>
                <tr>
                  <th>Collection</th>
                  <th>Ape ID</th>
                  <th>Sale Date</th>
                  <th>Price</th>
                  {traitTypes.map((traitType) => (
                    <th key={traitType}>{traitType}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {normalizedSales.length ? (
                  normalizedSales.map((sale) => (
                    <tr key={sale.eventId || `${sale.apeId}-${sale.timestamp}`}>
                      <td>{sale.collection}</td>
                      <td>{sale.apeLabel}</td>
                      <td>{sale.saleDate}</td>
                      <td>{formatCurrency(sale.priceEth, PROJECTS[selectedProject].volumeUnit)}</td>
                      {traitTypes.map((traitType) => {
                        const trait = sale.traits.find((item) => item.traitType === traitType);
                        return <td key={`${sale.eventId || sale.apeId}-${traitType}`}>{trait?.value || '-'}</td>;
                      })}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4 + traitTypes.length}>No sales data available.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {snapshotConfirmOpen ? (
        <div className="studio-nft-analysis-confirm-overlay" role="dialog" aria-modal="true">
          <div className="studio-nft-analysis-confirm-card">
            <p className="studio-nft-analysis-confirm-text">
              Are you sure you want to download the Snapshot of the graph, it will be saved as a
              .jpeg
            </p>
            {snapshotError ? <p className="studio-nft-analysis-confirm-error">{snapshotError}</p> : null}
            <div className="studio-nft-analysis-confirm-actions">
              <button
                type="button"
                className="studio-nft-analysis-view-btn"
                onClick={() => setSnapshotConfirmOpen(false)}
                disabled={snapshotBusy}
              >
                Cancel
              </button>
              <button
                type="button"
                className="studio-nft-analysis-view-btn studio-nft-analysis-view-btn--active"
                onClick={downloadSnapshot}
                disabled={snapshotBusy}
              >
                {snapshotBusy ? 'Downloading…' : 'Download .jpeg'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
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
