import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import GridLayout from 'react-grid-layout';

const CELL_SIZE_PX = 46;
const GRID_LINE = 'rgba(255,255,255,0.08)';

const WIDGET_TEMPLATES = [
  { type: 'textbox', label: 'Text Box' },
  { type: 'image', label: 'Image' },
  { type: 'nft', label: 'NFT' },
  { type: 'badges', label: 'Badges' },
  { type: 'stat', label: 'Stat Blocks' },
  { type: 'divider', label: 'Dividers' },
];

function uid(prefix = 'w') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function clampInt(n, min, max) {
  const x = Number.isFinite(n) ? Math.floor(n) : min;
  return Math.max(min, Math.min(max, x));
}

function useObjectUrl(file) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    if (!file) {
      setUrl(null);
      return;
    }
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return url;
}

function ImageWidget({ id, widget, setWidgets, removeWidget, isSelected }) {
  const file = widget?.props?.file || null;
  const url = useObjectUrl(file);
  const src = url || null;

  const baseWrapStyle = {
    width: '100%',
    height: '100%',
    background: 'rgba(20,20,20,0.9)',
    border: widget?.props?.border ? '1px solid rgba(255,255,255,0.14)' : '1px solid transparent',
    borderRadius: widget?.props?.radius ? `${widget.props.radius}px` : 0,
    boxSizing: 'border-box',
    overflow: 'hidden',
    position: 'relative',
    display: 'flex',
    alignItems: 'stretch',
    justifyContent: 'stretch',
  };

  return (
    <div style={baseWrapStyle}>
      <div
        className="widget-drag-handle"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          height: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 8px',
          background: 'rgba(0,0,0,0.35)',
          color: 'rgba(255,255,255,0.85)',
          fontSize: 11,
          userSelect: 'none',
          cursor: 'grab',
          borderBottom: isSelected ? '1px solid rgba(124,58,237,0.55)' : '1px solid rgba(255,255,255,0.08)',
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <span style={{ fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>image</span>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); removeWidget(id); }}
          style={{
            border: '1px solid rgba(255,255,255,0.2)',
            background: 'rgba(0,0,0,0.4)',
            color: '#fff',
            width: 22,
            height: 18,
            borderRadius: 6,
            cursor: 'pointer',
            lineHeight: 1,
          }}
          title="Remove"
        >
          ×
        </button>
      </div>
      <div style={{ marginTop: 24, width: '100%', height: 'calc(100% - 24px)', position: 'relative' }}>
        {src ? (
          <img
            src={src}
            alt=""
            draggable={false}
            style={{
              width: '100%',
              height: '100%',
              objectFit: widget?.props?.fit === 'contain' ? 'contain' : 'cover',
              display: 'block',
              pointerEvents: 'none',
            }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>
            No image
          </div>
        )}
      </div>
    </div>
  );
}

function PanelTab({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        padding: '10px 12px',
        background: 'transparent',
        border: 'none',
        borderBottom: active ? '2px solid #7c3aed' : '2px solid transparent',
        color: active ? '#e9d5ff' : 'rgba(255,255,255,0.7)',
        cursor: 'pointer',
        fontSize: '0.85rem',
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
      }}
    >
      {children}
    </button>
  );
}

function FieldLabel({ children }) {
  return (
    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>
      {children}
    </div>
  );
}

export default function ProfileBuilderPage() {
  const gridWrapRef = useRef(null);
  const [cols, setCols] = useState(24);
  const [layout, setLayout] = useState([]);
  const [widgets, setWidgets] = useState({}); // { [id]: { type, props } }
  const [activeTab, setActiveTab] = useState('add'); // 'add' | 'style'
  const [selectedId, setSelectedId] = useState(null);

  const selected = selectedId ? widgets[selectedId] : null;

  const recomputeCols = useCallback(() => {
    const el = gridWrapRef.current;
    if (!el) return;
    const w = el.clientWidth || 0;
    const nextCols = clampInt(w / CELL_SIZE_PX, 10, 80);
    setCols(nextCols);
  }, []);

  useEffect(() => {
    recomputeCols();
    const el = gridWrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(recomputeCols);
    ro.observe(el);
    return () => ro.disconnect();
  }, [recomputeCols]);

  const onDragStartTemplate = (e, type) => {
    try {
      e.dataTransfer.setData('application/x-jooba-widget', type);
      e.dataTransfer.effectAllowed = 'copy';
    } catch {
      // ignore
    }
  };

  const addWidgetAt = useCallback((type, x, y) => {
    const id = uid(type);
    const defaults =
      type === 'textbox'
        ? { text: 'Write something…', fontSize: 14, align: 'left' }
        : type === 'image'
          ? { fit: 'cover', border: true, radius: 10, file: null }
          : type === 'divider'
            ? { thickness: 2 }
            : type === 'stat'
              ? { title: 'STAT', value: '123' }
              : type === 'badges'
                ? { slots: 6 }
                : { note: 'NFT widget (placeholder)' };

    setWidgets((prev) => ({
      ...prev,
      [id]: {
        type,
        props: {
          ...defaults,
          border: defaults.border ?? true,
          radius: defaults.radius ?? 10,
        },
      },
    }));

    const size =
      type === 'divider'
        ? { w: Math.min(8, cols), h: 1 }
        : type === 'stat'
          ? { w: 6, h: 3 }
          : type === 'badges'
            ? { w: 10, h: 3 }
            : type === 'textbox'
              ? { w: 8, h: 6 }
              : type === 'image'
                ? { w: 6, h: 6 }
                : { w: 8, h: 6 };

    setLayout((prev) => [
      ...prev,
      {
        i: id,
        x: Math.max(0, Math.min(cols - size.w, x)),
        y: Math.max(0, y),
        w: size.w,
        h: size.h,
      },
    ]);

    setSelectedId(id);
    setActiveTab('style');
  }, [cols]);

  const removeWidget = useCallback((id) => {
    setLayout((prev) => prev.filter((l) => l.i !== id));
    setWidgets((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setSelectedId((prev) => (prev === id ? null : prev));
  }, []);

  const gridBgStyle = useMemo(() => ({
    backgroundColor: '#000',
    backgroundImage: `
      linear-gradient(${GRID_LINE} 1px, transparent 1px),
      linear-gradient(90deg, ${GRID_LINE} 1px, transparent 1px)
    `,
    backgroundSize: `${CELL_SIZE_PX}px ${CELL_SIZE_PX}px`,
    backgroundPosition: '0 0',
  }), []);

  const renderWidget = (id) => {
    const w = widgets[id];
    if (!w) return null;

    const baseWrapStyle = {
      width: '100%',
      height: '100%',
      background: 'rgba(20,20,20,0.9)',
      border: w.props?.border ? '1px solid rgba(255,255,255,0.14)' : '1px solid transparent',
      borderRadius: w.props?.radius ? `${w.props.radius}px` : 0,
      boxSizing: 'border-box',
      overflow: 'hidden',
      position: 'relative',
      display: 'flex',
      alignItems: 'stretch',
      justifyContent: 'stretch',
    };

    const isSelected = selectedId === id;

    const header = (
      <div
        className="widget-drag-handle"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          height: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 8px',
          background: 'rgba(0,0,0,0.35)',
          color: 'rgba(255,255,255,0.85)',
          fontSize: 11,
          userSelect: 'none',
          cursor: 'grab',
          borderBottom: isSelected ? '1px solid rgba(124,58,237,0.55)' : '1px solid rgba(255,255,255,0.08)',
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <span style={{ fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{w.type}</span>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); removeWidget(id); }}
          style={{
            border: '1px solid rgba(255,255,255,0.2)',
            background: 'rgba(0,0,0,0.4)',
            color: '#fff',
            width: 22,
            height: 18,
            borderRadius: 6,
            cursor: 'pointer',
            lineHeight: 1,
          }}
          title="Remove"
        >
          ×
        </button>
      </div>
    );

    if (w.type === 'textbox') {
      return (
        <div style={baseWrapStyle}>
          {header}
          <textarea
            value={w.props.text || ''}
            onChange={(e) => setWidgets((prev) => ({ ...prev, [id]: { ...prev[id], props: { ...prev[id].props, text: e.target.value } } }))}
            style={{
              marginTop: 24,
              flex: 1,
              width: '100%',
              height: 'calc(100% - 24px)',
              resize: 'none',
              border: 'none',
              outline: 'none',
              padding: 10,
              background: 'transparent',
              color: '#e5e7eb',
              fontSize: w.props.fontSize || 14,
              lineHeight: 1.35,
              textAlign: w.props.align || 'left',
              boxSizing: 'border-box',
            }}
          />
        </div>
      );
    }

    if (w.type === 'image') {
      return (
        <ImageWidget
          id={id}
          widget={w}
          setWidgets={setWidgets}
          removeWidget={removeWidget}
          isSelected={selectedId === id}
        />
      );
    }

    if (w.type === 'divider') {
      return (
        <div style={{ ...baseWrapStyle, background: 'transparent', border: '1px solid transparent' }}>
          {header}
          <div style={{ marginTop: 24, width: '100%', height: 'calc(100% - 24px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '100%', height: 0, borderTop: `${w.props.thickness || 2}px solid rgba(255,255,255,0.35)` }} />
          </div>
        </div>
      );
    }

    if (w.type === 'stat') {
      return (
        <div style={baseWrapStyle}>
          {header}
          <div style={{ marginTop: 24, padding: 12, display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.08em' }}>{w.props.title || 'STAT'}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#fff' }}>{w.props.value || '0'}</div>
          </div>
        </div>
      );
    }

    if (w.type === 'badges') {
      const slots = clampInt(w.props.slots ?? 6, 1, 12);
      return (
        <div style={baseWrapStyle}>
          {header}
          <div style={{ marginTop: 24, padding: 10, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {Array.from({ length: slots }, (_, i) => (
              <div
                key={i}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                }}
                title="Badge slot"
              />
            ))}
          </div>
        </div>
      );
    }

    // nft placeholder
    return (
      <div style={baseWrapStyle}>
        {header}
        <div style={{ marginTop: 24, width: '100%', height: 'calc(100% - 24px)', display: 'grid', placeItems: 'center', color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>
          NFT widget (placeholder)
        </div>
      </div>
    );
  };

  return (
    <div
      className="profile-builder-page"
      style={{
        width: '100%',
        height: '100%',
        minHeight: '100%',
        display: 'flex',
        alignItems: 'stretch',
        justifyContent: 'stretch',
        background: '#000',
      }}
    >
      <div
        ref={gridWrapRef}
        style={{
          flex: 1,
          minWidth: 0,
          minHeight: 0,
          position: 'relative',
          ...gridBgStyle,
        }}
      >
        <GridLayout
          className="layout"
          layout={layout}
          cols={cols}
          rowHeight={CELL_SIZE_PX}
          width={gridWrapRef.current?.clientWidth || 1200}
          margin={[0, 0]}
          containerPadding={[0, 0]}
          isDroppable
          droppingItem={{ i: '__dropping__', w: 6, h: 6 }}
          compactType={null}
          preventCollision={false}
          draggableHandle=".widget-drag-handle"
          onLayoutChange={(next) => setLayout(next)}
          onDrop={(nextLayout, item, e) => {
            const type = e?.dataTransfer?.getData?.('application/x-jooba-widget') || '';
            const safeType = WIDGET_TEMPLATES.some((t) => t.type === type) ? type : null;
            if (!safeType) return;
            addWidgetAt(safeType, item.x, item.y);
            setLayout(nextLayout.filter((l) => l.i !== '__dropping__'));
          }}
          onDragStop={(_, __, newItem) => {
            setSelectedId(newItem?.i || null);
          }}
          onResizeStop={(_, __, newItem) => {
            setSelectedId(newItem?.i || null);
          }}
          onDragStart={(_, __, it) => setSelectedId(it?.i || null)}
          onResizeStart={(_, __, it) => setSelectedId(it?.i || null)}
        >
          {layout.map((l) => (
            <div
              key={l.i}
              onMouseDown={() => {
                setSelectedId(l.i);
                setActiveTab('style');
              }}
              style={{
                outline: selectedId === l.i ? '2px solid rgba(124,58,237,0.7)' : '2px solid transparent',
                outlineOffset: -2,
                borderRadius: 12,
              }}
            >
              {renderWidget(l.i)}
            </div>
          ))}
        </GridLayout>
      </div>

      <aside
        style={{
          width: 260,
          minWidth: 260,
          height: '100%',
          background: '#0b1220',
          borderLeft: '1px solid rgba(255,255,255,0.08)',
          color: '#e5e7eb',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid rgba(255,255,255,0.10)' }}>
          <PanelTab active={activeTab === 'add'} onClick={() => setActiveTab('add')}>
            <span style={{ fontSize: 14 }}>+</span> Add Widget
          </PanelTab>
          <PanelTab active={activeTab === 'style'} onClick={() => setActiveTab('style')}>
            <span style={{ fontSize: 14 }}>🖌</span> Style
          </PanelTab>
        </div>

        <div style={{ padding: 14, overflow: 'auto', flex: 1 }}>
          {activeTab === 'add' ? (
            <>
              <div style={{ fontSize: 11, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.45)', fontWeight: 800, marginBottom: 12 }}>
                WIDGETS
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {WIDGET_TEMPLATES.map((t) => (
                  <div
                    key={t.type}
                    draggable
                    onDragStart={(e) => onDragStartTemplate(e, t.type)}
                    style={{
                      userSelect: 'none',
                      cursor: 'grab',
                      padding: '12px 12px',
                      borderRadius: 10,
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.10)',
                      color: '#fff',
                      fontWeight: 600,
                      fontSize: 14,
                    }}
                    title="Drag onto the grid"
                  >
                    {t.label}
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 14, fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>
                Drag a widget into the grid. Then click it to style.
              </div>
            </>
          ) : (
            <>
              {!selected ? (
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
                  Select a widget on the grid to style it.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ fontSize: 11, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.45)', fontWeight: 800 }}>
                    {selected.type.toUpperCase()}
                  </div>

                  {selected.type !== 'divider' && (
                    <>
                      <FieldLabel>Border</FieldLabel>
                      <button
                        type="button"
                        onClick={() =>
                          setWidgets((prev) => ({
                            ...prev,
                            [selectedId]: {
                              ...prev[selectedId],
                              props: { ...prev[selectedId].props, border: !prev[selectedId].props.border },
                            },
                          }))
                        }
                        style={{
                          padding: '10px 12px',
                          borderRadius: 10,
                          border: '1px solid rgba(255,255,255,0.14)',
                          background: selected.props.border ? 'rgba(124,58,237,0.25)' : 'rgba(255,255,255,0.06)',
                          color: '#fff',
                          cursor: 'pointer',
                          fontWeight: 700,
                        }}
                      >
                        {selected.props.border ? 'On' : 'Off'}
                      </button>

                      <FieldLabel>Corner radius</FieldLabel>
                      <input
                        type="range"
                        min={0}
                        max={24}
                        value={selected.props.radius ?? 10}
                        onChange={(e) =>
                          setWidgets((prev) => ({
                            ...prev,
                            [selectedId]: {
                              ...prev[selectedId],
                              props: { ...prev[selectedId].props, radius: Number(e.target.value) },
                            },
                          }))
                        }
                      />
                    </>
                  )}

                  {selected.type === 'textbox' && (
                    <>
                      <FieldLabel>Font size</FieldLabel>
                      <input
                        type="range"
                        min={12}
                        max={22}
                        value={selected.props.fontSize ?? 14}
                        onChange={(e) =>
                          setWidgets((prev) => ({
                            ...prev,
                            [selectedId]: {
                              ...prev[selectedId],
                              props: { ...prev[selectedId].props, fontSize: Number(e.target.value) },
                            },
                          }))
                        }
                      />
                      <FieldLabel>Text align</FieldLabel>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {['left', 'center', 'right'].map((a) => (
                          <button
                            key={a}
                            type="button"
                            onClick={() =>
                              setWidgets((prev) => ({
                                ...prev,
                                [selectedId]: {
                                  ...prev[selectedId],
                                  props: { ...prev[selectedId].props, align: a },
                                },
                              }))
                            }
                            style={{
                              flex: 1,
                              padding: '10px 8px',
                              borderRadius: 10,
                              border: '1px solid rgba(255,255,255,0.14)',
                              background: selected.props.align === a ? 'rgba(124,58,237,0.25)' : 'rgba(255,255,255,0.06)',
                              color: '#fff',
                              cursor: 'pointer',
                              fontWeight: 700,
                              textTransform: 'capitalize',
                            }}
                          >
                            {a}
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  {selected.type === 'image' && (
                    <>
                      <FieldLabel>Image</FieldLabel>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const f = e.target.files?.[0] || null;
                          setWidgets((prev) => ({
                            ...prev,
                            [selectedId]: {
                              ...prev[selectedId],
                              props: { ...prev[selectedId].props, file: f },
                            },
                          }));
                        }}
                        style={{ color: 'rgba(255,255,255,0.7)' }}
                      />
                      <FieldLabel>Fit</FieldLabel>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {['cover', 'contain'].map((fit) => (
                          <button
                            key={fit}
                            type="button"
                            onClick={() =>
                              setWidgets((prev) => ({
                                ...prev,
                                [selectedId]: {
                                  ...prev[selectedId],
                                  props: { ...prev[selectedId].props, fit },
                                },
                              }))
                            }
                            style={{
                              flex: 1,
                              padding: '10px 8px',
                              borderRadius: 10,
                              border: '1px solid rgba(255,255,255,0.14)',
                              background: selected.props.fit === fit ? 'rgba(124,58,237,0.25)' : 'rgba(255,255,255,0.06)',
                              color: '#fff',
                              cursor: 'pointer',
                              fontWeight: 700,
                              textTransform: 'capitalize',
                            }}
                          >
                            {fit}
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  {selected.type === 'divider' && (
                    <>
                      <FieldLabel>Thickness</FieldLabel>
                      <input
                        type="range"
                        min={1}
                        max={8}
                        value={selected.props.thickness ?? 2}
                        onChange={(e) =>
                          setWidgets((prev) => ({
                            ...prev,
                            [selectedId]: {
                              ...prev[selectedId],
                              props: { ...prev[selectedId].props, thickness: Number(e.target.value) },
                            },
                          }))
                        }
                      />
                    </>
                  )}

                  {selected.type === 'badges' && (
                    <>
                      <FieldLabel>Slots</FieldLabel>
                      <input
                        type="range"
                        min={1}
                        max={12}
                        value={selected.props.slots ?? 6}
                        onChange={(e) =>
                          setWidgets((prev) => ({
                            ...prev,
                            [selectedId]: {
                              ...prev[selectedId],
                              props: { ...prev[selectedId].props, slots: Number(e.target.value) },
                            },
                          }))
                        }
                      />
                    </>
                  )}

                  {selected.type === 'stat' && (
                    <>
                      <FieldLabel>Title</FieldLabel>
                      <input
                        value={selected.props.title ?? ''}
                        onChange={(e) =>
                          setWidgets((prev) => ({
                            ...prev,
                            [selectedId]: {
                              ...prev[selectedId],
                              props: { ...prev[selectedId].props, title: e.target.value },
                            },
                          }))
                        }
                        style={{
                          padding: '10px 12px',
                          borderRadius: 10,
                          border: '1px solid rgba(255,255,255,0.14)',
                          background: 'rgba(255,255,255,0.06)',
                          color: '#fff',
                          outline: 'none',
                        }}
                      />
                      <FieldLabel>Value</FieldLabel>
                      <input
                        value={selected.props.value ?? ''}
                        onChange={(e) =>
                          setWidgets((prev) => ({
                            ...prev,
                            [selectedId]: {
                              ...prev[selectedId],
                              props: { ...prev[selectedId].props, value: e.target.value },
                            },
                          }))
                        }
                        style={{
                          padding: '10px 12px',
                          borderRadius: 10,
                          border: '1px solid rgba(255,255,255,0.14)',
                          background: 'rgba(255,255,255,0.06)',
                          color: '#fff',
                          outline: 'none',
                        }}
                      />
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
