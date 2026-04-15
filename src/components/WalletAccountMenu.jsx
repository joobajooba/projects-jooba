import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDisconnect } from 'wagmi';
import { isPageSoundsMuted, setPageSoundsMuted } from '../lib/clickSound';

function formatAddress(addr) {
  if (!addr) return '';
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function IconCog() {
  return (
    <svg className="wallet-menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
      <path d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  );
}

function IconLogout() {
  return (
    <svg className="wallet-menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function WalletAccountMenu({
  open,
  anchorRef,
  onClose,
  address,
  avatarUrl,
  username,
  displayBalance,
  balanceHint,
  apeDisplayBalance,
  apeBalanceHint,
  chainIconUrl,
  chainIconBg,
  onSignIn,
  onAvatarClick,
}) {
  const { disconnect } = useDisconnect();
  const menuRef = useRef(null);
  const settingsDialogRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [muteSounds, setMuteSounds] = useState(() => isPageSoundsMuted());

  const updatePosition = useCallback(() => {
    const el = anchorRef?.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({
      top: r.bottom + 8,
      right: Math.max(8, window.innerWidth - r.right),
    });
  }, [anchorRef]);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (settingsOpen) {
        setSettingsOpen(false);
        return;
      }
      onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose, settingsOpen]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      const t = e.target;
      if (menuRef.current?.contains(t)) return;
      if (anchorRef?.current?.contains(t)) return;
      if (settingsDialogRef.current?.contains(t)) return;
      onClose();
    };
    const id = window.setTimeout(() => document.addEventListener('mousedown', onDown), 0);
    return () => {
      window.clearTimeout(id);
      document.removeEventListener('mousedown', onDown);
    };
  }, [open, onClose, anchorRef]);

  useEffect(() => {
    if (open) return;
    setSettingsOpen(false);
  }, [open]);

  if (!open || typeof document === 'undefined') return null;

  const handleDisconnect = () => {
    disconnect();
    onClose();
  };

  const handleSettings = () => {
    setSettingsOpen(true);
  };

  const handleMuteSoundsChange = (e) => {
    const nextMuted = e.target.checked;
    setMuteSounds(nextMuted);
    setPageSoundsMuted(nextMuted);
  };

  return createPortal(
    <>
      <div className="wallet-menu-backdrop" aria-hidden onClick={onClose} />
      <div
        ref={menuRef}
        className="wallet-menu-panel"
        style={{ top: pos.top, right: pos.right }}
        role="menu"
        aria-label="Wallet menu"
      >
        {!address ? (
          <div className="wallet-menu-section wallet-menu-pad">
            <p className="wallet-menu-hint">Connect a wallet to continue.</p>
            <button type="button" className="wallet-menu-signin" onClick={() => { onSignIn(); onClose(); }}>
              Sign in
            </button>
          </div>
        ) : (
          <>
            <div className="wallet-menu-header wallet-menu-pad">
              <button
                type="button"
                className="wallet-menu-avatar-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onAvatarClick?.();
                }}
                title="Change profile picture (NFTs)"
                aria-label="Choose NFT profile picture"
              >
                <img className="wallet-menu-avatar-lg" src={avatarUrl} alt="" width={48} height={48} />
              </button>
              <div className="wallet-menu-header-text">
                <div className="wallet-menu-username">{username || 'User'}</div>
                <div className="wallet-menu-address">{formatAddress(address)}</div>
              </div>
            </div>
            <div className="wallet-menu-divider" />
            <div className="wallet-menu-balance wallet-menu-pad">
              <div className="wallet-menu-balance-row">
                {chainIconUrl ? (
                  <img
                    src={chainIconUrl}
                    alt=""
                    width={36}
                    height={36}
                    className="wallet-menu-chain-lg"
                    style={{ background: chainIconBg }}
                  />
                ) : (
                  <div className="wallet-menu-chain-fallback" />
                )}
                <div className="wallet-menu-balance-text">
                  <span className="wallet-menu-balance-label">Ethereum</span>
                  <span className="wallet-menu-balance-value" title={balanceHint}>
                    {displayBalance ?? '—'}
                  </span>
                </div>
              </div>
              <div className="wallet-menu-balance-row">
                <img
                  src="/apechain-logo-mark.png"
                  alt=""
                  width={36}
                  height={36}
                  className="wallet-menu-chain-lg wallet-menu-chain-lg--apechain"
                />
                <div className="wallet-menu-balance-text">
                  <span className="wallet-menu-balance-label">ApeChain</span>
                  <span className="wallet-menu-balance-value" title={apeBalanceHint}>
                    {apeDisplayBalance ?? '—'}
                  </span>
                </div>
              </div>
            </div>
            <div className="wallet-menu-divider" />
            <button
              type="button"
              className="wallet-menu-item"
              role="menuitem"
              title="Coming soon"
              onClick={handleSettings}
            >
              <IconCog />
              <span>Settings</span>
            </button>
            <div className="wallet-menu-footer wallet-menu-pad">
              <button type="button" className="wallet-menu-logout" role="menuitem" onClick={handleDisconnect}>
                <IconLogout />
                <span>Log out</span>
              </button>
            </div>
          </>
        )}
      </div>
      {settingsOpen ? (
        <div className="wallet-settings-modal-root" role="dialog" aria-modal="true" aria-label="Settings">
          <button
            type="button"
            className="wallet-settings-modal-backdrop"
            aria-label="Close settings"
            onClick={() => setSettingsOpen(false)}
          />
          <div ref={settingsDialogRef} className="wallet-settings-modal-dialog">
            <div className="wallet-settings-modal-head">
              <h3 className="wallet-settings-modal-title">Settings</h3>
              <button
                type="button"
                className="wallet-settings-modal-close"
                aria-label="Close settings"
                onClick={() => setSettingsOpen(false)}
              >
                ×
              </button>
            </div>
            <label className="wallet-settings-modal-checkbox-row">
              <input
                type="checkbox"
                className="wallet-settings-modal-checkbox"
                checked={muteSounds}
                onChange={handleMuteSoundsChange}
              />
              <span>Mute page sounds</span>
            </label>
          </div>
        </div>
      ) : null}
    </>,
    document.body
  );
}
