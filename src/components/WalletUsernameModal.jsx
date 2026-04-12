import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export default function WalletUsernameModal({
  open,
  address,
  ensName,
  onComplete,
  saveUsername,
  saveError,
  setSaveError,
  onUseDifferentWallet,
}) {
  const [value, setValue] = useState(ensName?.replace(/\./g, '_') ?? '');

  useEffect(() => {
    if (open) {
      setValue((v) => v || ensName?.replace(/\./g, '_') || '');
      setSaveError?.(null);
    }
  }, [open, ensName, setSaveError]);

  if (!open || typeof document === 'undefined') return null;

  const shortAddr = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : '';

  const onSubmit = async (e) => {
    e.preventDefault();
    const ok = await saveUsername(value);
    if (ok) onComplete?.();
  };

  return createPortal(
    <div className="wallet-username-modal-root" role="presentation">
      <div className="wallet-username-modal-backdrop" aria-hidden />
      <div
        className="wallet-username-modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="wallet-username-title"
      >
        <h2 id="wallet-username-title" className="wallet-username-modal-title">
          Choose a username
        </h2>
        <p className="wallet-username-modal-sub">
          This name is shown on your profile for wallet <span className="wallet-mono">{shortAddr}</span>.
        </p>
        <form onSubmit={onSubmit} className="wallet-username-modal-form">
          <label className="wallet-username-modal-label" htmlFor="wallet-username-input">
            Username
          </label>
          <input
            id="wallet-username-input"
            className="wallet-username-modal-input"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoComplete="username"
            maxLength={32}
            placeholder="your_name"
            required
          />
          {saveError ? <p className="wallet-username-modal-error">{saveError}</p> : null}
          <button type="submit" className="wallet-username-modal-submit">
            Save and continue
          </button>
          <button
            type="button"
            className="wallet-username-modal-secondary"
            onClick={() => onUseDifferentWallet?.()}
          >
            Use a different wallet
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
}
