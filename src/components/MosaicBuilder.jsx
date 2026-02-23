import { useState, useMemo } from 'react';
import { useMosaicNFTs } from '../hooks/useMosaicNFTs';
import './MosaicBuilder.css';

const GRID_SIZES = [
  { value: '2x2', label: '2×2', count: 4 },
  { value: '4x4', label: '4×4', count: 16 },
];

/**
 * Build a profile mosaic: choose grid size (2x2 or 4x4) and assign NFTs from wallet (ETH + ApeChain).
 */
export default function MosaicBuilder({ initialMosaic, onSave, onClose }) {
  const { nfts, loading, error, refetch } = useMosaicNFTs();
  const [gridSize, setGridSize] = useState(initialMosaic?.gridSize || '2x2');
  const [cells, setCells] = useState(() => {
    const size = initialMosaic?.gridSize || '2x2';
    const count = size === '4x4' ? 16 : 4;
    const initial = initialMosaic?.cells || [];
    return Array.from({ length: count }, (_, i) => initial[i] || { imageUrl: '' });
  });
  const [selectedCellIndex, setSelectedCellIndex] = useState(null);

  const cellCount = gridSize === '4x4' ? 16 : 4;
  const cellsForGrid = useMemo(() => {
    const base = [...cells];
    if (base.length !== cellCount) {
      return Array.from({ length: cellCount }, (_, i) => base[i] || { imageUrl: '' });
    }
    return base;
  }, [cells, cellCount]);

  const handleGridSizeChange = (newSize) => {
    setGridSize(newSize);
    const count = newSize === '4x4' ? 16 : 4;
    setCells((prev) => {
      const next = Array.from({ length: count }, (_, i) => prev[i] || { imageUrl: '' });
      return next;
    });
    setSelectedCellIndex(null);
  };

  const handleAssignNft = (nft) => {
    if (selectedCellIndex == null) return;
    const url = nft.imageUrl;
    if (!url) return;
    setCells((prev) => {
      const next = [...prev];
      next[selectedCellIndex] = { imageUrl: url };
      return next;
    });
    setSelectedCellIndex(null);
  };

  const handleSave = () => {
    onSave({ gridSize, cells: cellsForGrid });
    onClose();
  };

  const handleClearCell = (e, index) => {
    e.stopPropagation();
    setCells((prev) => {
      const next = [...prev];
      next[index] = { imageUrl: '' };
      return next;
    });
    if (selectedCellIndex === index) setSelectedCellIndex(null);
  };

  return (
    <div className="mosaic-builder-overlay" onClick={onClose}>
      <div className="mosaic-builder-panel" onClick={(e) => e.stopPropagation()}>
        <div className="mosaic-builder-header">
          <h2>Edit Mosaic</h2>
          <button type="button" onClick={onClose} className="mosaic-builder-close" aria-label="Close">
            ×
          </button>
        </div>

        <div className="mosaic-builder-grid-size">
          <span>Grid size:</span>
          {GRID_SIZES.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              className={`mosaic-builder-grid-btn ${gridSize === value ? 'active' : ''}`}
              onClick={() => handleGridSizeChange(value)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mosaic-builder-body">
          <div className="mosaic-builder-preview">
            <p className="mosaic-builder-hint">Click a cell, then pick an NFT below to assign.</p>
            <div
              className={`mosaic-builder-grid mosaic-builder-grid-${gridSize}`}
              style={{
                gridTemplateColumns: `repeat(${gridSize === '4x4' ? 4 : 2}, 1fr)`,
              }}
            >
              {cellsForGrid.map((cell, index) => (
                <div
                  key={index}
                  role="button"
                  tabIndex={0}
                  className={`mosaic-builder-cell ${selectedCellIndex === index ? 'selected' : ''}`}
                  onClick={() => setSelectedCellIndex(index)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedCellIndex(index);
                    }
                  }}
                >
                  {cell.imageUrl ? (
                    <>
                      <img src={cell.imageUrl} alt="" />
                      <button
                        type="button"
                        className="mosaic-builder-cell-clear"
                        onClick={(e) => handleClearCell(e, index)}
                        aria-label="Clear cell"
                      >
                        ×
                      </button>
                    </>
                  ) : (
                    <span className="mosaic-builder-cell-placeholder">+</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="mosaic-builder-nfts">
            <p className="mosaic-builder-nfts-title">Your NFTs (Ethereum & ApeChain)</p>
            {loading && <p className="mosaic-builder-loading">Loading NFTs…</p>}
            {error && (
              <div className="mosaic-builder-error">
                <p>{error}</p>
                <button type="button" onClick={refetch}>Retry</button>
              </div>
            )}
            {!loading && !error && nfts.length === 0 && (
              <p className="mosaic-builder-empty">No NFTs found. Connect a wallet with NFTs on Ethereum or ApeChain.</p>
            )}
            {!loading && !error && nfts.length > 0 && (
              <div className="mosaic-builder-nft-grid">
                {nfts.map((nft, idx) => (
                  <button
                    key={nft.id ?? idx}
                    type="button"
                    className="mosaic-builder-nft-item"
                    onClick={() => handleAssignNft(nft)}
                    title={nft.name}
                  >
                    {nft.imageUrl ? (
                      <img src={nft.imageUrl} alt="" />
                    ) : (
                      <span>No img</span>
                    )}
                    <span className="mosaic-builder-nft-network">{nft.network}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mosaic-builder-actions">
          <button type="button" className="mosaic-builder-btn secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="mosaic-builder-btn primary" onClick={handleSave}>
            Save Mosaic
          </button>
        </div>
      </div>
    </div>
  );
}
