import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ResponsiveGridLayout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

// Base grid resolution: 20px squares
const CELL_SIZE = 20;
const ROW_HEIGHT = CELL_SIZE;
const ROW_GAP = 0;
const CONTAINER_PADDING = 0;
const MIN_COLS = 20;
const ROW_STEP = ROW_HEIGHT + ROW_GAP; // 20px

export default function GridLayoutWrapper({
  editMode,
  layout,
  onLayoutChange,
  onDropWidget,
  children,
}) {
  const [cols, setCols] = useState(60);
  const [cellPx, setCellPx] = useState(CELL_SIZE);
  const layouts = useMemo(() => ({ lg: layout }), [layout]);
  const dropZoneRef = useRef(null);

  // Keep horizontal snapping close to CELL_SIZE by adapting column count
  useEffect(() => {
    if (!editMode) return;
    const el = dropZoneRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      const width = entry?.contentRect?.width || el.offsetWidth || 0;
      if (!width) return;
      const nextCols = Math.max(MIN_COLS, Math.round(width / CELL_SIZE));
      const nextCellPx = width / nextCols;
      setCols((prev) => (prev === nextCols ? prev : nextCols));
      setCellPx((prev) => (prev === nextCellPx ? prev : nextCellPx));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [editMode]);

  function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }

  function handleDrop(e) {
    e.preventDefault();
    const widgetType = e.dataTransfer.getData('application/x-widget-type') || '';
    const widgetVariant = e.dataTransfer.getData('application/x-widget-variant') || '';
    if (!widgetType || !onDropWidget) return;
    const el = dropZoneRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const xPx = e.clientX - rect.left - CONTAINER_PADDING;
    const yPx = e.clientY - rect.top - CONTAINER_PADDING;
    const approxCols = cols || MIN_COLS;
    const effectiveCell = cellPx || CELL_SIZE;
    const gridX = Math.max(
      0,
      Math.min(approxCols - 1, Math.floor(xPx / effectiveCell))
    );
    const gridY = Math.max(0, Math.floor(yPx / ROW_STEP));
    onDropWidget({
      item: { x: gridX, y: gridY },
      widgetType,
      widgetVariant,
      currentLayout: layout,
    });
  }

  return (
    <div
      className={editMode ? 'relative flex items-stretch justify-center' : ''}
      style={
        editMode
          ? {
              height: '80vh',
              margin: '5vh 5vw', // slightly tighter margins
            }
          : undefined
      }
    >
      {editMode && (
        <div
          className="profile-builder-grid-overlay pointer-events-none absolute inset-0 rounded-lg"
          aria-hidden
          style={{
            backgroundImage: [
              // Vertical lines
              'linear-gradient(to right, rgba(255,255,255,0.18) 1px, transparent 1px)',
              // Horizontal lines
              'linear-gradient(to bottom, rgba(255,255,255,0.18) 1px, transparent 1px)',
            ].join(', '),
            backgroundSize: `${cellPx || CELL_SIZE}px ${ROW_STEP}px`,
            backgroundPosition: '0 0',
          }}
        />
      )}
      <div
        ref={dropZoneRef}
        className={editMode ? 'relative z-10 flex-1' : ''}
        style={editMode ? { minHeight: 520 } : undefined}
        onDragOver={editMode ? handleDragOver : undefined}
        onDrop={editMode ? handleDrop : undefined}
      >
        <ResponsiveGridLayout
          className={editMode ? 'min-h-[520px]' : ''}
          layouts={layouts}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480 }}
          cols={{ lg: cols, md: cols, sm: cols, xs: cols }}
          rowHeight={ROW_HEIGHT}
          margin={[ROW_GAP, ROW_GAP]}
          containerPadding={[CONTAINER_PADDING, CONTAINER_PADDING]}
          isDraggable={editMode}
          isResizable={editMode}
          compactType="vertical"
          preventCollision={!editMode}
          isDroppable={false}
          useCSSTransforms
          onLayoutChange={(current) => onLayoutChange?.(current)}
          draggableHandle={editMode ? '.js-widget-drag-handle' : undefined}
        >
          {children}
        </ResponsiveGridLayout>
      </div>

      {editMode && (
        <div className="pointer-events-none absolute inset-0 rounded-lg ring-1 ring-white/10 z-0" />
      )}
    </div>
  );
}

