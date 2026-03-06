import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import NFTSelector from './NFTSelector';
import { getAlchemyApiKey } from './lib/alchemy';
import { fetchUserProfile } from './userData';

const CELL_SIZE = 50;
const PADDING = 16;

const PANEL_ITEMS = [
  { id: 'rect', type: 'rectangle', cols: 6, rows: 10, label: 'User panel' },
  { id: 'sq-s', type: 'square-small', cols: 5, rows: 5, label: 'Image Portrait | Small' },
  { id: 'sq-l', type: 'square-large', cols: 2, rows: 2 },
];

function getGridCoords(clientX, clientY, containerRect, cols, rows) {
  const innerW = containerRect.width - 2 * PADDING;
  const innerH = containerRect.height - 2 * PADDING;
  const cellW = innerW / cols;
  const cellH = innerH / rows;
  const relX = clientX - containerRect.left - PADDING;
  const relY = clientY - containerRect.top - PADDING;
  return {
    col: Math.floor(relX / cellW),
    row: Math.floor(relY / cellH),
  };
}

function clampCell(item, col, row, gridCols, gridRows) {
  const maxCol = Math.max(0, gridCols - item.cols);
  const maxRow = Math.max(0, gridRows - item.rows);
  return {
    col: Math.max(0, Math.min(maxCol, col)),
    row: Math.max(0, Math.min(maxRow, row)),
  };
}

function isOverElement(clientX, clientY, el) {
  if (!el) return false;
  const r = el.getBoundingClientRect();
  return (
    clientX >= r.left &&
    clientX <= r.right &&
    clientY >= r.top &&
    clientY <= r.bottom
  );
}

export default function ProfileBuilderPage() {
  const gridContainerRef = useRef(null);
  const gridAreaRef = useRef(null);
  const panelDropZoneRef = useRef(null);
  const [gridSize, setGridSize] = useState({ cols: 10, rows: 20 });
  const [gridInnerSize, setGridInnerSize] = useState({ width: 0, height: 0 });
  const [placements, setPlacements] = useState({});
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverReturn, setDragOverReturn] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [profileBlockNftImages, setProfileBlockNftImages] = useState({});
  const [nftSelectorOpen, setNftSelectorOpen] = useState(false);
  const [nftSelectorForInstance, setNftSelectorForInstance] = useState(null);
  const [profile, setProfile] = useState({ username: null, xUsername: null });
  const { address } = useAccount();

  useEffect(() => {
    if (!address) {
      setProfile({ username: null, xUsername: null });
      return;
    }
    let cancelled = false;
    fetchUserProfile(address).then((data) => {
      if (!cancelled && data) {
        setProfile({
          username: data.username ?? null,
          xUsername: data.xUsername ?? null,
        });
      }
    });
    return () => { cancelled = true; };
  }, [address]);

  // Lock page scrolling while the builder is open so width/height stay static.
  useEffect(() => {
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, []);

  const updateGridSize = useCallback(() => {
    const el = gridAreaRef.current;
    if (!el) return;
    const w = el.clientWidth;
    const h = el.clientHeight;
    const innerW = w - 2 * PADDING;
    const innerH = h - 2 * PADDING;
    const cols = Math.max(10, Math.floor(innerW / CELL_SIZE));
    const rows = Math.max(20, Math.floor(innerH / CELL_SIZE));
    setGridInnerSize({ width: w, height: h });
    setGridSize((prev) =>
      prev.cols !== cols || prev.rows !== rows ? { cols, rows } : prev
    );
  }, []);

  useEffect(() => {
    updateGridSize();
    const el = gridAreaRef.current;
    if (!el) return;
    const observer = new ResizeObserver(updateGridSize);
    observer.observe(el);
    return () => observer.disconnect();
  }, [updateGridSize]);

  const cellWidthPx =
    gridInnerSize.width > 0
      ? (gridInnerSize.width - 2 * PADDING) / gridSize.cols
      : CELL_SIZE;
  const cellHeightPx =
    gridInnerSize.height > 0
      ? (gridInnerSize.height - 2 * PADDING) / gridSize.rows
      : CELL_SIZE;

  const placeOnGrid = useCallback(
    (draggedIdOrNew, col, row) => {
      const isNew = typeof draggedIdOrNew === 'string' && draggedIdOrNew.startsWith('new:');
      const templateId = isNew ? draggedIdOrNew.slice(4) : null;
      const item = isNew
        ? PANEL_ITEMS.find((i) => i.id === templateId)
        : null;

      if (isNew && item) {
        const { col: c, row: r } = clampCell(
          item,
          col,
          row,
          gridSize.cols,
          gridSize.rows
        );
        const instanceId = `${templateId}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        setPlacements((prev) => ({
          ...prev,
          [instanceId]: { col: c, row: r, templateId: item.id },
        }));
        return;
      }

      if (!isNew) {
        setPlacements((prev) => {
          const existing = prev[draggedIdOrNew];
          if (!existing) return prev;
          const template = PANEL_ITEMS.find((i) => i.id === existing.templateId);
          if (!template) return prev;
          const { col: c, row: r } = clampCell(
            template,
            col,
            row,
            gridSize.cols,
            gridSize.rows
          );
          return {
            ...prev,
            [draggedIdOrNew]: { ...existing, col: c, row: r },
          };
        });
      }
    },
    [gridSize.cols, gridSize.rows]
  );

  const returnToPanel = useCallback((instanceId) => {
    if (typeof instanceId === 'string' && instanceId.startsWith('new:')) return;
    setPlacements((prev) => {
      const next = { ...prev };
      delete next[instanceId];
      return next;
    });
    setProfileBlockNftImages((prev) => {
      const next = { ...prev };
      delete next[instanceId];
      return next;
    });
  }, []);

  const handleMouseUp = useCallback(
    (e) => {
      if (!draggedId) return;

      const overGrid = isOverElement(
        e.clientX,
        e.clientY,
        gridContainerRef.current
      );
      const overReturn = isOverElement(
        e.clientX,
        e.clientY,
        panelDropZoneRef.current
      );

      if (overGrid) {
        const rect = gridContainerRef.current.getBoundingClientRect();
        const { col, row } = getGridCoords(
          e.clientX,
          e.clientY,
          rect,
          gridSize.cols,
          gridSize.rows
        );
        placeOnGrid(draggedId, col, row);
      } else if (overReturn) {
        returnToPanel(draggedId);
      } else if (placements[draggedId]) {
        const { col, row } = placements[draggedId];
        placeOnGrid(draggedId, col, row);
      }

      setDraggedId(null);
      setDragOverReturn(false);
    },
    [draggedId, placements, placeOnGrid, returnToPanel]
  );

  const handleMouseMove = useCallback(
    (e) => {
      if (!draggedId) return;

      if (
        isOverElement(e.clientX, e.clientY, panelDropZoneRef.current)
      ) {
        setDragOverReturn(true);
      } else {
        setDragOverReturn(false);
      }

      if (
        placements[draggedId] &&
        isOverElement(e.clientX, e.clientY, gridContainerRef.current)
      ) {
        const rect = gridContainerRef.current.getBoundingClientRect();
        const { col, row } = getGridCoords(
          e.clientX,
          e.clientY,
          rect,
          gridSize.cols,
          gridSize.rows
        );
        const placement = placements[draggedId];
        const item = PANEL_ITEMS.find((i) => i.id === placement.templateId);
        if (item) {
          const { col: c, row: r } = clampCell(
            item,
            col,
            row,
            gridSize.cols,
            gridSize.rows
          );
          setPlacements((prev) => ({ ...prev, [draggedId]: { ...placement, col: c, row: r } }));
        }
      }
    },
    [draggedId, placements, gridSize.cols, gridSize.rows]
  );

  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [handleMouseUp, handleMouseMove]);

  const itemsOnGrid = Object.entries(placements)
    .map(([instanceId, p]) => {
      const template = PANEL_ITEMS.find((t) => t.id === p.templateId);
      return template ? { instanceId, ...template, col: p.col, row: p.row } : null;
    })
    .filter(Boolean);

  // Panel always shows all item types so user can drag multiple of each onto the grid
  const panelItemsToShow = PANEL_ITEMS;

  return (
    <div
      className="profile-builder-page"
      style={{
        width: '100%',
        height: '100vh',
        minHeight: '100vh',
        boxSizing: 'border-box',
        margin: 0,
        padding: 0,
        display: 'flex',
        flexDirection: 'row',
        gap: 0,
        alignItems: 'stretch',
        background: '#1a1a1a',
        color: '#e5e7eb',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <div
        ref={gridAreaRef}
        style={{
          flex: 1,
          minWidth: 0,
          minHeight: 0,
          display: 'flex',
          alignItems: 'stretch',
          justifyContent: 'stretch',
          position: 'relative',
        }}
      >
        <div
          ref={gridContainerRef}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            padding: PADDING,
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: '100%',
              display: 'grid',
              gridTemplateColumns: `repeat(${gridSize.cols}, 1fr)`,
              gridTemplateRows: `repeat(${gridSize.rows}, 1fr)`,
              overflow: 'hidden',
              background: '#0f0f0f',
            }}
          >
            {Array.from({ length: gridSize.cols * gridSize.rows }, (_, i) => (
              <div
                key={i}
                className="profile-builder-cell"
                style={{
                  border: '1px solid rgba(60,60,60,0.8)',
                  background:
                    'radial-gradient(circle at 20% 20%, rgba(50,50,50,0.4), rgba(20,20,20,0.95))',
                }}
              />
            ))}
          </div>

          {itemsOnGrid.map((item) => {
            const x = PADDING + item.col * cellWidthPx;
            const y = PADDING + item.row * cellHeightPx;
            const w = item.cols * cellWidthPx;
            const h = item.rows * cellHeightPx;
            const isProfileBlock = item.type === 'rectangle';
            const nftImage = profileBlockNftImages[item.instanceId];
            return (
              <div
                key={item.instanceId}
                className="profile-builder-grid-item"
                data-type={item.type}
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  width: w,
                  height: h,
                  transform: `translate(${x}px, ${y}px)`,
                  cursor: isProfileBlock ? 'default' : 'grab',
                  userSelect: 'none',
                  pointerEvents: 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '0.375rem',
                  boxSizing: 'border-box',
                  overflow: 'hidden',
                  ...(item.type === 'rectangle' && {
                    background: '#1a1a1a',
                    color: '#e5e5e5',
                    fontWeight: 500,
                    fontSize: '0.7rem',
                    flexDirection: 'column',
                    alignItems: 'stretch',
                  }),
                  ...(item.type === 'square-small' && {
                    background: '#374151',
                    border: '1px solid #4b5563',
                  }),
                  ...(item.type === 'square-large' && {
                    background: '#4b5563',
                    border: '1px solid #6b7280',
                  }),
                }}
                onMouseDown={(e) => {
                  if (isProfileBlock) return;
                  e.preventDefault();
                  setDraggedId(item.instanceId);
                }}
              >
                {isProfileBlock ? (
                  <>
                    {/* Top: square photo area */}
                    <div
                      style={{
                        width: '100%',
                        flex: '0 0 auto',
                        aspectRatio: '1',
                        maxHeight: w,
                        position: 'relative',
                        background: nftImage ? undefined : 'rgba(239,68,68,0.4)',
                        borderRadius: '0.25rem 0.25rem 0 0',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {nftImage ? (
                        <img
                          src={nftImage}
                          alt="Profile"
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            pointerEvents: 'none',
                          }}
                        />
                      ) : (
                        <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.6)' }}>Add photo</span>
                      )}
                      <button
                        type="button"
                        title="Move block"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setDraggedId(item.instanceId);
                        }}
                        style={{
                          position: 'absolute',
                          top: 4,
                          left: 4,
                          zIndex: 2,
                          width: 24,
                          height: 24,
                          borderRadius: 4,
                          border: '1px solid rgba(255,255,255,0.4)',
                          background: 'rgba(0,0,0,0.6)',
                          color: '#fff',
                          cursor: 'grab',
                          fontSize: '0.6rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          lineHeight: 1,
                        }}
                      >
                        ⋮⋮
                      </button>
                      {address ? (
                        <button
                          type="button"
                          title="Choose NFT from wallet"
                          onClick={(e) => {
                            e.stopPropagation();
                            setNftSelectorForInstance(item.instanceId);
                            setNftSelectorOpen(true);
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                          style={{
                            position: 'absolute',
                            top: 4,
                            right: 4,
                            zIndex: 2,
                            padding: '2px 6px',
                            borderRadius: 4,
                            border: '1px solid rgba(255,255,255,0.4)',
                            background: 'rgba(0,0,0,0.6)',
                            color: '#fff',
                            cursor: 'pointer',
                            fontSize: '0.6rem',
                            fontWeight: 600,
                          }}
                        >
                          NFT
                        </button>
                      ) : (
                        <div style={{ position: 'absolute', top: 4, right: 4, zIndex: 2 }} onMouseDown={(e) => e.stopPropagation()}>
                          <ConnectButton.Custom>
                            {({ openConnectModal }) => (
                              <button
                                type="button"
                                title="Connect wallet to choose NFT"
                                onClick={(e) => { e.stopPropagation(); openConnectModal?.(); }}
                                style={{
                                  padding: '2px 6px',
                                  borderRadius: 4,
                                  border: '1px solid rgba(255,255,255,0.4)',
                                  background: 'rgba(0,0,0,0.6)',
                                  color: '#fff',
                                  cursor: 'pointer',
                                  fontSize: '0.6rem',
                                  fontWeight: 600,
                                }}
                              >
                                Connect
                              </button>
                            )}
                          </ConnectButton.Custom>
                        </div>
                      )}
                    </div>
                    {/* Below: username and X username from Supabase profiles */}
                    <div
                      style={{
                        flex: '1 1 auto',
                        minHeight: 0,
                        padding: '6px 8px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        gap: 2,
                      }}
                    >
                      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {profile.username || 'No username'}
                      </div>
                      <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {profile.xUsername ? `@${String(profile.xUsername).replace(/^@/, '')}` : 'No X linked'}
                      </div>
                    </div>
                  </>
                ) : (
                  item.label || ''
                )}
              </div>
            );
          })}
          </div>
        </div>

      <aside style={{
          width: panelOpen ? 260 : 48,
          minWidth: panelOpen ? 260 : 48,
          height: '100vh',
          background: '#282828',
          borderRadius: 0,
          flexShrink: 0,
          overflow: 'hidden',
          position: 'relative',
          transition: 'width 0.2s ease, min-width 0.2s ease',
        }}>
        <button
          type="button"
          onClick={() => setPanelOpen((v) => !v)}
          style={{
            position: 'absolute',
            top: 10,
            left: 10,
            zIndex: 10,
            padding: '6px 10px',
            borderRadius: 6,
            border: '1px solid rgba(255,255,255,0.2)',
            background: 'rgba(255,255,255,0.12)',
            color: 'rgba(255,255,255,0.95)',
            cursor: 'pointer',
            fontSize: '0.8rem',
            lineHeight: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title={panelOpen ? 'Collapse panel' : 'Expand panel'}
        >
          {panelOpen ? '←' : '→'}
        </button>
        <div
          style={{
            padding: '2.5rem 1rem 1rem 1rem',
            height: '100%',
            overflowY: 'auto',
            overflowX: 'hidden',
            boxSizing: 'border-box',
            visibility: panelOpen ? 'visible' : 'hidden',
            opacity: panelOpen ? 1 : 0,
            transition: 'opacity 0.15s ease',
            pointerEvents: panelOpen ? 'auto' : 'none',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <h2
            style={{
              fontSize: '1.1rem',
              fontWeight: 700,
              marginBottom: 4,
              letterSpacing: '0.02em',
              color: '#fff',
            }}
          >
            Profile page widgets
          </h2>
          <p
            style={{
              fontSize: '0.8rem',
              color: 'rgba(255,255,255,0.7)',
              marginBottom: '1rem',
            }}
          >
            Drag/drop onto the grid
          </p>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              marginBottom: '1rem',
              flex: '1 1 auto',
              minHeight: 0,
            }}
          >
            {panelItemsToShow.map((item) => (
              <div
                key={item.id}
                className="profile-builder-panel-item"
                data-type={item.type}
                style={{
                  cursor: 'grab',
                  userSelect: 'none',
                  flexShrink: 0,
                  width: '78%',
                  height: 28,
                  borderRadius: 6,
                  background: 'linear-gradient(180deg, #3a3a3a 0%, #2a2a2a 50%, #222 100%)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: 'rgba(255,255,255,0.95)',
                  fontWeight: 500,
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  padding: '0 10px',
                  boxShadow: '0 1px 0 rgba(255,255,255,0.06)',
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  setDraggedId(`new:${item.id}`);
                }}
              >
                {item.label || ''}
              </div>
            ))}
          </div>
          <p
            style={{
              fontSize: '0.75rem',
              color: 'rgba(255,255,255,0.5)',
              marginBottom: 6,
            }}
          >
            Drop here to return
          </p>
          <div
            ref={panelDropZoneRef}
            style={{
              minHeight: 48,
              border: '2px dashed rgba(255,255,255,0.18)',
              borderRadius: 6,
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: dragOverReturn ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.15)',
              borderColor: dragOverReturn ? 'rgba(255,255,255,0.35)' : undefined,
            }}
          >
            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', pointerEvents: 'none' }}>
              Return items here
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              gap: 10,
              justifyContent: 'space-between',
              marginTop: 'auto',
              paddingTop: 8,
            }}
          >
            <button
              type="button"
              style={{
                flex: 1,
                maxWidth: '48%',
                padding: '10px 16px',
                borderRadius: 6,
                border: 'none',
                background: '#dc2626',
                color: '#fff',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              style={{
                flex: 1,
                maxWidth: '48%',
                padding: '10px 16px',
                borderRadius: 6,
                border: 'none',
                background: '#16a34a',
                color: '#fff',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              Save
            </button>
          </div>
        </div>
      </aside>

      {nftSelectorOpen && address && nftSelectorForInstance && (
        <NFTSelector
          ownerAddress={address}
          apiKeyEth={getAlchemyApiKey(import.meta.env.VITE_ALCHEMY_API_KEY_ETH || import.meta.env.VITE_ALCHEMY_API_KEY)}
          apiKeyApechain={getAlchemyApiKey(import.meta.env.VITE_ALCHEMY_API_KEY_APECHAIN || import.meta.env.VITE_ALCHEMY_API_KEY)}
          onSelect={(imageUrl) => {
            setProfileBlockNftImages((prev) => ({ ...prev, [nftSelectorForInstance]: imageUrl }));
            setNftSelectorOpen(false);
            setNftSelectorForInstance(null);
          }}
          onClose={() => {
            setNftSelectorOpen(false);
            setNftSelectorForInstance(null);
          }}
        />
      )}
    </div>
  );
}
