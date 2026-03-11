import { useState } from 'react';
import { WIDGET_TYPES, GRID_CONFIG } from './WidgetTypes';
import AvatarNFTModal from './AvatarNFTModal';

const { CELL_SIZE } = GRID_CONFIG;

function pxToPercent(px, total) {
  if (!total || total <= 0) return 0;
  return Math.round((px / total) * 1000) / 10;
}

function percentToPx(percent, total) {
  if (!total || total <= 0) return 0;
  return Math.round((percent / 100) * total);
}

function getWidgetSizeAndPosition(widget, canvasSize) {
  const { CELL_SIZE } = GRID_CONFIG;
  const cw = canvasSize?.width ?? 1;
  const ch = canvasSize?.height ?? 1;
  const x = widget.x ?? 0;
  const y = widget.y ?? 0;
  const w = widget.fixedWidthPx ?? (widget.w ?? 4) * CELL_SIZE;
  const h = widget.fixedHeightPx ?? (widget.h ?? 4) * CELL_SIZE;
  return {
    leftPct: pxToPercent(x, cw),
    topPct: pxToPercent(y, ch),
    widthPct: pxToPercent(w, cw),
    heightPct: pxToPercent(h, ch),
    rightPct: pxToPercent(cw - x - w, cw),
    bottomPct: pxToPercent(ch - y - h, ch),
  };
}

function ImageUploadInput({ value, onChange }) {
  const hasBase44 = typeof window !== 'undefined' && window.base44?.integrations?.Core?.UploadFile;
  if (hasBase44) {
    return (
      <button
        type="button"
        onClick={async () => {
          try {
            const url = await window.base44.integrations.Core.UploadFile();
            if (url) onChange(url);
          } catch (e) {
            console.warn('Base44 upload failed', e);
          }
        }}
        className="w-full px-3 py-2 rounded border border-gray-600 bg-gray-800 text-gray-200 text-sm hover:bg-gray-700"
      >
        Upload (Base44)
      </button>
    );
  }
  return (
    <input
      type="file"
      accept="image/*"
      onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) {
          const url = URL.createObjectURL(file);
          onChange(url);
        }
        e.target.value = '';
      }}
      className="w-full text-sm text-gray-300 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-indigo-600 file:text-white"
    />
  );
}

export default function WidgetEditor({ widget, canvasSize, onChangeWidget, onDeleteWidget }) {
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [nftModalOpen, setNftModalOpen] = useState(false);

  if (!widget) {
    return (
      <div className="text-sm text-gray-500 p-4">Select a widget...</div>
    );
  }

  const updateData = (data) => {
    onChangeWidget({ ...widget, data: { ...widget.data, ...data } });
  };

  const updatePositionSize = (updates) => {
    const cw = canvasSize?.width ?? 1;
    const ch = canvasSize?.height ?? 1;
    const next = { ...widget };
    if (updates.x !== undefined) next.x = Math.max(0, Math.min(updates.x, cw - (next.fixedWidthPx ?? 60)));
    if (updates.y !== undefined) next.y = Math.max(0, Math.min(updates.y, ch - (next.fixedHeightPx ?? 60)));
    if (updates.fixedWidthPx !== undefined) next.fixedWidthPx = Math.max(8, Math.min(updates.fixedWidthPx, cw));
    if (updates.fixedHeightPx !== undefined) next.fixedHeightPx = Math.max(8, Math.min(updates.fixedHeightPx, ch));
    onChangeWidget(next);
  };

  const p = getWidgetSizeAndPosition(widget, canvasSize);
  const cw = canvasSize?.width ?? 1;
  const ch = canvasSize?.height ?? 1;
  const locked = !!widget.locked;

  const typeLabel =
    widget.type === WIDGET_TYPES.USER_PANEL
      ? 'User panel'
      : widget.type === WIDGET_TYPES.TEXT
        ? 'Text'
        : widget.type === WIDGET_TYPES.IMAGE
          ? 'Image'
          : widget.type === WIDGET_TYPES.NFT
            ? 'NFT'
            : widget.type === WIDGET_TYPES.STATISTIC
              ? 'Statistic'
              : widget.type === WIDGET_TYPES.BADGE
                ? 'Badge'
                : widget.type === WIDGET_TYPES.DIVIDER
                  ? 'Divider'
                  : widget.type;

  return (
    <div className="flex flex-col gap-4 text-sm">
      <div>
        <h3 className="font-medium text-gray-200">{typeLabel}</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Position: X {Math.round(widget.x ?? 0)} px, Y {Math.round(widget.y ?? 0)} px
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-gray-400 font-medium">Size & position</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Left (%)', value: p.leftPct, onChange: (v) => updatePositionSize({ x: percentToPx(Number(v), cw) }) },
            { label: 'Right (%)', value: p.rightPct, onChange: (v) => { const ww = widget.fixedWidthPx ?? (widget.w ?? 4) * CELL_SIZE; updatePositionSize({ x: cw - ww - percentToPx(Number(v), cw) }); } },
            { label: 'Top (%)', value: p.topPct, onChange: (v) => updatePositionSize({ y: percentToPx(Number(v), ch) }) },
            { label: 'Bottom (%)', value: p.bottomPct, onChange: (v) => { const hh = widget.fixedHeightPx ?? (widget.h ?? 4) * CELL_SIZE; updatePositionSize({ y: ch - hh - percentToPx(Number(v), ch) }); } },
            { label: 'Width (%)', value: p.widthPct, onChange: (v) => updatePositionSize({ fixedWidthPx: percentToPx(Number(v), cw) }) },
            { label: 'Height (%)', value: p.heightPct, onChange: (v) => updatePositionSize({ fixedHeightPx: percentToPx(Number(v), ch) }) },
          ].map(({ label, value, onChange: onCh }) => (
            <label key={label} className="flex flex-col gap-0.5">
              <span className="text-gray-500 text-xs">{label}</span>
              <input
                type="number"
                value={value}
                onChange={(e) => onCh(e.target.value)}
                disabled={locked}
                className="w-full px-2 py-1 rounded border border-gray-600 bg-gray-800 text-gray-200 disabled:opacity-50"
                step="0.1"
              />
            </label>
          ))}
        </div>
      </div>

      {!widget.locked && (
        <button
          type="button"
          onClick={() => onDeleteWidget(widget.id)}
          className="w-full py-2 rounded bg-red-900/60 hover:bg-red-800/80 text-red-200 text-sm"
        >
          Delete
        </button>
      )}

      <hr className="border-gray-700" />

      {widget.type === WIDGET_TYPES.USER_PANEL && (
        <div className="space-y-3">
          <label className="flex flex-col gap-1">
            <span className="text-gray-400">Name</span>
            <input
              type="text"
              value={widget.data?.name ?? ''}
              onChange={(e) => updateData({ name: e.target.value })}
              className="px-2 py-1 rounded border border-gray-600 bg-gray-800 text-gray-200"
            />
          </label>
          <hr className="border-gray-700" />
          <label className="flex flex-col gap-1">
            <span className="text-gray-400">Avatar</span>
            <div className="flex flex-col gap-2">
              {widget.data?.avatarUrl && (
                <div className="w-14 h-14 rounded-lg overflow-hidden border border-gray-700 bg-gray-800 shrink-0">
                  <img
                    src={widget.data.avatarUrl}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <button
                type="button"
                onClick={() => setAvatarModalOpen(true)}
                className="w-full px-3 py-2 rounded-lg border border-gray-600 bg-gray-800 text-gray-200 text-sm hover:bg-gray-700 hover:border-indigo-600/50 transition-colors"
              >
                Select NFT
              </button>
            </div>
          </label>
          <hr className="border-gray-700" />
          <div className="space-y-2">
            <span className="text-gray-400 text-sm">Border</span>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!widget.data?.borderEnabled}
                onChange={(e) => updateData({ borderEnabled: e.target.checked })}
                className="rounded border-gray-600 bg-gray-800 text-indigo-600"
              />
              <span className="text-xs text-gray-400">Show border</span>
            </label>
            {widget.data?.borderEnabled && (
              <label className="flex flex-col gap-1">
                <span className="text-gray-500 text-xs">Border colour</span>
                <input
                  type="color"
                  value={widget.data?.borderColor ?? '#4f46e5'}
                  onChange={(e) => updateData({ borderColor: e.target.value })}
                  className="w-full h-8 rounded border border-gray-600 bg-gray-800 cursor-pointer"
                />
              </label>
            )}
          </div>
          <AvatarNFTModal
            isOpen={avatarModalOpen}
            onClose={() => setAvatarModalOpen(false)}
            value={widget.data?.avatarUrl}
            onSelect={(url) => updateData({ avatarUrl: url })}
          />
        </div>
      )}

      {widget.type === WIDGET_TYPES.TEXT && (
        <div className="space-y-3">
          <label className="flex flex-col gap-1">
            <span className="text-gray-400">Content</span>
            <textarea
              value={widget.data?.content ?? ''}
              onChange={(e) => updateData({ content: e.target.value })}
              rows={3}
              className="px-2 py-1 rounded border border-gray-600 bg-gray-800 text-gray-200 resize-y"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-gray-400">Font size</span>
            <input
              type="number"
              value={widget.data?.fontSize ?? 14}
              onChange={(e) => updateData({ fontSize: Number(e.target.value) || 14 })}
              className="px-2 py-1 rounded border border-gray-600 bg-gray-800 text-gray-200"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-gray-400">Color</span>
            <input
              type="color"
              value={widget.data?.color ?? '#e5e7eb'}
              onChange={(e) => updateData({ color: e.target.value })}
              className="w-full h-8 rounded border border-gray-600 bg-gray-800 cursor-pointer"
            />
          </label>
          <div className="flex flex-col gap-1">
            <span className="text-gray-400">Alignment</span>
            <div className="flex gap-1">
              {['left', 'center', 'right'].map((align) => (
                <button
                  key={align}
                  type="button"
                  onClick={() => updateData({ textAlign: align })}
                  className={`flex-1 py-1 rounded text-xs capitalize ${
                    (widget.data?.textAlign ?? 'left') === align
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {align}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {widget.type === WIDGET_TYPES.IMAGE && (
        <div className="space-y-3">
          <label className="flex flex-col gap-1">
            <span className="text-gray-400">Upload</span>
            <ImageUploadInput
              value={widget.data?.url}
              onChange={(url) => updateData({ url })}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-gray-400">Image URL</span>
            <input
              type="text"
              value={widget.data?.url ?? ''}
              onChange={(e) => updateData({ url: e.target.value })}
              placeholder="https://..."
              className="px-2 py-1 rounded border border-gray-600 bg-gray-800 text-gray-200"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-gray-500 text-xs">Image fit</span>
            <select
              value={widget.data?.objectFit ?? 'contain'}
              onChange={(e) => updateData({ objectFit: e.target.value })}
              className="px-2 py-1 rounded border border-gray-600 bg-gray-800 text-gray-200"
            >
              <option value="contain">Fit inside (no crop)</option>
              <option value="cover">Fill panel (stretch/crop)</option>
            </select>
          </label>
          <hr className="border-gray-700" />
          <h4 className="text-gray-400 font-medium">Border</h4>
          <label className="flex flex-col gap-1">
            <span className="text-gray-500 text-xs">Border Width (px)</span>
            <input
              type="number"
              min={0}
              value={widget.data?.borderWidth ?? 0}
              onChange={(e) => updateData({ borderWidth: Number(e.target.value) || 0 })}
              className="px-2 py-1 rounded border border-gray-600 bg-gray-800 text-gray-200"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-gray-500 text-xs">Border Color</span>
            <input
              type="color"
              value={widget.data?.borderColor ?? '#6b7280'}
              onChange={(e) => updateData({ borderColor: e.target.value })}
              className="w-full h-8 rounded border border-gray-600 bg-gray-800 cursor-pointer"
            />
          </label>
        </div>
      )}

      {widget.type === WIDGET_TYPES.NFT && (
        <div className="space-y-3">
          <label className="flex flex-col gap-1">
            <span className="text-gray-400">NFT</span>
            <div className="flex flex-col gap-2">
              {widget.data?.imageUrl && (
                <div className="w-14 h-14 rounded-lg overflow-hidden border border-gray-700 bg-gray-800 shrink-0">
                  <img
                    src={widget.data.imageUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <button
                type="button"
                onClick={() => setNftModalOpen(true)}
                className="w-full px-3 py-2 rounded-lg border border-gray-600 bg-gray-800 text-gray-200 text-sm hover:bg-gray-700 hover:border-indigo-600/50 transition-colors"
              >
                Select NFT
              </button>
            </div>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-gray-400">Name</span>
            <input
              type="text"
              value={widget.data?.name ?? ''}
              onChange={(e) => updateData({ name: e.target.value })}
              placeholder="Auto-filled when NFT selected"
              className="px-2 py-1 rounded border border-gray-600 bg-gray-800 text-gray-200"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-gray-400">Collection</span>
            <input
              type="text"
              value={widget.data?.collection ?? ''}
              onChange={(e) => updateData({ collection: e.target.value })}
              placeholder="Auto-filled when NFT selected"
              className="px-2 py-1 rounded border border-gray-600 bg-gray-800 text-gray-200"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-gray-500 text-xs">Image fit</span>
            <select
              value={widget.data?.objectFit ?? 'contain'}
              onChange={(e) => updateData({ objectFit: e.target.value })}
              className="px-2 py-1 rounded border border-gray-600 bg-gray-800 text-gray-200"
            >
              <option value="contain">Fit inside (no crop)</option>
              <option value="cover">Fill panel (stretch/crop)</option>
            </select>
          </label>
          <hr className="border-gray-700" />
          <h4 className="text-gray-400 font-medium">Border</h4>
          <label className="flex flex-col gap-1">
            <span className="text-gray-500 text-xs">Border Width (px)</span>
            <input
              type="number"
              min={0}
              value={widget.data?.borderWidth ?? 0}
              onChange={(e) => updateData({ borderWidth: Number(e.target.value) || 0 })}
              className="px-2 py-1 rounded border border-gray-600 bg-gray-800 text-gray-200"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-gray-500 text-xs">Border Color</span>
            <input
              type="color"
              value={widget.data?.borderColor ?? '#6b7280'}
              onChange={(e) => updateData({ borderColor: e.target.value })}
              className="w-full h-8 rounded border border-gray-600 bg-gray-800 cursor-pointer"
            />
          </label>
          <AvatarNFTModal
            isOpen={nftModalOpen}
            onClose={() => setNftModalOpen(false)}
            value={widget.data?.imageUrl}
            onSelectNft={(nft) => {
              updateData({
                imageUrl: nft?.image ?? '',
                name: nft?.name ?? '',
                collection: nft?.collection ?? '',
              });
              setNftModalOpen(false);
            }}
          />
        </div>
      )}

      {widget.type === WIDGET_TYPES.STATISTIC && (
        <div className="space-y-3">
          <label className="flex flex-col gap-1">
            <span className="text-gray-400">Label</span>
            <input
              type="text"
              value={widget.data?.label ?? ''}
              onChange={(e) => updateData({ label: e.target.value })}
              className="px-2 py-1 rounded border border-gray-600 bg-gray-800 text-gray-200"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-gray-400">Value</span>
            <input
              type="text"
              value={widget.data?.value ?? ''}
              onChange={(e) => updateData({ value: e.target.value })}
              className="px-2 py-1 rounded border border-gray-600 bg-gray-800 text-gray-200"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-gray-400">Value color</span>
            <input
              type="color"
              value={widget.data?.valueColor ?? '#e5e7eb'}
              onChange={(e) => updateData({ valueColor: e.target.value })}
              className="w-full h-8 rounded border border-gray-600 bg-gray-800 cursor-pointer"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-gray-400">Label color</span>
            <input
              type="color"
              value={widget.data?.labelColor ?? '#9ca3af'}
              onChange={(e) => updateData({ labelColor: e.target.value })}
              className="w-full h-8 rounded border border-gray-600 bg-gray-800 cursor-pointer"
            />
          </label>
        </div>
      )}

      {widget.type === WIDGET_TYPES.BADGE && (
        <div className="space-y-3">
          <label className="flex flex-col gap-1">
            <span className="text-gray-400">Label</span>
            <input
              type="text"
              value={widget.data?.label ?? ''}
              onChange={(e) => updateData({ label: e.target.value })}
              className="px-2 py-1 rounded border border-gray-600 bg-gray-800 text-gray-200"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-gray-400">Background color</span>
            <input
              type="color"
              value={widget.data?.bgColor ?? '#4f46e5'}
              onChange={(e) => updateData({ bgColor: e.target.value })}
              className="w-full h-8 rounded border border-gray-600 bg-gray-800 cursor-pointer"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-gray-400">Text color</span>
            <input
              type="color"
              value={widget.data?.textColor ?? '#ffffff'}
              onChange={(e) => updateData({ textColor: e.target.value })}
              className="w-full h-8 rounded border border-gray-600 bg-gray-800 cursor-pointer"
            />
          </label>
        </div>
      )}

      {widget.type === WIDGET_TYPES.DIVIDER && (
        <label className="flex flex-col gap-1">
          <span className="text-gray-400">Color</span>
          <input
            type="color"
            value={widget.data?.color ?? '#6b7280'}
            onChange={(e) => updateData({ color: e.target.value })}
            className="w-full h-8 rounded border border-gray-600 bg-gray-800 cursor-pointer"
          />
        </label>
      )}
    </div>
  );
}
