import { useCallback, useEffect, useRef, useState } from 'react';
import { ConnectButton, useConnectModal } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { NavLink, Outlet } from 'react-router-dom';
import { AdventureRuntimeProvider } from './lib/adventureRuntime';

const NAV_ITEMS = [
  { label: 'Profile', to: '/profile', featured: true },
  { label: 'Community', to: '/community' },
  { label: 'Home', to: '/' },
  { label: 'Info', to: '/info' },
  { label: 'Adventures', to: '/adventures' },
  { label: 'Collection', to: '/collection' },
  { label: 'The Dungeon', to: '/the-dungeon' },
  { label: 'Official Links', to: '/official-links' },
  { label: 'FAQs', to: '/faqs' },
];

const FONT_STORAGE_KEY = 'j00ba-font-mode';
const VOLUME_STORAGE_KEY = 'j00ba-music-volume';
const TRACK_STORAGE_KEY = 'j00ba-music-track';
const MUSIC_ENABLED_STORAGE_KEY = 'j00ba-music-enabled';
const DEFAULT_VOLUME = 0.15;

const PLAYLIST = [
  { id: 'adventure-time', title: 'Adventure Time', src: '/audio/adventure-time.mp3' },
  { id: 'dark-fantasy', title: 'Dark Fantasy', src: '/audio/dark-fantasy.mp3' },
  { id: 'legend', title: 'Legend', src: '/audio/legend.mp3' },
  { id: 'crawling-danger', title: 'Crawling Danger', src: '/audio/crawling-danger.mp3' },
];

function readFontMode() {
  try {
    const value = window.localStorage.getItem(FONT_STORAGE_KEY);
    return value === 'readable' ? 'readable' : 'pixel';
  } catch {
    return 'pixel';
  }
}

function readVolume() {
  try {
    const raw = window.localStorage.getItem(VOLUME_STORAGE_KEY);
    if (raw === null) return DEFAULT_VOLUME;
    const value = Number(raw);
    if (!Number.isFinite(value)) return DEFAULT_VOLUME;
    return Math.min(1, Math.max(0, value));
  } catch {
    return DEFAULT_VOLUME;
  }
}

function readMusicEnabled() {
  try {
    const value = window.localStorage.getItem(MUSIC_ENABLED_STORAGE_KEY);
    return value !== '0';
  } catch {
    return true;
  }
}

function readTrackIndex() {
  try {
    const value = Number(window.localStorage.getItem(TRACK_STORAGE_KEY));
    if (!Number.isInteger(value) || value < 0 || value >= PLAYLIST.length) return 0;
    return value;
  } catch {
    return 0;
  }
}

function MenuIcon() {
  return (
    <svg
      className="sidebar-toggle__icon"
      viewBox="0 0 16 16"
      width="20"
      height="20"
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M4 2h8v1h1v1h1v8h-1v1h-1v1H4v-1H3v-1H2V4h1V3h1V2zm1 2v8h6V4H5z"
      />
      <rect x="5" y="6" width="6" height="1" fill="currentColor" />
      <rect x="5" y="8" width="6" height="1" fill="currentColor" />
      <rect x="5" y="10" width="6" height="1" fill="currentColor" />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg
      className="wallet-connect__icon"
      viewBox="0 0 16 16"
      width="20"
      height="20"
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M2 3h11v2h1v8H2V3zm2 2v6h8V9H9V6h3V5H4zm6 2h4v3h-4V7zm1 1v1h2V8h-2z"
      />
    </svg>
  );
}

function RainbowWalletButton() {
  return (
    <ConnectButton.Custom>
      {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
        const ready = mounted;
        const connected = ready && account && chain;
        const wrongNetwork = connected && chain.unsupported;
        const openModal = !connected
          ? openConnectModal
          : wrongNetwork
            ? openChainModal
            : openAccountModal;

        return (
          <div
            className="wallet-connect"
            {...(!ready && {
              'aria-hidden': true,
              style: {
                opacity: 0,
                pointerEvents: 'none',
                userSelect: 'none',
              },
            })}
          >
            <button
              type="button"
              className={`wallet-connect__trigger${
                connected ? ' wallet-connect__trigger--connected' : ''
              }${wrongNetwork ? ' wallet-connect__trigger--wrong-network' : ''}`}
              aria-label={
                !connected
                  ? 'Connect wallet'
                  : wrongNetwork
                    ? 'Switch to Robinhood Chain'
                    : `Wallet connected: ${account.address}`
              }
              aria-haspopup="dialog"
              onClick={openModal}
            >
              <WalletIcon />
              {connected && (
                <span className="wallet-connect__account">
                  {wrongNetwork ? 'Wrong network' : account.displayName}
                </span>
              )}
            </button>
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}

function SettingsSection({ id, title, children }) {
  const [open, setOpen] = useState(false);

  return (
    <section
      className={`site-settings-modal__section${open ? ' is-open' : ''}`}
      aria-labelledby={id}
    >
      <button
        type="button"
        className="site-settings-modal__section-toggle"
        aria-expanded={open}
        aria-controls={`${id}-body`}
        onClick={() => setOpen((value) => !value)}
      >
        <h3 id={id}>{title}</h3>
        <span aria-hidden="true">{open ? '−' : '+'}</span>
      </button>
      {open ? (
        <div id={`${id}-body`} className="site-settings-modal__section-body">
          {children}
        </div>
      ) : null}
    </section>
  );
}

function SiteSettingsModal({
  fontMode,
  onClose,
  onFontModeChange,
  volume,
  onVolumeChange,
  trackTitle,
  musicEnabled,
  onPrevTrack,
  onNextTrack,
  onToggleMusic,
}) {
  return (
    <div
      className="site-settings-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="site-settings-title"
      onClick={onClose}
    >
      <div
        className="site-settings-modal__panel"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="site-settings-modal__header">
          <div>
            <p className="adventure-panel__eyebrow">Preferences</p>
            <h2 id="site-settings-title">Settings</h2>
          </div>
          <button type="button" className="site-settings-modal__close" onClick={onClose}>
            Close
          </button>
        </div>

        <SettingsSection id="accessibility-title" title="Accessibility">
          <p>
            Switch site text between the pixel font and a simple Arial font that is easier to
            read.
          </p>
          <div className="site-settings-modal__font-options">
            <button
              type="button"
              className={fontMode === 'readable' ? 'is-active' : undefined}
              aria-pressed={fontMode === 'readable'}
              onClick={() => onFontModeChange('readable')}
            >
              Simple Arial font
            </button>
            <button
              type="button"
              className={fontMode === 'pixel' ? 'is-active' : undefined}
              aria-pressed={fontMode === 'pixel'}
              onClick={() => onFontModeChange('pixel')}
            >
              Pixel art font
            </button>
          </div>
        </SettingsSection>

        <SettingsSection id="sound-title" title="Sound settings">
          <p>Background music loops through the playlist. Adjust volume or change tracks.</p>
          <div className="site-settings-modal__now-playing">
            <span className="site-settings-modal__track-label">
              {musicEnabled ? 'Now playing' : 'Stopped'}
            </span>
            <strong>{trackTitle}</strong>
          </div>
          <label className="site-settings-modal__volume">
            <span>Volume {Math.round(volume * 100)}%</span>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={Math.round(volume * 100)}
              onChange={(event) => onVolumeChange(Number(event.target.value) / 100)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(volume * 100)}
              aria-label="Music volume"
            />
          </label>
          <div className="site-settings-modal__transport">
            <button type="button" onClick={onPrevTrack} aria-label="Previous song">
              ←
            </button>
            <button type="button" onClick={onToggleMusic}>
              {musicEnabled ? 'Stop' : 'Play'}
            </button>
            <button type="button" onClick={onNextTrack} aria-label="Next song">
              →
            </button>
          </div>
        </SettingsSection>
      </div>
    </div>
  );
}

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [fontMode, setFontMode] = useState(() =>
    typeof window === 'undefined' ? 'pixel' : readFontMode()
  );
  const [volume, setVolume] = useState(() =>
    typeof window === 'undefined' ? DEFAULT_VOLUME : readVolume()
  );
  const [trackIndex, setTrackIndex] = useState(() =>
    typeof window === 'undefined' ? 0 : readTrackIndex()
  );
  const [musicEnabled, setMusicEnabled] = useState(() =>
    typeof window === 'undefined' ? true : readMusicEnabled()
  );
  const audioRef = useRef(null);
  const unlockedRef = useRef(false);
  const musicEnabledRef = useRef(true);
  const { address, connector } = useAccount();
  const { openConnectModal } = useConnectModal();
  const walletAccount = address ?? '';
  const walletName = connector?.name ?? 'Wallet';
  const currentTrack = PLAYLIST[trackIndex] ?? PLAYLIST[0];
  musicEnabledRef.current = musicEnabled;

  const ensurePlayback = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;
    if (!musicEnabledRef.current) {
      audio.pause();
      return;
    }
    try {
      await audio.play();
      unlockedRef.current = true;
    } catch {
      // Browsers may block autoplay until a user gesture.
    }
  }, [volume]);

  const changeTrack = useCallback((direction) => {
    unlockedRef.current = true;
    setTrackIndex((current) => (current + direction + PLAYLIST.length) % PLAYLIST.length);
  }, []);

  const toggleMusic = useCallback(() => {
    unlockedRef.current = true;
    setMusicEnabled((current) => !current);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('font-readable', fontMode === 'readable');
    try {
      window.localStorage.setItem(FONT_STORAGE_KEY, fontMode);
    } catch {
      // Ignore storage failures.
    }
  }, [fontMode]);

  useEffect(() => {
    try {
      window.localStorage.setItem(VOLUME_STORAGE_KEY, String(volume));
    } catch {
      // Ignore storage failures.
    }
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    try {
      window.localStorage.setItem(TRACK_STORAGE_KEY, String(trackIndex));
    } catch {
      // Ignore storage failures.
    }
  }, [trackIndex]);

  useEffect(() => {
    try {
      window.localStorage.setItem(MUSIC_ENABLED_STORAGE_KEY, musicEnabled ? '1' : '0');
    } catch {
      // Ignore storage failures.
    }
    const audio = audioRef.current;
    if (!audio) return;
    if (musicEnabled) {
      ensurePlayback();
    } else {
      audio.pause();
    }
  }, [musicEnabled, ensurePlayback]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;

    audio.loop = false;
    audio.src = currentTrack.src;
    audio.load();
    audio.volume = volume;

    const handleEnded = () => {
      setTrackIndex((current) => (current + 1) % PLAYLIST.length);
    };
    audio.addEventListener('ended', handleEnded);
    ensurePlayback();

    return () => {
      audio.removeEventListener('ended', handleEnded);
    };
    // Reload only when the song changes; volume is applied in its own effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack.src, ensurePlayback]);

  useEffect(() => {
    const unlock = () => {
      unlockedRef.current = true;
      ensurePlayback();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    ensurePlayback();
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, [ensurePlayback]);

  return (
    <div className="page">
      <audio ref={audioRef} preload="auto" playsInline />

      {!sidebarOpen && (
        <button
          type="button"
          className="sidebar-toggle sidebar-toggle--open"
          aria-label="Open sidebar"
          onClick={() => setSidebarOpen(true)}
        >
          <MenuIcon />
        </button>
      )}

      <div className="top-actions">
        <button
          type="button"
          className="site-settings__trigger site-settings__trigger--label"
          aria-label="Open settings"
          aria-haspopup="dialog"
          aria-expanded={settingsOpen}
          onClick={() => setSettingsOpen(true)}
        >
          Settings
        </button>
        <RainbowWalletButton />
      </div>

      {settingsOpen ? (
        <SiteSettingsModal
          fontMode={fontMode}
          onClose={() => setSettingsOpen(false)}
          onFontModeChange={setFontMode}
          volume={volume}
          onVolumeChange={setVolume}
          trackTitle={currentTrack.title}
          musicEnabled={musicEnabled}
          onPrevTrack={() => changeTrack(-1)}
          onNextTrack={() => changeTrack(1)}
          onToggleMusic={toggleMusic}
        />
      ) : null}

      <aside
        className={`sidebar${sidebarOpen ? ' sidebar--open' : ''}`}
        aria-hidden={!sidebarOpen}
      >
        <button
          type="button"
          className="sidebar-toggle sidebar-toggle--close"
          aria-label="Close sidebar"
          onClick={() => setSidebarOpen(false)}
        >
          <MenuIcon />
        </button>

        <nav className="sidebar-nav" aria-label="Main">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `sidebar-nav__link${isActive ? ' sidebar-nav__link--active' : ''}${
                  item.featured ? ' sidebar-nav__link--profile' : ''
                }`
              }
              onClick={() => setSidebarOpen(false)}
            >
              <span className={item.featured ? 'sidebar-nav__profile-label' : undefined}>
                {item.label}
              </span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="page-content">
        <AdventureRuntimeProvider walletAccount={walletAccount}>
          <Outlet
            context={{
              walletAccount,
              walletName,
              openWalletMenu: () => openConnectModal?.(),
            }}
          />
        </AdventureRuntimeProvider>
      </main>
    </div>
  );
}
