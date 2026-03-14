import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, LayoutGrid, Paintbrush, Save } from 'lucide-react';
import { useAccount } from 'wagmi';
import { WIDGET_TYPES, GRID_CONFIG } from './WidgetTypes';
import WidgetRenderer from './WidgetRenderer';
import WidgetPalette from './WidgetPalette';
import WidgetEditor from './WidgetEditor';
import { supabase } from '../lib/supabase';

const { CELL_SIZE } = GRID_CONFIG;

function createDefaultWidget(type, index, canvasSize, existingWidgets) {
  const id = `${type}-${Date.now()}-${index}`;
  const base = {
    id,
    type,
    locked: false,
    positionUnits: 'px',
    data: {},
  };

  if (type === WIDGET_TYPES.USER_PANEL) {
    const cw = canvasSize?.width ?? 800;
    const ch = canvasSize?.height ?? 600;
    return {
      ...base,
      id: 'user-panel',
      x: 0,
      y: 0,
      w: 0,
      h: 0,
      locked: true,
      fixedWidthPx: cw * 0.175,
      fixedHeightPx: ch * 0.4,
      data: { name: '', avatarUrl: '' },
    };
  }

  if (type === WIDGET_TYPES.TEXT) {
    const stagger = existingWidgets.filter((w) => w.type === WIDGET_TYPES.TEXT).length;
    return {
      ...base,
      x: 20 + stagger * 30,
      y: 20 + stagger * 30,
      w: 4,
      h: 2,
      data: { content: 'New text', fontSize: 14, color: '#e5e7eb', textAlign: 'left' },
    };
  }

  if (type === WIDGET_TYPES.IMAGE) {
    const stagger = existingWidgets.filter((w) => w.type === WIDGET_TYPES.IMAGE).length;
    return {
      ...base,
      x: 40 + stagger * 40,
      y: 80 + stagger * 40,
      w: 4,
      h: 4,
      data: { url: '', borderWidth: 0, borderColor: '#6b7280' },
    };
  }

  if (type === WIDGET_TYPES.NFT) {
    const stagger = existingWidgets.filter((w) => w.type === WIDGET_TYPES.NFT).length;
    return {
      ...base,
      x: 50 + stagger * 45,
      y: 90 + stagger * 45,
      w: 4,
      h: 5,
      data: { imageUrl: '', name: '', collection: '' },
    };
  }

  if (type === WIDGET_TYPES.STATISTIC) {
    const stagger = existingWidgets.filter((w) => w.type === WIDGET_TYPES.STATISTIC).length;
    return {
      ...base,
      x: 30 + stagger * 35,
      y: 140 + stagger * 35,
      w: 3,
      h: 2,
      data: { label: 'Statistic', value: '0', valueColor: '#e5e7eb', labelColor: '#9ca3af' },
    };
  }

  if (type === WIDGET_TYPES.BADGE) {
    const stagger = existingWidgets.filter((w) => w.type === WIDGET_TYPES.BADGE).length;
    return {
      ...base,
      x: 60 + stagger * 30,
      y: 120 + stagger * 30,
      w: 3,
      h: 1,
      data: { label: 'Badge', bgColor: '#4f46e5', textColor: '#fff' },
    };
  }

  if (type === WIDGET_TYPES.DIVIDER) {
    const stagger = existingWidgets.filter((w) => w.type === WIDGET_TYPES.DIVIDER).length;
    return {
      ...base,
      x: 20 + stagger * 20,
      y: 180 + stagger * 30,
      w: 6,
      h: 1,
      data: { color: '#6b7280' },
    };
  }

  return {
    ...base,
    x: 20,
    y: 20,
    w: 4,
    h: 4,
    data: {},
  };
}

function ensureUserPanel(widgets, canvasSize) {
  const has = widgets.some((w) => w.id === 'user-panel');
  if (has) return widgets;
  const userPanel = createDefaultWidget(WIDGET_TYPES.USER_PANEL, 0, canvasSize, []);
  return [userPanel, ...widgets];
}

export default function ProfileGrid({ onProfileChange }) {
  const canvasRef = useRef(null);
  const { address } = useAccount();
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [widgets, setWidgets] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [rightTab, setRightTab] = useState('add'); // 'add' | 'style'
  const [saveStatus, setSaveStatus] = useState(null); // null | 'saving' | 'saved' | 'error'

  const [dragState, setDragState] = useState(null);
  const [resizeState, setResizeState] = useState(null);
  const prevCanvasSizeRef = useRef(null);
  const [wordleStats, setWordleStats] = useState(null);

  const measureCanvas = useCallback(() => {
    const el = canvasRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setCanvasSize({ width: rect.width, height: rect.height });
  }, []);

  useEffect(() => {
    measureCanvas();
    const ro = new ResizeObserver(measureCanvas);
    if (canvasRef.current) ro.observe(canvasRef.current);
    window.addEventListener('resize', measureCanvas);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measureCanvas);
    };
  }, [measureCanvas]);

  useEffect(() => {
    setWidgets((prev) => ensureUserPanel(prev, canvasSize));
  }, [canvasSize]);

  // Load saved profile from Supabase when wallet is connected
  useEffect(() => {
    if (!address || !supabase || !onProfileChange) return;
    (async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('layout_json, x_username')
        .eq('owner_wallet', address.toLowerCase())
        .maybeSingle();
      if (error) {
        console.warn('Profile load failed:', error);
        return;
      }
      if (data?.layout_json && Array.isArray(data.layout_json) && data.layout_json.length > 0) {
        const nextWidgets = ensureUserPanel(data.layout_json, canvasSize);
        const userPanel = nextWidgets.find((w) => w.id === 'user-panel');
        if (userPanel) {
          userPanel.data = { ...userPanel.data, x_username: data.x_username ?? null };
        }
        setWidgets(nextWidgets);
        if (userPanel?.data && typeof userPanel.data === 'object') {
          onProfileChange(userPanel.data);
        }
      }
    })();
  }, [address, onProfileChange]);

  useEffect(() => {
    if (!address || !supabase) {
      setWordleStats(null);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from('wordle_stats')
        .select('current_streak, avg_guesses')
        .eq('wallet_address', address.toLowerCase())
        .maybeSingle();
      setWordleStats(data ?? null);
    })();
  }, [address]);

  const handleSave = useCallback(async () => {
    if (!address || !supabase) {
      setSaveStatus('error');
      return;
    }
    setSaveStatus('saving');
    const userPanel = widgets.find((w) => w.id === 'user-panel');
    const payload = {
      owner_wallet: address.toLowerCase(),
      layout_json: widgets,
      username: userPanel?.data?.name?.trim() || null,
      avatar_url: userPanel?.data?.avatarUrl || null,
    };
    const { error } = await supabase
      .from('profiles')
      .upsert(payload, { onConflict: 'owner_wallet' });
    if (error) {
      console.warn('Profile save failed:', error);
      setSaveStatus('error');
      return;
    }
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus(null), 2000);
  }, [address, widgets]);

  // When canvas size changes (e.g. panel collapse), scale all widgets proportionally
  useEffect(() => {
    const cw = canvasSize.width ?? 0;
    const ch = canvasSize.height ?? 0;
    if (!cw || !ch) return;

    const prev = prevCanvasSizeRef.current;
    prevCanvasSizeRef.current = { width: cw, height: ch };

    if (prev && prev.width > 0 && prev.height > 0 && (prev.width !== cw || prev.height !== ch)) {
      const scaleX = cw / prev.width;
      const scaleY = ch / prev.height;
      setWidgets((prevWidgets) =>
        prevWidgets.map((widget) => {
          const currW = widget.fixedWidthPx ?? (widget.w ?? 4) * CELL_SIZE;
          const currH = widget.fixedHeightPx ?? (widget.h ?? 4) * CELL_SIZE;
          const newX = Math.round((widget.x ?? 0) * scaleX);
          const newY = Math.round((widget.y ?? 0) * scaleY);
          const newW = Math.max(8, Math.round(currW * scaleX));
          const newH = Math.max(8, Math.round(currH * scaleY));
          const updated = {
            ...widget,
            x: newX,
            y: newY,
            fixedWidthPx: newW,
            fixedHeightPx: newH,
          };
          // User panel keeps percentage-based size; overwrite in next effect
          if (widget.id === 'user-panel') return updated;
          return updated;
        })
      );
    }
  }, [canvasSize.width, canvasSize.height]);

  // User panel: keep fixed percentage of canvas
  useEffect(() => {
    if (!canvasSize.width || !canvasSize.height) return;
    const w = canvasSize.width * 0.175;
    const h = canvasSize.height * 0.4;
    setWidgets((prev) => {
      if (!prev.some((widget) => widget.id === 'user-panel')) return prev;
      return prev.map((widget) =>
        widget.id === 'user-panel'
          ? { ...widget, fixedWidthPx: w, fixedHeightPx: h }
          : widget
      );
    });
  }, [canvasSize.width, canvasSize.height]);

  const selectedWidget = widgets.find((w) => w.id === selectedId);

  const handleCanvasMouseDown = () => {
    setSelectedId(null);
  };

  const handleWidgetMouseDown = (e, widget) => {
    e.stopPropagation();
    setSelectedId(widget.id);
    if (resizeState) return;
    setDragState({
      id: widget.id,
      offsetX: e.clientX - (widget.x ?? 0),
      offsetY: e.clientY - (widget.y ?? 0),
    });
  };

  const handleResizeHandleMouseDown = (e, widget) => {
    e.stopPropagation();
    const { CELL_SIZE: cs } = GRID_CONFIG;
    const w = widget.fixedWidthPx ?? (widget.w ?? 4) * cs;
    const h = widget.fixedHeightPx ?? (widget.h ?? 4) * cs;
    setResizeState({
      id: widget.id,
      startX: e.clientX,
      startY: e.clientY,
      startWidthPx: w,
      startHeightPx: h,
    });
  };

  useEffect(() => {
    if (!dragState) return;
    const onMove = (e) => {
      const cw = canvasSize.width ?? 1;
      const ch = canvasSize.height ?? 1;
      const widget = widgets.find((w) => w.id === dragState.id);
      if (!widget) return;
      const w = widget.fixedWidthPx ?? (widget.w ?? 4) * CELL_SIZE;
      const h = widget.fixedHeightPx ?? (widget.h ?? 4) * CELL_SIZE;
      let nx = e.clientX - dragState.offsetX;
      let ny = e.clientY - dragState.offsetY;
      nx = Math.max(0, Math.min(nx, cw - w));
      ny = Math.max(0, Math.min(ny, ch - h));
      setWidgets((prev) =>
        prev.map((w) => (w.id === dragState.id ? { ...w, x: nx, y: ny } : w))
      );
    };
    const onUp = () => setDragState(null);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragState, canvasSize, widgets]);

  useEffect(() => {
    if (!resizeState) return;
    const onMove = (e) => {
      const cw = canvasSize.width ?? 1;
      const ch = canvasSize.height ?? 1;
      const dx = e.clientX - resizeState.startX;
      const dy = e.clientY - resizeState.startY;
      const nw = Math.max(8, Math.min(resizeState.startWidthPx + dx, cw));
      const nh = Math.max(8, Math.min(resizeState.startHeightPx + dy, ch));
      setWidgets((prev) =>
        prev.map((w) =>
          w.id === resizeState.id
            ? { ...w, fixedWidthPx: nw, fixedHeightPx: nh }
            : w
        )
      );
    };
    const onUp = () => setResizeState(null);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [resizeState, canvasSize]);

  const userPanelAvatarUrl = widgets.find((w) => w.id === 'user-panel')?.data?.avatarUrl ?? '';
  useEffect(() => {
    const userPanel = widgets.find((w) => w.id === 'user-panel');
    if (userPanel?.data && onProfileChange) {
      onProfileChange(userPanel.data);
    }
  }, [widgets.length, onProfileChange, userPanelAvatarUrl]);

  const onChangeWidget = (updated) => {
    setWidgets((prev) =>
      prev.map((w) => (w.id === updated.id ? updated : w))
    );
    if (updated.id === 'user-panel' && updated.data && onProfileChange) {
      onProfileChange(updated.data);
    }
  };

  const onDeleteWidget = (id) => {
    setWidgets((prev) => prev.filter((w) => w.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const onAddWidget = (type) => {
    const count = widgets.length;
    const newWidget = createDefaultWidget(type, count, canvasSize, widgets);
    setWidgets((prev) => [...prev, newWidget]);
    setSelectedId(newWidget.id);
    setRightTab('style');
  };

  return (
    <div className="flex flex-row h-full min-h-0 gap-[1%] p-[1%]">
      <div className="flex flex-col flex-1 min-w-0 min-h-0">
        <h2 className="text-lg font-semibold text-gray-200 mb-2">Profile Canvas</h2>
        <div
          ref={canvasRef}
          className="flex-1 min-h-0 studio-grid-canvas studio-scrollbar overflow-auto rounded-none"
          onMouseDown={handleCanvasMouseDown}
        >
          {widgets.map((widget) => (
            <WidgetRenderer
              key={widget.id}
              widget={widget}
              canvasSize={canvasSize}
              wordleStats={wordleStats}
              isSelected={selectedId === widget.id}
              onMouseDown={(e) => handleWidgetMouseDown(e, widget)}
              onResizeHandleMouseDown={
                widget.locked
                  ? undefined
                  : (e) => handleResizeHandleMouseDown(e, widget)
              }
            />
          ))}
        </div>
      </div>

      <aside
        className={`flex flex-col min-h-0 border-l border-gray-800 bg-gray-900/80 transition-[width] ${
          panelCollapsed ? 'w-10' : 'w-[15%] min-w-[200px]'
        }`}
      >
        <header className="flex items-center justify-between gap-2 p-2 border-b border-gray-800 shrink-0">
          {!panelCollapsed && (
            <span className="text-sm font-medium text-gray-300 truncate">
              Widgets / Add & style
            </span>
          )}
          <button
            type="button"
            onClick={() => setPanelCollapsed((c) => !c)}
            className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-gray-200"
            aria-label={panelCollapsed ? 'Expand panel' : 'Collapse panel'}
          >
            {panelCollapsed ? (
              <ChevronLeft className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        </header>

        {!panelCollapsed && (
          <>
            <div className="flex border-b border-gray-800 shrink-0">
              <button
                type="button"
                onClick={() => setRightTab('add')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs ${
                  rightTab === 'add'
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                Add Widget
              </button>
              <button
                type="button"
                onClick={() => setRightTab('style')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs ${
                  rightTab === 'style'
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                }`}
              >
                <Paintbrush className="w-3.5 h-3.5" />
                Style
              </button>
            </div>

            <div className="flex-1 overflow-auto p-3 studio-scrollbar">
              {rightTab === 'add' && (
                <WidgetPalette onAddWidget={onAddWidget} />
              )}
              {rightTab === 'style' && (
                <WidgetEditor
                  widget={selectedWidget}
                  canvasSize={canvasSize}
                  onChangeWidget={onChangeWidget}
                  onDeleteWidget={onDeleteWidget}
                />
              )}
            </div>

            <div className="p-3 border-t border-gray-800 shrink-0">
              <button
                type="button"
                onClick={handleSave}
                disabled={!address || saveStatus === 'saving' || !supabase}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
              >
                <Save className="w-4 h-4 shrink-0" />
                {saveStatus === 'saving'
                  ? 'Saving…'
                  : saveStatus === 'saved'
                    ? 'Saved'
                    : saveStatus === 'error'
                      ? 'Error'
                      : 'Save profile'}
              </button>
              {!address && (
                <p className="text-xs text-gray-500 mt-1.5 text-center">Connect wallet to save</p>
              )}
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
