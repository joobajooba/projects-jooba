import React from 'react';

function PanelItem({ label, type, variant }) {
  return (
    <div
      className="mb-3 cursor-grab select-none rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-white/90 active:cursor-grabbing"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('application/x-widget-type', type);
        e.dataTransfer.setData('application/x-widget-variant', variant || '');
        e.dataTransfer.effectAllowed = 'copy';
      }}
    >
      {label}
      <div className="mt-1 text-xs text-white/50">Drag into grid</div>
    </div>
  );
}

export default function WidgetPanel({ open }) {
  return (
    <div
      className={[
        'fixed right-0 top-0 z-40 h-full w-[320px] border-l border-white/10 bg-[#121212] p-4 shadow-2xl transition-transform',
        open ? 'translate-x-0' : 'translate-x-full',
      ].join(' ')}
    >
      <h3 className="mb-4 text-base font-semibold text-white">Widgets</h3>
      <PanelItem label="Profile Description (Small)" type="description" variant="small" />
      <PanelItem label="Profile Description (Large)" type="description" variant="large" />
      <PanelItem label="Profile Image (Small)" type="image" variant="small" />
      <PanelItem label="Profile Image (Large)" type="image" variant="large" />
      <PanelItem label="Profile Stats" type="stats" variant="" />
      <p className="mt-6 text-xs text-white/40">
        Tip: drag widgets into the grid, then resize and move them. Click Save when finished.
      </p>
    </div>
  );
}

