import React, { useCallback, useEffect, useRef, useState } from 'react';

const CELL_SIZE_PX = 46;
const GRID_GAP_PX = 0;

function clampInt(n, min, max) {
  const x = Number.isFinite(n) ? Math.floor(n) : min;
  return Math.max(min, Math.min(max, x));
}

export default function ProfileBuilderPage() {
  const containerRef = useRef(null);
  const [grid, setGrid] = useState({ cols: 12, rows: 18 });

  const recompute = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const w = el.clientWidth;
    const h = el.clientHeight;
    const cols = clampInt(w / CELL_SIZE_PX, 8, 80);
    const rows = clampInt(h / CELL_SIZE_PX, 10, 120);
    setGrid((prev) => (prev.cols === cols && prev.rows === rows ? prev : { cols, rows }));
  }, []);

  useEffect(() => {
    recompute();
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => recompute());
    ro.observe(el);
    return () => ro.disconnect();
  }, [recompute]);

  const total = grid.cols * grid.rows;

  return (
    <div
      ref={containerRef}
      className="profile-builder-blank"
      style={{
        width: '100%',
        height: '100%',
        minHeight: '100%',
        boxSizing: 'border-box',
        overflow: 'hidden',
        background: '#0b1020',
        display: 'grid',
        gridTemplateColumns: `repeat(${grid.cols}, 1fr)`,
        gridTemplateRows: `repeat(${grid.rows}, 1fr)`,
        gap: GRID_GAP_PX,
      }}
    >
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          style={{
            border: '1px solid rgba(255,255,255,0.05)',
            background:
              'radial-gradient(circle at 30% 30%, rgba(56,189,248,0.08), rgba(15,23,42,0.9))',
          }}
        />
      ))}
    </div>
  );
}
