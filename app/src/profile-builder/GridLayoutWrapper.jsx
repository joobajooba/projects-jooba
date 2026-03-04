import React, { useMemo } from 'react';
import { ResponsiveGridLayout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

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
      <ResponsiveGridLayout
        className={editMode ? 'min-h-[520px]' : ''}
        layouts={layouts}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480 }}
        cols={{ lg: 12, md: 12, sm: 12, xs: 12 }}
        rowHeight={30}
        margin={[10, 10]}
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
        <div className="pointer-events-none absolute inset-0 rounded-lg ring-1 ring-white/10" />
      )}
    </div>
  );
}

