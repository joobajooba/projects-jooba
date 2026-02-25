import { useState, useMemo } from 'react';
import { useMosaicNFTs } from '../hooks/useMosaicNFTs';
import './MosaicEditor.css';

const GRID_OPTIONS = [
  { value: '2x2', label: '2×2', dim: 2 },
  { value: '4x4', label: '4×4', dim: 4 },
  { value: '8x8', label: '8×8', dim: 8 },
  { value: '12x12', label: '12×12', dim: 12 },
];

/**
 * Mosaic editor for the Edit Profile popup. NPC Mosaic–inspired:
 * Grid size (2x2, 4x4, 8x8, 12x12), preview grid, NFT picker, Save Mosaic.
 */
export default function MosaicEditor({ initialMosaic, onSave, onBack }) {
  const { nfts, loading, error, refetch } = useMosaicNFTs();
  const [gridSize, setGridSize] = useState(initialMosaic?.gridSize || '2x2');
  const [collectionFilter, setCollectionFilter] = useState('');

  // One entry per contract (by address) so filtering is exact; display name for label
  const collections = useMemo(() => {
    const byContract = new Map();
    nfts.forEach((nft) => {
      const addr = nft.contractAddress;
      if (!addr) return;
      if (!byContract.has(addr)) {
        byContract.set(addr, nft.collection || 'Unknown collection');
      }
    });
    return Array.from(byContract.entries())
      .map(([address, name]) => ({ address, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [nfts]);

  const nftsFiltered = useMemo(() => {
    if (!collectionFilter) return nfts;
    return nfts.filter((nft) => nft.contractAddress === collectionFilter);
  }, [nfts, collectionFilter]);

  const dim = GRID_OPTIONS.find((o) => o.value === gridSize)?.dim ?? 2;
  const cellCount = dim * dim;

  const [cells, setCells] = useState(() => {
    const size = initialMosaic?.gridSize || '2x2';
    const d = GRID_OPTIONS.find((o) => o.value === size)?.dim ?? 2;
    const count = d * d;
    const initial = initialMosaic?.cells || [];
    return Array.from({ length: count }, (_, i) => initial[i] || { imageUrl: '' });
  });
  const [selectedCellIndex, setSelectedCellIndex] = useState(null);

  const cellsForGrid = useMemo(() => {
    const base = [...cells];
    if (base.length !== cellCount) {
      return Array.from({ length: cellCount }, (_, i) => base[i] || { imageUrl: '' });
    }
    return base;
  }, [cells, cellCount]);

  const handleGridSizeChange = (e) => {
    const newSize = e.target.value;
    const opt = GRID_OPTIONS.find((o) => o.value === newSize);
    if (!opt) return;
    setGridSize(newSize);
    const count = opt.dim * opt.dim;
    setCells((prev) =>
      Array.from({ length: count }, (_, i) => prev[i] || { imageUrl: '' })
    );
    setSelectedCellIndex(null);
  };

  const handleAssignNft = (nft) => {
    if (selectedCellIndex == null || !nft?.imageUrl) return;
    setCells((prev) => {
      const next = [...prev];
      next[selectedCellIndex] = { imageUrl: nft.imageUrl };
      return next;
    });
    setSelectedCellIndex(null);
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

  const handleSave = () => {
    onSave({ gridSize, cells: cellsForGrid });
  };

  return (
    <div className="mosaic-editor">
      <div className="mosaic-editor-header">
        <h3 className="mosaic-editor-title">
          <span className="mosaic-editor-title-icon">🎨</span>
          Mosaic Settings
        </h3>
      </div>

      <div className="mosaic-editor-setting">
        <label className="mosaic-editor-label">Grid Size</label>
        <select
          className="mosaic-editor-select"
          value={gridSize}
          onChange={handleGridSizeChange}
          aria-label="Grid size"
        >
          {GRID_OPTIONS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="mosaic-editor-preview-wrap">
        <p className="mosaic-editor-hint">Click a cell, then pick an NFT below to assign.</p>
        <div
          className={`mosaic-editor-grid mosaic-editor-grid-${gridSize}`}
          style={{
            '--mosaic-dim': dim,
          }}
        >
          {cellsForGrid.map((cell, index) => (
            <div
              key={index}
              role="button"
              tabIndex={0}
              className={`mosaic-editor-cell ${selectedCellIndex === index ? 'selected' : ''}`}
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
                    className="mosaic-editor-cell-clear"
                    onClick={(e) => handleClearCell(e, index)}
                    aria-label="Clear cell"
                  >
                    ×
                  </button>
                </>
              ) : (
                <span className="mosaic-editor-cell-placeholder">+</span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="mosaic-editor-nfts">
        <p className="mosaic-editor-nfts-title">Your NFTs (Ethereum & ApeChain)</p>
        {!loading && !error && nfts.length > 0 && (
          <div className="mosaic-editor-setting">
            <label className="mosaic-editor-label" htmlFor="mosaic-collection-filter">Collection</label>
            <select
              id="mosaic-collection-filter"
              className="mosaic-editor-select"
              value={collectionFilter}
              onChange={(e) => setCollectionFilter(e.target.value)}
              aria-label="Filter by collection"
            >
              <option value="">All collections</option>
              {collections.map(({ address, name }) => (
                <option key={address} value={address}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        )}
        {loading && <p className="mosaic-editor-loading">Loading NFTs…</p>}
        {error && (
          <div className="mosaic-editor-error">
            <p>{error}</p>
            <button type="button" className="mosaic-editor-retry" onClick={refetch}>
              Retry
            </button>
          </div>
        )}
        {!loading && !error && nfts.length === 0 && (
          <p className="mosaic-editor-empty">
            No NFTs found. Connect a wallet with NFTs on Ethereum or ApeChain.
          </p>
        )}
        {!loading && !error && nfts.length > 0 && nftsFiltered.length === 0 && (
          <p className="mosaic-editor-empty">
            No NFTs in this collection. Try another.
          </p>
        )}
        {!loading && !error && nftsFiltered.length > 0 && (
          <div className="mosaic-editor-nft-grid">
            {nftsFiltered.map((nft, idx) => (
              <button
                key={nft.id ?? idx}
                type="button"
                className="mosaic-editor-nft-item"
                onClick={() => handleAssignNft(nft)}
                title={nft.name}
              >
                {nft.imageUrl ? (
                  <img src={nft.imageUrl} alt="" />
                ) : (
                  <span className="mosaic-editor-nft-noimg">No img</span>
                )}
                <span className="mosaic-editor-nft-network">{nft.network}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mosaic-editor-actions">
        <button type="button" className="mosaic-editor-btn mosaic-editor-btn-secondary" onClick={onBack}>
          Back
        </button>
        <button type="button" className="mosaic-editor-btn mosaic-editor-btn-primary" onClick={handleSave}>
          💾 Save Mosaic
        </button>
      </div>
    </div>
  );
}
