import React from 'react';

export default function DescriptionWidget({ editMode, variant, value, onChange }) {
  const isLarge = variant === 'large';
  return (
    <div className="h-full bg-white/5 p-3 text-white">
      <div className="js-widget-drag-handle mb-2 cursor-move text-xs text-white/60">
        Profile Description
      </div>
      {editMode ? (
        <textarea
          className={[
            'w-full resize-none rounded-none border border-white/10 bg-black/30 p-2 text-sm text-white outline-none',
            isLarge ? 'min-h-[200px]' : 'min-h-[120px]',
          ].join(' ')}
          value={value || ''}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder="Write something about yourself…"
        />
      ) : (
        <div className="whitespace-pre-wrap text-sm text-white/85">
          {value || <span className="text-white/40">No bio set.</span>}
        </div>
      )}
    </div>
  );
}

