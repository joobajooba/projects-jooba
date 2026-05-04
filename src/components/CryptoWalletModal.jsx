import { useEffect, useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useDisconnect } from 'wagmi';
import { useApeChainBalanceDisplay } from '../hooks/useApeChainBalanceDisplay';
import { useWalletProfile } from '../hooks/useWalletProfile';

function shortenAddress(address) {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function CryptoWalletModalContent({ account, mounted, open, openConnectModal, onClose }) {
  const ready = mounted;
  const connected = ready && account?.address;
  const [usernameValue, setUsernameValue] = useState('');
  const { disconnect } = useDisconnect();
  const { text: apeBalanceText } = useApeChainBalanceDisplay(account?.address);
  const { username, loading, needsUsername, saveUsername, saveError, setSaveError } = useWalletProfile(account?.address);

  useEffect(() => {
    if (open) {
      setUsernameValue('');
      setSaveError(null);
    }
  }, [open, setSaveError]);

  const handleUsernameSubmit = async (event) => {
    event.preventDefault();
    await saveUsername(usernameValue);
  };

  const handleDisconnect = () => {
    disconnect();
    onClose();
  };

  return (
    <div className="c-modal__panel" role="dialog" aria-modal="true" aria-labelledby="crypto-wallet-title">
      <div className="c-modal__header">
        <div>
          <p className="c-text c-text--eyebrow">Crypto Wallet</p>
          <h2 id="crypto-wallet-title" className="c-heading c-heading--modal">
            Wallet Details
          </h2>
        </div>
        <button type="button" className="c-button c-button--ghost c-modal__close" onClick={onClose} aria-label="Close modal">
          x
        </button>
      </div>

      {!connected ? (
        <div className="c-stack c-stack--lg">
          <p className="c-text c-text--muted">Connect your wallet to view your ApeChain balance and create your username.</p>
          <button type="button" className="c-button c-button--primary" onClick={openConnectModal}>
            Connect Wallet
          </button>
        </div>
      ) : (
        <div className="c-stack c-stack--lg">
          <div className="c-info-list">
            <div className="c-info-list__item">
              <span className="c-info-list__label">Wallet Address</span>
              <span className="c-info-list__value">{shortenAddress(account.address)}</span>
            </div>
            {username ? (
              <div className="c-info-list__item">
                <span className="c-info-list__label">Username</span>
                <span className="c-info-list__value">{username}</span>
              </div>
            ) : null}
            <div className="c-info-list__item c-info-list__item--balance">
              <span className="c-token-balance">
                <img src="/apechain-logo-mark.png" alt="" className="c-token-balance__logo" width={44} height={44} />
                <span className="c-token-balance__value">{apeBalanceText}</span>
              </span>
            </div>
          </div>

          {loading ? <p className="c-text c-text--muted">Checking username...</p> : null}

          {needsUsername ? (
            <form className="c-form" onSubmit={handleUsernameSubmit}>
              <label className="c-form__label" htmlFor="wallet-username">
                Create Username
              </label>
              <input
                id="wallet-username"
                className="c-form__input"
                value={usernameValue}
                onChange={(event) => setUsernameValue(event.target.value)}
                autoComplete="username"
                maxLength={32}
                placeholder="your_name"
                required
              />
              {saveError ? <p className="c-form__error">{saveError}</p> : null}
              <button type="submit" className="c-button c-button--primary">
                Save Username
              </button>
            </form>
          ) : null}

          <button type="button" className="c-button c-button--danger" onClick={handleDisconnect}>
            Disconnect Wallet
          </button>
        </div>
      )}
    </div>
  );
}

export default function CryptoWalletModal({ open, onClose }) {
  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <ConnectButton.Custom>
      {(ctx) => (
        <div className="c-modal" role="presentation">
          <button type="button" className="c-modal__overlay" onClick={onClose} aria-label="Close wallet modal" />
          <CryptoWalletModalContent {...ctx} open={open} onClose={onClose} />
        </div>
      )}
    </ConnectButton.Custom>
  );
}
