import { GRID_CONFIG, WIDGET_TYPES } from './WidgetTypes';
import { MoveDownRight } from 'lucide-react';

function getWidgetDimensions(widget, canvasSize) {
  const { CELL_SIZE } = GRID_CONFIG;
  const w = widget.fixedWidthPx ?? (widget.w ?? 4) * CELL_SIZE;
  const h = widget.fixedHeightPx ?? (widget.h ?? 4) * CELL_SIZE;
  const x = widget.x ?? 0;
  const y = widget.y ?? 0;
  return { x, y, w, h };
}

export default function WidgetRenderer({
  widget,
  canvasSize,
  wordleStats,
  typeRacerStats,
  isSelected,
  onMouseDown,
  onResizeHandleMouseDown,
}) {
  const { x, y, w, h } = getWidgetDimensions(widget, canvasSize);
  const isUserPanel = widget.type === WIDGET_TYPES.USER_PANEL;
  const showResize = !widget.locked && onResizeHandleMouseDown;

  const handleClick = (e) => e.stopPropagation();

  const userPanelBorder =
    isUserPanel && widget.data?.borderEnabled
      ? { borderWidth: 2, borderStyle: 'solid', borderColor: widget.data?.borderColor ?? '#4f46e5' }
      : {};

  const isNft = widget.type === WIDGET_TYPES.NFT;
  const nftBorderWidth = isNft && widget.data?.borderWidth ? Number(widget.data.borderWidth) : 0;
  const nftWidgetBorder =
    isNft && nftBorderWidth > 0
      ? {
          borderWidth: nftBorderWidth,
          borderStyle: 'solid',
          borderColor: widget.data?.borderColor ?? '#6b7280',
        }
      : {};

  const isStatistic = widget.type === WIDGET_TYPES.STATISTIC;
  const statisticBorderWidth =
    isStatistic && widget.data?.borderWidth ? Number(widget.data.borderWidth) : 0;
  const statisticWidgetBorder =
    isStatistic && statisticBorderWidth > 0
      ? {
          borderWidth: statisticBorderWidth,
          borderStyle: 'solid',
          borderColor: widget.data?.borderColor ?? '#6b7280',
        }
      : {};

  return (
    <div
      role="button"
      tabIndex={0}
      className={`absolute rounded-xl border bg-gray-900/90 cursor-move ${
        isSelected ? 'ring-2 ring-indigo-500/80' : 'border-gray-700'
      } ${isUserPanel && !widget.data?.borderEnabled ? 'border-0' : ''} ${isNft && nftBorderWidth > 0 ? 'border-0' : ''} ${isStatistic && statisticBorderWidth > 0 ? 'border-0' : ''}`}
      style={{
        left: x,
        top: y,
        width: w,
        height: h,
        ...userPanelBorder,
        ...nftWidgetBorder,
        ...statisticWidgetBorder,
      }}
      onMouseDown={(e) => {
        handleClick(e);
        onMouseDown?.(e);
      }}
      onClick={handleClick}
    >
      {widget.type === WIDGET_TYPES.USER_PANEL && (
        <div className="h-full flex flex-col p-4">
          <div className="w-full h-[70%] shrink-0 rounded-lg bg-gray-700 flex items-center justify-center text-2xl text-gray-400 overflow-hidden">
            {widget.data?.avatarUrl ? (
              <img src={widget.data.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <span>?</span>
            )}
          </div>
          <div className="font-medium text-gray-200 truncate w-full mt-2 text-center">
            {widget.data?.name || 'Name'}
          </div>
          <div className="text-xs text-gray-500 mt-0.5 text-center">
            {widget.data?.x_username ? `X | @${widget.data.x_username}` : 'X | Not Connected'}
          </div>
        </div>
      )}

      {widget.type === WIDGET_TYPES.TEXT && (
        <div
          className="h-full overflow-auto p-2"
          style={{
            fontSize: widget.data?.fontSize ?? 14,
            color: widget.data?.color ?? '#e5e7eb',
            textAlign: widget.data?.textAlign ?? 'left',
          }}
        >
          {widget.data?.content || 'Text'}
        </div>
      )}

      {widget.type === WIDGET_TYPES.IMAGE && (
        <div className="h-full w-full flex items-center justify-center overflow-hidden rounded-xl bg-gray-800/30">
          {widget.data?.url ? (
            <img
              src={widget.data.url}
              alt=""
              className="w-full h-full rounded-xl"
              style={{
                objectFit: widget.data?.objectFit ?? 'contain',
                borderWidth: widget.data?.borderWidth ? `${widget.data.borderWidth}px` : 0,
                borderStyle: 'solid',
                borderColor: widget.data?.borderColor ?? 'transparent',
              }}
            />
          ) : (
            <span className="text-gray-500 text-sm">Image</span>
          )}
        </div>
      )}

      {widget.type === WIDGET_TYPES.NFT && (
        <div className="h-full flex flex-col overflow-hidden rounded-xl">
          <div
            className={`flex-1 min-h-0 flex items-center justify-center overflow-hidden bg-gray-800/50 ${
              widget.data?.corners === 'square' ? 'rounded-none' : 'rounded-xl'
            }`}
          >
            {widget.data?.imageUrl ? (
              <img
                src={widget.data.imageUrl}
                alt=""
                className={`w-full h-full ${widget.data?.corners === 'square' ? 'rounded-none' : 'rounded-xl'}`}
                style={{
                  objectFit: widget.data?.objectFit ?? 'contain',
                }}
              />
            ) : (
              <span className="text-gray-500 text-sm">NFT</span>
            )}
          </div>
          <div className="p-1.5 border-t border-gray-700 shrink-0">
            <div className="text-xs font-medium text-gray-200 truncate">
              {widget.data?.name || 'NFT name'}
            </div>
            <div className="text-xs text-gray-500 truncate">
              {widget.data?.collection || 'Collection'}
            </div>
          </div>
        </div>
      )}

      {widget.type === WIDGET_TYPES.STATISTIC && (() => {
        const statType = widget.data?.statType ?? 'wordle_streak';
        const isWordleStreak = statType === 'wordle_streak';
        const isWordleAvg = statType === 'wordle_avg_guesses';
        const isTypeRacerStreak = statType === 'typeracer_streak';
        const isTypeRacerWpm = statType === 'typeracer_last_wpm';
        const displayValue = isWordleStreak
          ? String(wordleStats?.current_streak ?? '0')
          : isWordleAvg
            ? String(wordleStats?.avg_guesses ?? '0')
            : isTypeRacerStreak
              ? String(typeRacerStats?.current_streak ?? '0')
              : isTypeRacerWpm
                ? String(typeRacerStats?.last_wpm ?? '0')
                : '0';
        const displayLabel = isWordleStreak
          ? 'Wordle Streak'
          : isWordleAvg
            ? 'Wordle Average Guesses'
            : isTypeRacerStreak
              ? 'Type Racer Streak'
              : isTypeRacerWpm
                ? 'Type Racer Last WPM'
                : 'Statistic';
        return (
          <div className="h-full flex flex-col items-center justify-center p-3">
            <div
              className="text-2xl font-bold tabular-nums"
              style={{ color: widget.data?.valueColor ?? '#e5e7eb' }}
            >
              {displayValue}
            </div>
            <div
              className="text-sm mt-0.5"
              style={{ color: widget.data?.labelColor ?? '#9ca3af' }}
            >
              {displayLabel}
            </div>
          </div>
        );
      })()}

      {widget.type === WIDGET_TYPES.BADGE && (
        <div className="h-full flex items-center justify-center p-2">
          <span
            className="px-3 py-1 rounded-full text-sm font-medium"
            style={{
              backgroundColor: widget.data?.bgColor ?? '#4f46e5',
              color: widget.data?.textColor ?? '#fff',
            }}
          >
            {widget.data?.label || 'Badge'}
          </span>
        </div>
      )}

      {widget.type === WIDGET_TYPES.DIVIDER && (
        <div className="h-full flex items-center px-2">
          <hr
            className="w-full border-t"
            style={{ borderColor: widget.data?.color ?? '#6b7280' }}
          />
        </div>
      )}

      {showResize && (
        <button
          type="button"
          className="absolute bottom-0 right-0 w-6 h-6 flex items-center justify-center bg-indigo-600 hover:bg-indigo-500 text-white rounded-tl cursor-se-resize"
          onMouseDown={(e) => {
            e.stopPropagation();
            onResizeHandleMouseDown(e);
          }}
          aria-label="Resize"
        >
          <MoveDownRight className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
