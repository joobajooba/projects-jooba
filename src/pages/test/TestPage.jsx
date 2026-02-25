/**
 * Blank page at /test – no navbar, no main site code or styles.
 * Uses only this folder's CSS. Route: j00ba.xyz/test
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import NFTSelector from '../../components/NFTSelector';
import './TestPage.css';

/** Convert hex to HSV (h 0-360, s 0-100, v 0-100). Top of grid = full value = vivid colour. */
function hexToHsv(hex) {
  const m = hex.match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return { h: 0, s: 80, v: 100 };
  const r = parseInt(m[1], 16) / 255, g = parseInt(m[2], 16) / 255, b = parseInt(m[3], 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  const v = max;
  const s = max === 0 ? 0 : d / max;
  let h = 0;
  if (d !== 0) {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), v: Math.round(v * 100) };
}

/** Convert HSV to hex */
function hsvToHex(h, s, v) {
  s /= 100; v /= 100;
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; b = 0; } else if (h < 120) { r = x; g = c; b = 0; } else if (h < 180) { r = 0; g = c; b = x; } else if (h < 240) { r = 0; g = x; b = c; } else if (h < 300) { r = x; g = 0; b = c; } else { r = c; g = 0; b = x; }
  r = Math.round((r + m) * 255); g = Math.round((g + m) * 255); b = Math.round((b + m) * 255);
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

/**
 * Drag-on-grid colour picker. Grid = saturation (x) × value (y). Top = vivid, bottom = black.
 */
function ColorPickerGrid({ value, onChange }) {
  const boxRef = useRef(null);
  const [hue, setHue] = useState(0);
  const [s, setS] = useState(80);
  const [v, setV] = useState(100);

  useEffect(() => {
    const hsv = hexToHsv(value);
    setHue(hsv.h);
    setS(hsv.s);
    setV(hsv.v);
  }, [value]);

  const updateFromSv = useCallback((sVal, vVal) => {
    setS(sVal);
    setV(vVal);
    onChange(hsvToHex(hue, sVal, vVal));
  }, [hue, onChange]);

  const updateHue = useCallback((h) => {
    setHue(h);
    onChange(hsvToHex(h, s, v));
  }, [s, v, onChange]);

  const handleBoxPointer = useCallback((e) => {
    const box = boxRef.current;
    if (!box) return;
    const rect = box.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    const sVal = Math.round(x * 100);
    const vVal = Math.round((1 - y) * 100);
    updateFromSv(sVal, vVal);
  }, [updateFromSv]);

  const handleBoxPointerDown = useCallback((e) => {
    e.preventDefault();
    handleBoxPointer(e);
    const move = (ev) => handleBoxPointer(ev);
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }, [handleBoxPointer]);

  const handleHueSlider = useCallback((e) => {
    const h = Math.round(Number(e.target.value));
    updateHue(h);
  }, [updateHue]);

  return (
    <div className="test-page-color-picker">
      <div
        ref={boxRef}
        className="test-page-color-picker-box"
        style={{ background: `linear-gradient(to right, #fff, transparent), linear-gradient(to bottom, hsl(${hue}, 100%, 50%), #000)` }}
        onPointerDown={handleBoxPointerDown}
        onClick={handleBoxPointer}
        role="application"
        aria-label="Pick saturation and value by dragging on grid"
      >
        <span
          className="test-page-color-picker-marker"
          style={{
            left: `${s}%`,
            top: `${100 - v}%`,
            transform: 'translate(-50%, -50%)',
            backgroundColor: value
          }}
        />
      </div>
      <div className="test-page-color-picker-hue-wrap">
        <label className="test-page-color-picker-label">Hue</label>
        <input
          type="range"
          min="0"
          max="360"
          value={hue}
          onChange={handleHueSlider}
          className="test-page-color-picker-hue"
          aria-label="Hue"
        />
      </div>
      <div className="test-page-color-picker-preview" style={{ backgroundColor: value }} />
    </div>
  );
}

/**
 * Dropdown that toggles the colour picker open/closed.
 */
function BorderColorDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="test-page-border-color-dropdown">
      <button
        type="button"
        className="test-page-border-color-trigger"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={open ? 'Close border colour picker' : 'Open border colour picker'}
      >
        <span className="test-page-border-color-swatch" style={{ backgroundColor: value }} />
        <span className="test-page-border-color-label">Profile picture border colour</span>
        <span className="test-page-border-color-chevron" aria-hidden>{open ? '▼' : '▶'}</span>
      </button>
      {open && (
        <div className="test-page-border-color-panel">
          <ColorPickerGrid value={value} onChange={onChange} />
        </div>
      )}
    </div>
  );
}

/**
 * Picks the best available image URL for profile picture quality.
 * Prefers highest-resolution sources from the NFT (originalUrl, cachedUrl, etc.)
 * and upgrades common thumbnail query params to request larger size when possible.
 */
function getBestProfilePictureUrl(imageUrl, selectedNft) {
  const urlFromNft = selectedNft?.image?.originalUrl
    || selectedNft?.image?.cachedUrl
    || selectedNft?.image?.pngUrl
    || selectedNft?.image?.thumbnailUrl
    || selectedNft?.media?.[0]?.raw
    || selectedNft?.media?.[0]?.gateway
    || selectedNft?.rawMetadata?.image
    || selectedNft?.image_original_url
    || selectedNft?.image_url;
  const base = urlFromNft || imageUrl || '';
  if (!base) return '';
  try {
    const u = new URL(base);
    const params = u.searchParams;
    if (params.has('w') && parseInt(params.get('w'), 10) < 800) {
      params.set('w', '1200');
      return u.toString();
    }
    if (params.has('width') && parseInt(params.get('width'), 10) < 800) {
      params.set('width', '1200');
      return u.toString();
    }
    return base;
  } catch {
    return base;
  }
}

export default function TestPage() {
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [profilePictureUrl, setProfilePictureUrl] = useState('');
  const [profileBorderColor, setProfileBorderColor] = useState('#888888');
  const [showNFTSelector, setShowNFTSelector] = useState(false);

  const handleNFTSelect = (imageUrl, selectedNft) => {
    const bestUrl = getBestProfilePictureUrl(imageUrl, selectedNft);
    setProfilePictureUrl(bestUrl || imageUrl || '');
    setShowNFTSelector(false);
  };

  return (
    <div className="test-page" data-page="test">
      <aside className="test-page-sidebar">
        <div className="test-page-sidebar-header">
          <ConnectButton.Custom>
            {({ openConnectModal, openAccountModal, account, mounted }) => {
              const connected = mounted && account;
              return (
                <button
                  type="button"
                  className="test-page-icon-btn"
                  onClick={connected ? openAccountModal : openConnectModal}
                  title={connected ? 'Account' : 'Connect wallet'}
                  aria-label={connected ? 'Account' : 'Connect wallet'}
                >
                  <span className="test-page-icon" aria-hidden>{(connected ? '💳' : '🔗')}</span>
                </button>
              );
            }}
          </ConnectButton.Custom>
          <button
            type="button"
            className="test-page-icon-btn"
            title="Profile"
            aria-label="Profile"
            onClick={() => setProfileModalOpen(true)}
          >
            <span className="test-page-icon" aria-hidden>👤</span>
          </button>
          <button
            type="button"
            className="test-page-icon-btn"
            title="Site information"
            aria-label="Site information"
          >
            <span className="test-page-icon" aria-hidden>ℹ️</span>
          </button>
          <button
            type="button"
            className="test-page-icon-btn"
            title="Settings"
            aria-label="Settings"
          >
            <span className="test-page-icon" aria-hidden>⚙️</span>
          </button>
        </div>

        {profilePictureUrl && (
          <div className="test-page-sidebar-profile">
            <img
              src={profilePictureUrl}
              alt="Profile"
              className="test-page-sidebar-profile-img"
              style={{ border: `3px solid ${profileBorderColor}` }}
            />
          </div>
        )}
      </aside>

      {profileModalOpen && (
        <div
          className="test-page-modal-overlay"
          onClick={() => setProfileModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="test-page-profile-modal-title"
        >
          <div
            className="test-page-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="test-page-profile-modal-title" className="test-page-modal-title">Profile</h2>
            <label className="test-page-modal-label">
              Username
              <input
                type="text"
                className="test-page-modal-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                autoComplete="username"
              />
            </label>
            <div className="test-page-border-color-wrap" style={{ marginTop: 16 }}>
              <BorderColorDropdown value={profileBorderColor} onChange={setProfileBorderColor} />
            </div>
            <div className="test-page-modal-actions">
              <button
                type="button"
                className="test-page-modal-btn test-page-modal-btn-secondary"
                onClick={() => setShowNFTSelector(true)}
              >
                Choose NFT as profile picture
              </button>
              <button
                type="button"
                className="test-page-modal-btn test-page-modal-btn-primary"
                onClick={() => setProfileModalOpen(false)}
              >
                Done
              </button>
            </div>
            <button
              type="button"
              className="test-page-modal-close"
              onClick={() => setProfileModalOpen(false)}
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {showNFTSelector && (
        <NFTSelector
          onSelect={handleNFTSelect}
          onClose={() => setShowNFTSelector(false)}
        />
      )}
    </div>
  );
}
