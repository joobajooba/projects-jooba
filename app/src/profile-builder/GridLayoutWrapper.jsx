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
  const layouts = useMemo(() => ({ lg: layout }), [layout]);
  const gridWidthPx = cols * CELL_SIZE;
  const dropZoneRef = useRef(null);

  // Fix column count so grid width = cols * CELL_SIZE for exact 20px columns
  useEffect(() => {
    if (!editMode) return;
    const el = dropZoneRef.current?.parentElement;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      const width = entry?.contentRect?.width || el.offsetWidth || 0;
      if (!width) return;
      const nextCols = Math.max(MIN_COLS, Math.floor(width / CELL_SIZE));
      setCols((prev) => (prev === nextCols ? prev : nextCols));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [editMode]);

  function handleLayoutChange(current) {
    if (!onLayoutChange) return;
    // Force every item to integer grid so corners always snap to grid intersections
    const snapped = current.map((item) => ({
      ...item,
      x: Math.round(item.x),
      y: Math.round(item.y),
      w: Math.max(1, Math.round(item.w)),
      h: Math.max(1, Math.round(item.h)),
    }));
    onLayoutChange(snapped);
  }

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
    const gridX = Math.max(
      0,
      Math.min(approxCols - 1, Math.floor(xPx / CELL_SIZE))
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
          className="profile-builder-grid-overlay pointer-events-none absolute inset-0"
          aria-hidden
          style={{
            backgroundImage: [
              'linear-gradient(to right, rgba(255,255,255,0.18) 1px, transparent 1px)',
              'linear-gradient(to bottom, rgba(255,255,255,0.18) 1px, transparent 1px)',
            ].join(', '),
            backgroundSize: `${CELL_SIZE}px ${ROW_STEP}px`,
            backgroundPosition: '0 0',
          }}
        />
      )}
      <div
        ref={dropZoneRef}
        className={editMode ? 'relative z-10' : ''}
        style={
          editMode
            ? { width: gridWidthPx, minHeight: 520 }
            : undefined
        }
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
          onLayoutChange={handleLayoutChange}
          draggableHandle={editMode ? '.js-widget-drag-handle' : undefined}
        >
          {children}
        </ResponsiveGridLayout>
      </div>

      {editMode && (
        <div className="pointer-events-none absolute inset-0 ring-1 ring-white/10 z-0" />
      )}
    </div>
  );
}

