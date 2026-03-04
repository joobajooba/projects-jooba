import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

const CELL_SIZE = 50;
const PADDING = 8;

const PANEL_ITEMS = [
  { id: 'rect', type: 'rectangle', cols: 2, rows: 1, label: 'MOVE' },
  { id: 'sq-s', type: 'square-small', cols: 1, rows: 1 },
  { id: 'sq-l', type: 'square-large', cols: 2, rows: 2 },
];

function getGridCoords(clientX, clientY, containerRect) {
  const relX = clientX - containerRect.left - PADDING;
  const relY = clientY - containerRect.top - PADDING;
  return {
    col: Math.floor(relX / CELL_SIZE),
    row: Math.floor(relY / CELL_SIZE),
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
  const [placements, setPlacements] = useState({});
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverReturn, setDragOverReturn] = useState(false);

  const updateGridSize = useCallback(() => {
    const el = gridAreaRef.current;
    if (!el) return;
    const w = el.clientWidth;
    const h = el.clientHeight;
    const cols = Math.max(10, Math.floor(w / CELL_SIZE));
    const rows = Math.max(10, Math.floor(h / CELL_SIZE));
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

  const gridWidth = gridSize.cols * CELL_SIZE;
  const gridHeight = gridSize.rows * CELL_SIZE;

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
        const { col, row } = getGridCoords(e.clientX, e.clientY, rect);
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
        const { col, row } = getGridCoords(e.clientX, e.clientY, rect);
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
  const coordsText =
    itemsOnGrid.length === 0
      ? 'No items on grid. Drag from panel.'
      : itemsOnGrid
          .map(
            (item) =>
              `${item.type} at (${placements[item.id].col},${placements[item.id].row})`
          )
          .join(' · ');

  return (
    <div
      className="profile-builder-page"
      style={{
        position: 'fixed',
        inset: 0,
        margin: '5%',
        display: 'flex',
        flexDirection: 'row',
        gap: '2rem',
        alignItems: 'flex-start',
        justifyContent: 'center',
        background: '#111827',
        color: '#e5e7eb',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          alignItems: 'center',
          flex: 1,
          minWidth: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: '1.5rem', letterSpacing: '0.05em', margin: 0 }}>
            Edit Profile Page
          </h1>
          <Link
            to="/profile"
            style={{
              fontSize: '0.9rem',
              color: '#9ca3af',
              textDecoration: 'none',
            }}
          >
            ← Back to profile
          </Link>
        </div>
        <p style={{ fontSize: '0.9rem', color: '#9ca3af', margin: 0 }}>
          Drag items from the panel onto the grid. They snap to grid cells. Drag
          back to the panel to return them.
        </p>

        <div
          ref={gridAreaRef}
          style={{
            flex: 1,
            minHeight: 0,
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            ref={gridContainerRef}
            style={{
              position: 'relative',
              width: gridWidth + PADDING * 2,
              height: gridHeight + PADDING * 2,
              background: '#020617',
              borderRadius: '0.75rem',
              padding: PADDING,
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
              flexShrink: 0,
            }}
          >
          <div
            style={{
              position: 'relative',
              width: gridWidth,
              height: gridHeight,
              display: 'grid',
              gridTemplateColumns: `repeat(${gridSize.cols}, ${CELL_SIZE}px)`,
              gridTemplateRows: `repeat(${gridSize.rows}, ${CELL_SIZE}px)`,
              borderRadius: '0.5rem',
              overflow: 'hidden',
            }}
          >
            {Array.from({ length: gridSize.cols * gridSize.rows }, (_, i) => (
              <div
                key={i}
                className="profile-builder-cell"
                style={{
                  border: '1px solid rgba(55,65,81,0.7)',
                  background:
                    'radial-gradient(circle at 20% 20%, rgba(75,85,99,0.25), rgba(15,23,42,0.9))',
                }}
              />
            ))}
          </div>

          {itemsOnGrid.map((item) => {
            const pos = placements[item.id];
            if (!pos) return null;
            const x = PADDING + pos.col * CELL_SIZE;
            const y = PADDING + pos.row * CELL_SIZE;
            const w = item.cols * CELL_SIZE;
            const h = item.rows * CELL_SIZE;
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

        <p style={{ fontSize: '0.85rem', color: '#9ca3af', margin: 0 }}>
          {coordsText}
        </p>
      </div>

      <aside
        style={{
          width: 220,
          background: '#1f2937',
          borderRadius: '0.75rem',
          padding: '1.25rem',
          boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
          flexShrink: 0,
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
            color: '#6b7280',
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
            color: '#6b7280',
            marginBottom: '0.25rem',
          }}
        >
          Drop here to return
        </p>
        <div
          ref={panelDropZoneRef}
          style={{
            minHeight: 60,
            border: '2px dashed #4b5563',
            borderRadius: '0.5rem',
            marginTop: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: dragOverReturn ? 'rgba(96,165,250,0.08)' : undefined,
            borderColor: dragOverReturn ? '#60a5fa' : undefined,
          }}
        >
          <span
            style={{
              fontSize: '0.75rem',
              color: '#6b7280',
              pointerEvents: 'none',
            }}
          >
            Return items here
          </span>
        </div>
      </aside>
    </div>
  );
}
