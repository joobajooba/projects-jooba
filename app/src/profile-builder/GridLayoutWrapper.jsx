import React, { useMemo, useRef } from 'react';
import { ResponsiveGridLayout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ROW_HEIGHT = 50;
const ROW_GAP = 10;
const CONTAINER_PADDING = 10;
const COLS = 12;
/** Grid width so each cell is 50x50: (W - 2*pad - (COLS-1)*gap) / COLS = 50 => W = 730 */
const GRID_WIDTH_PX = 2 * CONTAINER_PADDING + (COLS - 1) * ROW_GAP + COLS * 50;
const ROW_STEP = ROW_HEIGHT + ROW_GAP; // 60px

export default function GridLayoutWrapper({
  editMode,
  layout,
  onLayoutChange,
  onDropWidget,
  children,
}) {
  const layouts = useMemo(() => ({ lg: layout }), [layout]);
  const dropZoneRef = useRef(null);

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
    const colWidth = (rect.width - 2 * CONTAINER_PADDING - (COLS - 1) * ROW_GAP) / COLS;
    const xPx = e.clientX - rect.left - CONTAINER_PADDING;
    const yPx = e.clientY - rect.top - CONTAINER_PADDING;
    const gridX = Math.max(0, Math.min(COLS - 1, Math.floor(xPx / (colWidth + ROW_GAP))));
    const gridY = Math.max(0, Math.floor(yPx / ROW_STEP));
    onDropWidget({
      item: { x: gridX, y: gridY },
      widgetType,
      widgetVariant,
      currentLayout: layout,
    });
  }

  return (
    <div className={editMode ? 'relative' : ''} style={editMode ? { width: GRID_WIDTH_PX } : undefined}>
      {editMode && (
        <div
          className="profile-builder-grid-overlay pointer-events-none absolute inset-[10px] rounded-lg"
          aria-hidden
          style={{
            backgroundImage: [
              [...Array(11)].map((_, i) => {
                const pct = ((i + 1) / 12) * 100;
                return `linear-gradient(to right, transparent ${pct}%, rgba(255,255,255,0.18) ${pct}%, rgba(255,255,255,0.18) ${pct + 0.15}%, transparent ${pct + 0.15}%)`;
              }).join(', '),
              `repeating-linear-gradient(to bottom, transparent 0, transparent ${ROW_STEP - 1}px, rgba(255,255,255,0.18) ${ROW_STEP - 1}px, rgba(255,255,255,0.18) ${ROW_STEP}px)`,
            ].join(', '),
            backgroundSize: '100% 100%, 100% ' + ROW_STEP + 'px',
            backgroundPosition: '0 0, 0 0',
          }}
        />
      )}
      <div
        ref={dropZoneRef}
        className={editMode ? 'relative z-10' : ''}
        style={editMode ? { minHeight: 520 } : undefined}
        onDragOver={editMode ? handleDragOver : undefined}
        onDrop={editMode ? handleDrop : undefined}
      >
        <ResponsiveGridLayout
          className={editMode ? 'min-h-[520px]' : ''}
          layouts={layouts}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480 }}
          cols={{ lg: COLS, md: COLS, sm: COLS, xs: COLS }}
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

