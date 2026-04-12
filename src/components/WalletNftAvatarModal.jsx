import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNftsForWallet } from '../hooks/useNftsForWallet';

export default function WalletNftAvatarModal({ open, address, onClose, onPick }) {
  const { nfts, loading, error, reload, hasApiKey } = useNftsForWallet(open ? address : null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  const handlePick = (nft) => {
    onPick(nft.imageUrl);
    onClose();
  };

  return createPortal(
    <div className="wallet-nft-modal-root" role="presentation">
      <div className="wallet-nft-modal-backdrop" aria-hidden onClick={onClose} />
      <div
        className="wallet-nft-modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="wallet-nft-modal-title"
      >
        <div className="wallet-nft-modal-head">
          <h2 id="wallet-nft-modal-title" className="wallet-nft-modal-title">
            Choose profile picture
          </h2>
          <button type="button" className="wallet-nft-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <p className="wallet-nft-modal-sub">
          NFTs from Ethereum and ApeChain in this wallet. Select one to use as your avatar.
        </p>
        {!hasApiKey ? (
          <p className="wallet-nft-modal-error">
            Add <code className="wallet-nft-code">VITE_ALCHEMY_API_KEY</code> in your environment (Alchemy
            app with Ethereum + ApeChain enabled), then redeploy.
          </p>
        ) : null}
        {error && error !== 'missing_key' ? (
          <p className="wallet-nft-modal-error">{error}</p>
        ) : null}
        {hasApiKey && !loading && !error && nfts.length === 0 ? (
          <p className="wallet-nft-modal-empty">No NFT images found for this wallet on ETH or ApeChain.</p>
        ) : null}
        {loading ? <p className="wallet-nft-modal-loading">Loading NFTs…</p> : null}
        {hasApiKey && nfts.length > 0 ? (
          <div className="wallet-nft-grid">
            {nfts.map((nft) => (
              <button
                key={nft.id}
                type="button"
                className="wallet-nft-tile"
                onClick={() => handlePick(nft)}
                title={nft.name}
              >
                <img src={nft.imageUrl} alt="" loading="lazy" />
                <span className="wallet-nft-badge">{nft.chainLabel}</span>
              </button>
            ))}
          </div>
        ) : null}
        {hasApiKey && !loading ? (
          <button type="button" className="wallet-nft-retry" onClick={() => reload()}>
            Refresh list
          </button>
        ) : null}
      </div>
    </div>,
    document.body
  );
}
