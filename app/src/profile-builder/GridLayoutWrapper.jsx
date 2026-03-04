import React, { useMemo } from 'react';
import { ResponsiveGridLayout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ROW_HEIGHT = 30;
const ROW_GAP = 10;
const ROW_STEP = ROW_HEIGHT + ROW_GAP; // 40px – matches margin [10,10]

export default function GridLayoutWrapper({
  editMode,
  layout,
  onLayoutChange,
  onDropWidget,
  children,
}) {
  const layouts = useMemo(() => ({ lg: layout }), [layout]);

  return (
    <div className={editMode ? 'relative' : ''}>
      {editMode && (
        <div
          className="profile-builder-grid-overlay pointer-events-none absolute inset-[10px] rounded-lg"
          aria-hidden
          style={{
            backgroundImage: [
              /* vertical lines: 11 lines at 1/12 … 11/12 */
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
      <ResponsiveGridLayout
        className={editMode ? 'min-h-[520px] relative z-10' : ''}
        layouts={layouts}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480 }}
        cols={{ lg: 12, md: 12, sm: 12, xs: 12 }}
        rowHeight={ROW_HEIGHT}
        margin={[ROW_GAP, ROW_GAP]}
        containerPadding={[10, 10]}
        isDraggable={editMode}
        isResizable={editMode}
        compactType="vertical"
        preventCollision={!editMode}
        isDroppable={editMode}
        useCSSTransforms
        onLayoutChange={(current) => onLayoutChange?.(current)}
        onDrop={(currentLayout, item, e) => {
          const widgetType = e?.dataTransfer?.getData('application/x-widget-type') || '';
          const widgetVariant = e?.dataTransfer?.getData('application/x-widget-variant') || '';
          onDropWidget?.({ item, widgetType, widgetVariant, currentLayout });
        }}
        draggableHandle={editMode ? '.js-widget-drag-handle' : undefined}
      >
        {children}
      </ResponsiveGridLayout>

      {editMode && (
        <div className="pointer-events-none absolute inset-0 rounded-lg ring-1 ring-white/10 z-0" />
      )}
    </div>
  );
}

