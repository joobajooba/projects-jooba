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

export default function WidgetPanel({ open, onToggle, onSave, saving }) {
  return (
    <div
      className={[
        'fixed right-0 top-0 z-40 h-full w-[320px] border-l border-white/10 bg-[#121212] p-4 shadow-2xl transition-transform',
        open ? 'translate-x-0' : 'translate-x-full',
      ].join(' ')}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-white">Widgets</h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-md border border-white/15 bg-white/5 px-2 py-1 text-xs text-white/70 hover:bg-white/10"
            onClick={onToggle}
          >
            {open ? 'Collapse' : 'Expand'}
          </button>
          <button
            type="button"
            className="rounded-md border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90 hover:bg-white/20"
            onClick={onSave}
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
      <PanelItem label="Profile Description (Small)" type="description" variant="small" />
      <PanelItem label="Profile Description (Large)" type="description" variant="large" />
      <PanelItem label="Profile Image (Small)" type="image" variant="small" />
      <PanelItem label="Profile Image (Large)" type="image" variant="large" />
      <PanelItem label="Profile Stats" type="stats" variant="" />
      <p className="mt-6 text-xs text-white/40">
        Tip: drag widgets into the grid, then resize and move them. Use the Save button above when
        you&apos;re done.
      </p>
    </div>
  );
}

