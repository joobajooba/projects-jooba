import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

const CELL_SIZE = 50;
const PADDING = 8;

const PANEL_ITEMS = [
  { id: 'rect', type: 'rectangle', cols: 2, rows: 1, label: 'MOVE' },
  { id: 'sq-s', type: 'square-small', cols: 1, rows: 1 },
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
  const [gridSize, setGridSize] = useState({ cols: 10, rows: 10 });
  const [gridInnerSize, setGridInnerSize] = useState({ width: 0, height: 0 });
  const [placements, setPlacements] = useState({});
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverReturn, setDragOverReturn] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);

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
    const rows = Math.max(10, Math.floor(innerH / CELL_SIZE));
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
    (id, col, row) => {
      const item = PANEL_ITEMS.find((i) => i.id === id);
      if (!item) return;
      const { col: c, row: r } = clampCell(
        item,
        col,
        row,
        gridSize.cols,
        gridSize.rows
      );
      setPlacements((prev) => ({ ...prev, [id]: { col: c, row: r } }));
    },
    [gridSize.cols, gridSize.rows]
  );

  const returnToPanel = useCallback((id) => {
    setPlacements((prev) => {
      const next = { ...prev };
      delete next[id];
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
        const item = PANEL_ITEMS.find((i) => i.id === draggedId);
        if (item) {
          const { col: c, row: r } = clampCell(
            item,
            col,
            row,
            gridSize.cols,
            gridSize.rows
          );
          setPlacements((prev) => ({ ...prev, [draggedId]: { col: c, row: r } }));
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

  const itemsOnGrid = PANEL_ITEMS.filter((item) => placements[item.id]);
  const itemsInPanel = PANEL_ITEMS.filter((item) => !placements[item.id]);

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
        <Link
          to="/profile"
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            zIndex: 5,
            fontSize: '0.85rem',
            color: 'rgba(255,255,255,0.6)',
            textDecoration: 'none',
          }}
        >
          ← Back to profile
        </Link>
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
            const pos = placements[item.id];
            if (!pos) return null;
            const x = PADDING + pos.col * cellWidthPx;
            const y = PADDING + pos.row * cellHeightPx;
            const w = item.cols * cellWidthPx;
            const h = item.rows * cellHeightPx;
            return (
              <div
                key={item.id}
                className="profile-builder-grid-item"
                data-type={item.type}
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  width: w,
                  height: h,
                  transform: `translate(${x}px, ${y}px)`,
                  cursor: 'grab',
                  userSelect: 'none',
                  pointerEvents: 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '0.375rem',
                  boxSizing: 'border-box',
                  ...(item.type === 'rectangle' && {
                    background: '#ef4444',
                    color: '#fee2e2',
                    fontWeight: 600,
                    fontSize: '0.7rem',
                    letterSpacing: '0.05em',
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
                  e.preventDefault();
                  setDraggedId(item.id);
                }}
              >
                {item.label || ''}
              </div>
            );
          })}
          </div>
        </div>

      <aside style={{
          width: panelOpen ? 250 : 48,
          minWidth: panelOpen ? 250 : 48,
          height: '100vh',
          background: 'linear-gradient(180deg, #2a2a2a 0%, #1e1e1e 50%, #151515 100%)',
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
            top: 8,
            left: 8,
            zIndex: 10,
            width: 32,
            height: 32,
            borderRadius: 4,
            border: '1px solid rgba(255,255,255,0.15)',
            background: 'rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.9)',
            cursor: 'pointer',
            fontSize: '1rem',
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
            padding: '1.25rem 1rem 1rem 2.5rem',
            height: '100%',
            overflowY: 'auto',
            overflowX: 'hidden',
            boxSizing: 'border-box',
            visibility: panelOpen ? 'visible' : 'hidden',
            opacity: panelOpen ? 1 : 0,
            transition: 'opacity 0.15s ease',
            pointerEvents: panelOpen ? 'auto' : 'none',
          }}
        >
        <h2
          style={{
            fontSize: '1rem',
            fontWeight: 600,
            marginBottom: '1rem',
            letterSpacing: '0.03em',
          }}
        >
          Panel
        </h2>
        <p
          style={{
            fontSize: '0.75rem',
            color: 'rgba(255,255,255,0.5)',
            marginBottom: '0.25rem',
          }}
        >
          Drag onto grid
        </p>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            marginBottom: '1rem',
          }}
        >
          {itemsInPanel.map((item) => (
            <div
              key={item.id}
              className="profile-builder-panel-item"
              data-type={item.type}
              style={{
                cursor: 'grab',
                userSelect: 'none',
                flexShrink: 0,
                borderRadius: '0.375rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                ...(item.type === 'rectangle' && {
                  width: 100,
                  height: 50,
                  background: '#ef4444',
                  color: '#fee2e2',
                  fontWeight: 600,
                  fontSize: '0.7rem',
                  letterSpacing: '0.05em',
                }),
                ...(item.type === 'square-small' && {
                  width: 50,
                  height: 50,
                  background: '#374151',
                  border: '1px solid #4b5563',
                }),
                ...(item.type === 'square-large' && {
                  width: 100,
                  height: 100,
                  background: '#4b5563',
                  border: '1px solid #6b7280',
                }),
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                setDraggedId(item.id);
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
            marginBottom: '0.25rem',
          }}
        >
          Drop here to return
        </p>
        <div
          ref={panelDropZoneRef}
          style={{
            minHeight: 60,
            border: '2px dashed rgba(255,255,255,0.2)',
            borderRadius: '0.5rem',
            marginTop: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: dragOverReturn ? 'rgba(255,255,255,0.06)' : undefined,
            borderColor: dragOverReturn ? 'rgba(255,255,255,0.4)' : undefined,
          }}
        >
          <span
            style={{
              fontSize: '0.75rem',
              color: 'rgba(255,255,255,0.5)',
              pointerEvents: 'none',
            }}
          >
            Return items here
          </span>
        </div>
        </div>
      </aside>
    </div>
  );
}
