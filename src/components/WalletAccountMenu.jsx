import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDisconnect } from 'wagmi';

function formatAddress(addr) {
  if (!addr) return '';
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function IconGear() {
  return (
    <svg className="wallet-menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path
        d="M12 1v2m0 18v2M4.22 4.22l1.41 1.41m12.72 12.72l1.41 1.41M1 12h2m18 0h2M4.22 19.78l1.41-1.41M18.36 5.64l1.41-1.41"
        strokeLinecap="round"
      />
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
  chainIconUrl,
  chainIconBg,
  onSignIn,
}) {
  const { disconnect } = useDisconnect();
  const menuRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, right: 0 });

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
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      const t = e.target;
      if (menuRef.current?.contains(t)) return;
      if (anchorRef?.current?.contains(t)) return;
      onClose();
    };
    const id = window.setTimeout(() => document.addEventListener('mousedown', onDown), 0);
    return () => {
      window.clearTimeout(id);
      document.removeEventListener('mousedown', onDown);
    };
  }, [open, onClose, anchorRef]);

  if (!open || typeof document === 'undefined') return null;

  const handleDisconnect = () => {
    disconnect();
    onClose();
  };

  const handleSettings = () => {
    onClose();
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
              <img className="wallet-menu-avatar-lg" src={avatarUrl} alt="" width={48} height={48} />
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
                  <span className="wallet-menu-balance-label">Balance</span>
                  <span className="wallet-menu-balance-value">{displayBalance ?? '—'}</span>
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
              <IconGear />
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
    </>,
    document.body
  );
}
