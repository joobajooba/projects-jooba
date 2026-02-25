/**
 * Blank page at /test – no navbar, no main site code or styles.
 * Uses only this folder's CSS. Route: j00ba.xyz/test
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import NFTSelector from '../../components/NFTSelector';
import './TestPage.css';

/** Convert hex to HSL (h 0-360, s 0-100, l 0-100) */
function hexToHsl(hex) {
  const m = hex.match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return { h: 0, s: 50, l: 50 };
  let r = parseInt(m[1], 16) / 255, g = parseInt(m[2], 16) / 255, b = parseInt(m[3], 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) h = s = 0;
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

/** Convert HSL to hex */
function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
  };
  const r = Math.round(f(0) * 255), g = Math.round(f(8) * 255), b = Math.round(f(4) * 255);
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

/**
 * Drag-on-grid colour picker. Uses a saturation/value box and hue slider.
 */
function ColorPickerGrid({ value, onChange }) {
  const boxRef = useRef(null);
  const [hue, setHue] = useState(0);
  const [s, setS] = useState(50);
  const [l, setL] = useState(50);

  useEffect(() => {
    const hsl = hexToHsl(value);
    setHue(hsl.h);
    setS(hsl.s);
    setL(hsl.l);
  }, [value]);

  const updateFromSl = useCallback((sVal, lVal) => {
    setS(sVal);
    setL(lVal);
    onChange(hslToHex(hue, sVal, lVal));
  }, [hue, onChange]);

  const updateHue = useCallback((h) => {
    setHue(h);
    onChange(hslToHex(h, s, l));
  }, [s, l, onChange]);

  const handleBoxPointer = useCallback((e) => {
    const box = boxRef.current;
    if (!box) return;
    const rect = box.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    const sVal = Math.round(x * 100);
    const lVal = Math.round((1 - y) * 100);
    updateFromSl(sVal, lVal);
  }, [updateFromSl]);

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
        style={{ background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${hue}, 100%, 50%))` }}
        onPointerDown={handleBoxPointerDown}
        onClick={handleBoxPointer}
        role="application"
        aria-label="Pick saturation and lightness by dragging on grid"
      >
        <span
          className="test-page-color-picker-marker"
          style={{
            left: `${s}%`,
            top: `${100 - l}%`,
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
            <div className="test-page-modal-label" style={{ marginTop: 16 }}>
              Profile picture border colour
            </div>
            <ColorPickerGrid value={profileBorderColor} onChange={setProfileBorderColor} />
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
