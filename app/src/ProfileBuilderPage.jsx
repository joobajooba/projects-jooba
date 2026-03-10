import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import NFTSelector from './NFTSelector';
import { getAlchemyApiKey } from './lib/alchemy';
import { supabase } from './lib/supabase';
import { fetchUserProfile } from './userData';
import { ensureProfile, fetchProfileByWallet, updateProfile } from './profileBuilderApi';

const CELL_SIZE = 50;
const PADDING = 16;
// Optimal image pixel sizes (1×) per grid cell: width = cols * CELL_SIZE, height = rows * CELL_SIZE.
// Image | 3x5 → 150×250, 4x5 → 200×250, 8x5 → 400×250, 12x10 → 600×500. Use 2× for retina.

const ALLOWED_HTML_TAGS = new Set(['b', 'i', 'u', 'strong', 'em', 'ul', 'ol', 'li', 'p', 'br']);
function sanitizeHtml(html) {
  if (!html || typeof html !== 'string') return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  // Only process elements inside body (never html/body — replacing those would call document.replaceChild and throw HierarchyRequestError)
  const elements = Array.from(doc.body.querySelectorAll('*'));
  elements.forEach((el) => {
    if (!el.parentNode) return;
    const tag = el.tagName.toLowerCase();
    if (!ALLOWED_HTML_TAGS.has(tag)) {
      const text = doc.createTextNode(el.textContent || '');
      el.parentNode.replaceChild(text, el);
    } else {
      for (const a of [...el.attributes]) el.removeAttribute(a.name);
    }
  });
  return doc.body.innerHTML;
}

const PANEL_ITEMS = [
  { id: 'rect', type: 'rectangle', cols: 6, rows: 10, label: 'User panel' },
  { id: 'img-3x5', type: 'image-3x5', cols: 3, rows: 5, label: 'Image | 3x5' },
  { id: 'sq-s', type: 'square-small', cols: 4, rows: 5, label: 'Image | 4x5' },
  { id: 'img-8x5', type: 'image-8x5', cols: 8, rows: 5, label: 'Image | 8 x 5' },
  { id: 'img-12x10', type: 'image-12x10', cols: 12, rows: 10, label: 'Image | 12x10' },
  { id: 'txt-6x10', type: 'textbox', cols: 6, rows: 10, label: 'Text Box | 6X10', maxChars: 850 },
  { id: 'txt-8x10', type: 'textbox', cols: 8, rows: 10, label: 'Text Box | 8X10' },
  { id: 'kodacams-6x6', type: 'kodacams', cols: 6, rows: 6, label: 'Kodacams | 6x6' },
  { id: 'bops-4x5', type: 'bops', cols: 4, rows: 5, label: 'Bop | 4x5' },
  { id: 'stats-4x2', type: 'stats', cols: 4, rows: 2, label: 'Stat Block | 4x2' },
  { id: 'badges-6x2', type: 'badges', cols: 6, rows: 2, label: 'Badge Panel | 6x2' },
  { id: 'sq-l', type: 'square-large', cols: 2, rows: 2 },
];

const WIDGET_CATEGORIES = [
  { id: 'images', label: 'Images', templateIds: ['img-3x5', 'sq-s', 'img-8x5', 'img-12x10'] },
  { id: 'textboxes', label: 'Text Boxes', templateIds: ['txt-6x10', 'txt-8x10'] },
  { id: 'kodacams', label: 'Kodacams', templateIds: ['kodacams-6x6'] },
  { id: 'bops', label: 'Bops', templateIds: ['bops-4x5'] },
  { id: 'stats', label: 'Stats', templateIds: ['stats-4x2'] },
  { id: 'badges', label: 'Badges', templateIds: ['badges-6x2'] },
];

function getGridCoords(clientX, clientY, containerRect, cols, rows) {
  const innerW = containerRect.width - 2 * PADDING;
  const innerH = containerRect.height - 2 * PADDING;
  const cellW = innerW / cols;
  const cellH = innerH / rows;
  const relX = clientX - containerRect.left - PADDING;
  const relY = clientY - containerRect.top - PADDING;
  return {
    col: Math.floor(relX / cellW),
    row: Math.floor(relY / cellH),
  };
}

function clampCell(item, col, row, gridCols, gridRows) {
  const maxCol = Math.max(0, gridCols - item.cols);
  const maxRow = Math.max(0, gridRows - item.rows);
  return {
    col: Math.max(0, Math.min(maxCol, col)),
    row: Math.max(0, Math.min(maxRow, row)),
  };
}

function rectanglesOverlap(aCol, aRow, aCols, aRows, bCol, bRow, bCols, bRows) {
  return !(aCol + aCols <= bCol || bCol + bCols <= aCol || aRow + aRows <= bRow || bRow + bRows <= aRow);
}

function wouldOverlapPlacements(placements, excludeInstanceId, col, row, cols, rows) {
  for (const [instanceId, p] of Object.entries(placements)) {
    if (instanceId === excludeInstanceId) continue;
    const template = PANEL_ITEMS.find((t) => t.id === p.templateId);
    if (!template) continue;
    if (rectanglesOverlap(col, row, cols, rows, p.col, p.row, template.cols, template.rows)) {
      return true;
    }
  }
  return false;
}

function filterNonOverlappingPlacements(placements) {
  const entries = Object.entries(placements);
  const rectFirst = entries.sort(([idA, a], [idB, b]) => {
    const aIsRect = a.templateId === 'rect' ? 1 : 0;
    const bIsRect = b.templateId === 'rect' ? 1 : 0;
    return bIsRect - aIsRect;
  });
  const kept = {};
  for (const [instanceId, p] of rectFirst) {
    const template = PANEL_ITEMS.find((t) => t.id === p.templateId);
    if (!template) continue;
    if (wouldOverlapPlacements(kept, null, p.col, p.row, template.cols, template.rows)) continue;
    kept[instanceId] = p;
  }
  return kept;
}

function isOverElement(clientX, clientY, el) {
  if (!el) return false;
  const r = el.getBoundingClientRect();
  return (
    clientX >= r.left &&
    clientX <= r.right &&
    clientY >= r.top &&
    clientY <= r.bottom
  );
}

const RICH_TEXT_MAX_LENGTH = 4000;

function TextBoxContent({ editMode, instanceId, value, onValueChange, maxChars, onFocusInstance }) {
  const editableRef = useRef(null);
  const lastValueRef = useRef(value);

  const valueToHtml = useCallback((v) => {
    if (!v || typeof v !== 'string') return '';
    if (v.trim().startsWith('<') && v.includes('>')) return sanitizeHtml(v);
    return '<p>' + String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>') + '</p>';
  }, []);

  useEffect(() => {
    if (!editableRef.current || !editMode) return;
    if (document.activeElement === editableRef.current) return;
    const html = valueToHtml(value);
    if (editableRef.current.innerHTML !== html) {
      editableRef.current.innerHTML = html;
      lastValueRef.current = value;
    }
  }, [editMode, instanceId, valueToHtml, value]);

  const syncFromEditable = useCallback(() => {
    if (!editableRef.current) return;
    let html = editableRef.current.innerHTML;
    html = sanitizeHtml(html);
    if (html.length > RICH_TEXT_MAX_LENGTH) html = html.slice(0, RICH_TEXT_MAX_LENGTH);
    if (maxChars != null) {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const textLen = (doc.body.textContent || '').length;
      if (textLen > maxChars) {
        editableRef.current.innerHTML = lastValueRef.current || '';
        return;
      }
    }
    lastValueRef.current = html;
    onValueChange(html);
  }, [onValueChange, maxChars]);

  if (editMode) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          padding: 16,
          boxSizing: 'border-box',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          ref={editableRef}
          contentEditable
          suppressContentEditableWarning
          onInput={syncFromEditable}
          onFocus={() => onFocusInstance?.(instanceId)}
          onMouseDown={(e) => { onFocusInstance?.(instanceId); e.stopPropagation(); }}
          data-placeholder="Write something..."
          data-instance-id={instanceId}
          style={{
            flex: 1,
            minHeight: 40,
            overflow: 'auto',
            background: '#1a1a1a',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 4,
            color: '#fff',
            fontSize: '0.8rem',
            padding: 10,
            boxSizing: 'border-box',
            outline: 'none',
          }}
        />
      </div>
    );
  }

  const html = valueToHtml(value);
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        padding: 16,
        boxSizing: 'border-box',
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{ fontSize: '0.8rem', color: '#e5e5e5', lineHeight: 1.5, wordBreak: 'break-word' }}
        onMouseDown={(e) => e.stopPropagation()}
        dangerouslySetInnerHTML={{ __html: html || '<p></p>' }}
      />
    </div>
  );
}

const sidePanelFormatBtnStyle = {
  padding: '6px 10px',
  borderRadius: 4,
  border: '1px solid rgba(255,255,255,0.3)',
  background: 'rgba(255,255,255,0.1)',
  color: '#fff',
  cursor: 'pointer',
  fontSize: '0.75rem',
  fontWeight: 700,
};

export default function ProfileBuilderPage({ staticView = false }) {
  const { walletAddress: paramWallet } = useParams();
  const { address } = useAccount();
  const navigate = useNavigate();
  const effectiveAddress = staticView
    ? (paramWallet || address || '').toLowerCase()
    : (address || '').toLowerCase();

  const gridContainerRef = useRef(null);
  const gridAreaRef = useRef(null);
  const [gridSize, setGridSize] = useState({ cols: 8, rows: 20 });
  const [gridInnerSize, setGridInnerSize] = useState({ width: 0, height: 0 });
  const [placements, setPlacements] = useState({});
  const [draggedId, setDraggedId] = useState(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [profileBlockNftImages, setProfileBlockNftImages] = useState({});
  const [imageWidgetImages, setImageWidgetImages] = useState({});
  const [textWidgetText, setTextWidgetText] = useState({});
  const [imageWidgetOptions, setImageWidgetOptions] = useState({}); // { [instanceId]: { corners: 'rounded'|'square', border: boolean } }
  const [selectedImageInstanceId, setSelectedImageInstanceId] = useState(null);
  const [widgetOutline, setWidgetOutline] = useState({}); // { [instanceId]: { enabled: boolean, shape: 'rounded'|'square' } }
  const [selectedWidgetInstanceId, setSelectedWidgetInstanceId] = useState(null);
  const [nftSelectorOpen, setNftSelectorOpen] = useState(false);
  const [nftSelectorForInstance, setNftSelectorForInstance] = useState(null);
  const [nftSelectorTarget, setNftSelectorTarget] = useState('profile'); // 'profile' | 'imageWidget'
  const [profile, setProfile] = useState({ username: null, xUsername: null });
  const [saveStatus, setSaveStatus] = useState(null); // null | 'saving' | 'success' | 'error'
  const [editMode, setEditMode] = useState(!staticView); // builder: true; static profile: always false
  const [selectedCategory, setSelectedCategory] = useState(null); // null | 'images' | 'textboxes' | 'all'
  const uploadInputRef = useRef(null);
  const uploadForInstanceRef = useRef(null);
  const layoutLoadedRef = useRef(false);

  // Profile (username, xUsername): from userData when builder, from profile_page when staticView
  useEffect(() => {
    if (staticView) return; // static view sets profile from fetchProfileByWallet below
    if (!address) {
      setProfile({ username: null, xUsername: null });
      return;
    }
    let cancelled = false;
    fetchUserProfile(address).then((data) => {
      if (!cancelled && data) {
        setProfile({
          username: data.username ?? null,
          xUsername: data.xUsername ?? null,
        });
      }
    });
    return () => { cancelled = true; };
  }, [address, staticView]);

  // Load saved layout: builder uses address once; static view uses effectiveAddress when it changes
  useEffect(() => {
    if (staticView) {
      if (!effectiveAddress) return;
    } else {
      if (!address || layoutLoadedRef.current) return;
      layoutLoadedRef.current = true;
    }
    const walletToLoad = staticView ? effectiveAddress : address;
    let cancelled = false;
    // Static view: username/X come from user_data (Profile modal); layout from profile_page
    if (staticView) {
      fetchUserProfile(walletToLoad).then((userData) => {
        if (cancelled) return;
        if (userData) {
          setProfile({
            username: userData.username ?? null,
            xUsername: userData.xUsername ?? null,
          });
        }
      });
    }
    fetchProfileByWallet(walletToLoad).then((data) => {
      if (cancelled) return;
      const layout = data?.layout_json;
      const initialPlacements =
        layout?.placements && typeof layout.placements === 'object'
          ? layout.placements
          : {};
      const hasUserPanel = Object.values(initialPlacements).some(
        (p) => p.templateId === 'rect'
      );
      const rawPlacements = hasUserPanel
        ? initialPlacements
        : { ...initialPlacements, 'rect-default': { col: 0, row: 0, templateId: 'rect' } };
      const placementsToSet = filterNonOverlappingPlacements(rawPlacements);
      setPlacements(placementsToSet);
      if (layout?.nftImages && typeof layout.nftImages === 'object') {
        setProfileBlockNftImages(layout.nftImages);
      }
      if (layout?.imageWidgetImages && typeof layout.imageWidgetImages === 'object') {
        setImageWidgetImages(layout.imageWidgetImages);
      }
      if (layout?.textWidgetText && typeof layout.textWidgetText === 'object') {
        const truncated = {};
        for (const [k, v] of Object.entries(layout.textWidgetText)) {
          truncated[k] = typeof v === 'string' ? v.slice(0, RICH_TEXT_MAX_LENGTH) : '';
        }
        setTextWidgetText(truncated);
      }
      if (layout?.imageWidgetOptions && typeof layout.imageWidgetOptions === 'object') {
        setImageWidgetOptions(layout.imageWidgetOptions);
      }
      if (layout?.widgetOutline && typeof layout.widgetOutline === 'object') {
        const migrated = {};
        for (const [k, v] of Object.entries(layout.widgetOutline)) {
          if (v && typeof v === 'object') {
            migrated[k] = {
              enabled: !!v.enabled,
              shape: v.shape === 'square' ? 'square' : 'rounded',
            };
          } else if (typeof v === 'boolean') {
            migrated[k] = { enabled: v, shape: 'rounded' };
          }
        }
        setWidgetOutline(migrated);
      }
    });
    return () => { cancelled = true; };
  }, [staticView, effectiveAddress, address]);

  const syncFocusedTextBoxFromPanel = useCallback(() => {
    const el = document.activeElement;
    if (!el?.isContentEditable || !el.dataset.instanceId) return;
    let html = el.innerHTML;
    html = sanitizeHtml(html);
    if (html.length > RICH_TEXT_MAX_LENGTH) html = html.slice(0, RICH_TEXT_MAX_LENGTH);
    setTextWidgetText((prev) => ({ ...prev, [el.dataset.instanceId]: html }));
  }, []);

  const handleSaveLayout = useCallback(async () => {
    if (!address) return;
    setSaveStatus('saving');
    try {
      await ensureProfile(address);
      // Capture current DOM from ALL text box editors (clicking Save moves focus so we can't rely on activeElement)
      let textToSave = { ...textWidgetText };
      const editables = document.querySelectorAll('[data-instance-id][contenteditable="true"]');
      editables.forEach((el) => {
        const id = el.dataset.instanceId;
        if (!id) return;
        let html = el.innerHTML;
        html = sanitizeHtml(html);
        if (html.length > RICH_TEXT_MAX_LENGTH) html = html.slice(0, RICH_TEXT_MAX_LENGTH);
        textToSave[id] = html;
      });
      setTextWidgetText(textToSave);
      const persistableImageWidgetImages = Object.fromEntries(
        Object.entries(imageWidgetImages).filter(([, url]) => typeof url === 'string' && !url.startsWith('blob:'))
      );
      const { ok, error } = await updateProfile(address, {
        layout_json: {
          placements: { ...placements },
          nftImages: { ...profileBlockNftImages },
          imageWidgetImages: persistableImageWidgetImages,
          textWidgetText: textToSave,
          imageWidgetOptions: { ...imageWidgetOptions },
          widgetOutline: { ...widgetOutline },
        },
      });
      if (ok) {
        setSaveStatus('success');
        setTimeout(() => setSaveStatus(null), 2500);
      } else {
        setSaveStatus('error');
        setTimeout(() => setSaveStatus(null), 3000);
      }
    } catch (e) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(null), 3000);
    }
  }, [address, placements, profileBlockNftImages, imageWidgetImages, textWidgetText, imageWidgetOptions, widgetOutline]);

  const startUploadFor = useCallback((instanceId) => {
    if (!editMode) return;
    uploadForInstanceRef.current = instanceId;
    uploadInputRef.current?.click();
  }, [editMode]);

  const onUploadFileChange = useCallback(async (e) => {
    const file = e.target?.files?.[0];
    const instanceId = uploadForInstanceRef.current;
    e.target.value = '';
    uploadForInstanceRef.current = null;
    if (!file || !instanceId) return;

    const objectUrl = URL.createObjectURL(file);
    setImageWidgetImages((prev) => ({ ...prev, [instanceId]: objectUrl }));

    const setPersistableUrl = (url) => {
      URL.revokeObjectURL(objectUrl);
      setImageWidgetImages((prev) => ({ ...prev, [instanceId]: url }));
    };

    let storageSucceeded = false;
    if (address && supabase) {
      try {
        const normalized = String(address).toLowerCase();
        const safeName = String(file.name || 'upload').replace(/[^a-zA-Z0-9._-]/g, '_');
        const path = `profile_page/${normalized}/${instanceId}/${Date.now()}-${safeName}`;

        const { error: uploadError } = await supabase
          .storage
          .from('profile_page_assets')
          .upload(path, file, { upsert: true, contentType: file.type || 'image/*' });

        if (!uploadError) {
          const { data } = supabase.storage.from('profile_page_assets').getPublicUrl(path);
          if (data?.publicUrl) {
            setPersistableUrl(data.publicUrl);
            storageSucceeded = true;
          }
        } else {
          console.warn('[ProfileBuilderPage] upload failed', uploadError);
        }
      } catch (err) {
        console.warn('[ProfileBuilderPage] upload failed', err);
      }
    }

    // Fallback: data URL so the image persists in layout_json when user clicks Save (works in new tab)
    if (!storageSucceeded && file.type?.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result;
        if (typeof dataUrl === 'string' && dataUrl.startsWith('data:')) setPersistableUrl(dataUrl);
      };
      reader.readAsDataURL(file);
    }
  }, [address]);

  // Lock page scrolling while the builder is open so width/height stay static.
  useEffect(() => {
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, []);

  const updateGridSize = useCallback(() => {
    const el = gridAreaRef.current;
    if (!el) return;
    const w = el.clientWidth;
    const h = el.clientHeight;
    const innerW = w - 2 * PADDING;
    const innerH = h - 2 * PADDING;
    // Grid is 3 columns narrower than the previous formula (was -2, now -5)
    const cols = Math.max(8, Math.floor(innerW / CELL_SIZE) - 5);
    const rows = Math.max(20, Math.floor(innerH / CELL_SIZE));
    setGridInnerSize({ width: w, height: h });
    setGridSize((prev) =>
      prev.cols !== cols || prev.rows !== rows ? { cols, rows } : prev
    );
  }, []);

  useEffect(() => {
    updateGridSize();
    const el = gridAreaRef.current;
    if (!el) return;
    const observer = new ResizeObserver(updateGridSize);
    observer.observe(el);
    return () => observer.disconnect();
  }, [updateGridSize]);

  const cellWidthPx =
    gridInnerSize.width > 0
      ? (gridInnerSize.width - 2 * PADDING) / gridSize.cols
      : CELL_SIZE;
  const cellHeightPx =
    gridInnerSize.height > 0
      ? (gridInnerSize.height - 2 * PADDING) / gridSize.rows
      : CELL_SIZE;

  const placeOnGrid = useCallback(
    (draggedIdOrNew, col, row) => {
      const isNew = typeof draggedIdOrNew === 'string' && draggedIdOrNew.startsWith('new:');
      const templateId = isNew ? draggedIdOrNew.slice(4) : null;
      const item = isNew
        ? PANEL_ITEMS.find((i) => i.id === templateId)
        : null;

      if (isNew && item) {
        const { col: c, row: r } = clampCell(
          item,
          col,
          row,
          gridSize.cols,
          gridSize.rows
        );
        setPlacements((prev) => {
          if (wouldOverlapPlacements(prev, null, c, r, item.cols, item.rows)) return prev;
          const instanceId = `${templateId}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
          return { ...prev, [instanceId]: { col: c, row: r, templateId: item.id } };
        });
        return;
      }

      if (!isNew) {
        setPlacements((prev) => {
          const existing = prev[draggedIdOrNew];
          if (!existing) return prev;
          const template = PANEL_ITEMS.find((i) => i.id === existing.templateId);
          if (!template) return prev;
          const { col: c, row: r } = clampCell(
            template,
            col,
            row,
            gridSize.cols,
            gridSize.rows
          );
          if (wouldOverlapPlacements(prev, draggedIdOrNew, c, r, template.cols, template.rows)) return prev;
          return {
            ...prev,
            [draggedIdOrNew]: { ...existing, col: c, row: r },
          };
        });
      }
    },
    [gridSize.cols, gridSize.rows]
  );

  const returnToPanel = useCallback((instanceId) => {
    if (typeof instanceId === 'string' && instanceId.startsWith('new:')) return;
    setPlacements((prev) => {
      const next = { ...prev };
      delete next[instanceId];
      return next;
    });
    setProfileBlockNftImages((prev) => {
      const next = { ...prev };
      delete next[instanceId];
      return next;
    });
    setImageWidgetImages((prev) => {
      const next = { ...prev };
      delete next[instanceId];
      return next;
    });
    setTextWidgetText((prev) => {
      const next = { ...prev };
      delete next[instanceId];
      return next;
    });
  }, []);

  const handleMouseUp = useCallback(
    (e) => {
      if (!draggedId) return;

      const overGrid = isOverElement(
        e.clientX,
        e.clientY,
        gridContainerRef.current
      );
      if (overGrid) {
        const rect = gridContainerRef.current.getBoundingClientRect();
        const { col, row } = getGridCoords(
          e.clientX,
          e.clientY,
          rect,
          gridSize.cols,
          gridSize.rows
        );
        placeOnGrid(draggedId, col, row);
      } else if (placements[draggedId]) {
        const { col, row } = placements[draggedId];
        placeOnGrid(draggedId, col, row);
      }

      setDraggedId(null);
    },
    [draggedId, placements, placeOnGrid]
  );

  const handleMouseMove = useCallback(
    (e) => {
      if (!draggedId) return;

      if (
        placements[draggedId] &&
        isOverElement(e.clientX, e.clientY, gridContainerRef.current)
      ) {
        const rect = gridContainerRef.current.getBoundingClientRect();
        const { col, row } = getGridCoords(
          e.clientX,
          e.clientY,
          rect,
          gridSize.cols,
          gridSize.rows
        );
        const placement = placements[draggedId];
        const item = PANEL_ITEMS.find((i) => i.id === placement.templateId);
        if (item) {
          const { col: c, row: r } = clampCell(
            item,
            col,
            row,
            gridSize.cols,
            gridSize.rows
          );
          setPlacements((prev) => {
            if (wouldOverlapPlacements(prev, draggedId, c, r, item.cols, item.rows)) return prev;
            return { ...prev, [draggedId]: { ...placement, col: c, row: r } };
          });
        }
      }
    },
    [draggedId, placements, gridSize.cols, gridSize.rows]
  );

  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [handleMouseUp, handleMouseMove]);

  const itemsOnGrid = Object.entries(placements)
    .map(([instanceId, p]) => {
      const template = PANEL_ITEMS.find((t) => t.id === p.templateId);
      return template ? { instanceId, ...template, col: p.col, row: p.row } : null;
    })
    .filter(Boolean);

  // User panel is always on the grid and not in the panel; other widgets are draggable from the panel
  const selectedCategoryDef = selectedCategory ? WIDGET_CATEGORIES.find((c) => c.id === selectedCategory) : null;
  const panelItemsToShow = selectedCategoryDef
    ? PANEL_ITEMS.filter((item) => selectedCategoryDef.templateIds.includes(item.id))
    : [];

  // On /profile (staticView) always show profile mode; Edit/Profile toggle only applies in builder
  const effectiveEditMode = staticView ? false : editMode;

  if (staticView && !effectiveAddress) {
    return (
      <div
        className="profile-builder-page"
        style={{
          width: '100%',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#1a1a1a',
          color: '#e5e7eb',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          padding: 24,
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <p style={{ marginBottom: 12 }}>Connect your wallet to view your profile, or use a profile link.</p>
          <a href="/" style={{ color: '#16a34a', textDecoration: 'underline' }}>← Back home</a>
        </div>
      </div>
    );
  }

  return (
    <div
      className="profile-builder-page"
      style={{
        width: '100%',
        height: '100vh',
        minHeight: '100vh',
        boxSizing: 'border-box',
        margin: 0,
        padding: 0,
        ...(staticView && { paddingLeft: 24, paddingRight: 24 }),
        display: 'flex',
        flexDirection: 'row',
        gap: 0,
        alignItems: 'stretch',
        background: '#1a1a1a',
        color: '#e5e7eb',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <div
        ref={gridAreaRef}
        style={{
          flex: 1,
          minWidth: 0,
          minHeight: 0,
          display: 'flex',
          alignItems: 'stretch',
          justifyContent: 'stretch',
          position: 'relative',
        }}
      >
        <div
          ref={gridContainerRef}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            padding: PADDING,
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: '100%',
              display: effectiveEditMode ? 'grid' : 'block',
              gridTemplateColumns: effectiveEditMode ? `repeat(${gridSize.cols}, 1fr)` : undefined,
              gridTemplateRows: effectiveEditMode ? `repeat(${gridSize.rows}, 1fr)` : undefined,
              overflow: 'hidden',
              background: effectiveEditMode ? '#0f0f0f' : '#1a1a1a',
            }}
          >
            {effectiveEditMode && Array.from({ length: gridSize.cols * gridSize.rows }, (_, i) => (
              <div
                key={i}
                className="profile-builder-cell"
                style={{
                  border: '1px solid rgba(60,60,60,0.8)',
                  background:
                    'radial-gradient(circle at 20% 20%, rgba(50,50,50,0.4), rgba(20,20,20,0.95))',
                }}
              />
            ))}
          </div>

          {itemsOnGrid.map((item) => {
            const x = PADDING + item.col * cellWidthPx;
            const y = PADDING + item.row * cellHeightPx;
            const w = item.cols * cellWidthPx;
            const h = item.rows * cellHeightPx;
            const isProfileBlock = item.type === 'rectangle';
            const nftImage = profileBlockNftImages[item.instanceId];
            const isImageWidget = item.type === 'square-small' || item.type === 'image-3x5' || item.type === 'image-8x5' || item.type === 'image-12x10';
            const imageWidgetUrl = imageWidgetImages[item.instanceId];
            const outlineCfg = widgetOutline[item.instanceId];
            const hasOutline = (outlineCfg && outlineCfg.enabled) || isProfileBlock;
            const outlineShape = isProfileBlock ? 'square' : (outlineCfg?.shape === 'square' ? 'square' : 'rounded');
            const baseRadius = isProfileBlock ? 0 : '0.375rem';
            return (
              <div
                key={item.instanceId}
                className="profile-builder-grid-item"
                data-type={item.type}
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  width: w,
                  height: h,
                  transform: `translate(${x}px, ${y}px)`,
                  cursor: !effectiveEditMode ? 'default' : 'grab',
                  userSelect: 'none',
                  pointerEvents: 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: outlineShape === 'square' ? 0 : baseRadius,
                  boxSizing: 'border-box',
                  overflow: 'hidden',
                  border: hasOutline ? '2px solid #fff' : undefined,
                  ...(item.type === 'rectangle' && {
                    background: '#1a1a1a',
                    color: '#e5e5e5',
                    fontWeight: 500,
                    fontSize: '0.7rem',
                    flexDirection: 'column',
                    alignItems: 'stretch',
                  }),
                  ...(isImageWidget && {
                    borderRadius:
                      (imageWidgetOptions[item.instanceId]?.corners === 'square' || outlineShape === 'square')
                        ? 0
                        : '0.375rem',
                  }),
                  ...((item.type === 'square-small' || item.type === 'image-3x5' || item.type === 'image-8x5' || item.type === 'image-12x10') && {
                    background: '#374151',
                  }),
                  ...(item.type === 'square-large' && {
                    background: '#4b5563',
                  }),
                  ...(item.type === 'textbox' && {
                    background: '#1a1a1a',
                  }),
                  ...((item.type === 'kodacams' || item.type === 'bops' || item.type === 'stats' || item.type === 'badges') && {
                    background: '#1a1a1a',
                  }),
                }}
                onMouseDown={(e) => {
                  if (!effectiveEditMode) return;
                  if (item.type === 'textbox' && e.target.closest('textarea')) return;
                  e.preventDefault();
                  setDraggedId(item.instanceId);
                  setSelectedWidgetInstanceId(item.instanceId);
                  if (isImageWidget) setSelectedImageInstanceId(item.instanceId);
                }}
              >
                {effectiveEditMode && !isProfileBlock && (
                  <button
                    type="button"
                    title="Remove from grid"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      returnToPanel(item.instanceId);
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    style={{
                      position: 'absolute',
                      top: 4,
                      left: 4,
                      zIndex: 10,
                      width: 24,
                      height: 24,
                      borderRadius: 4,
                      border: '1px solid rgba(255,255,255,0.4)',
                      background: 'rgba(0,0,0,0.7)',
                      color: '#fff',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      lineHeight: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    ×
                  </button>
                )}
                {isProfileBlock ? (
                  <>
                    {/* Top: square photo area */}
                    <div
                      style={{
                        width: '100%',
                        flex: '0 0 auto',
                        aspectRatio: '1',
                        maxHeight: w,
                        position: 'relative',
                        background: nftImage ? undefined : 'rgba(239,68,68,0.4)',
                        borderRadius: 0,
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {nftImage ? (
                        <img
                          src={nftImage}
                          alt="Profile"
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            pointerEvents: 'none',
                          }}
                        />
                      ) : (
                        <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.6)' }}>Add photo</span>
                      )}
                      {effectiveEditMode && (
                        <>
                          {address ? (
                            <button
                              type="button"
                              title="Choose NFT from wallet"
                              onClick={(e) => {
                                e.stopPropagation();
                                setNftSelectorTarget('profile');
                                setNftSelectorForInstance(item.instanceId);
                                setNftSelectorOpen(true);
                              }}
                              onMouseDown={(e) => e.stopPropagation()}
                              style={{
                                position: 'absolute',
                                top: 4,
                                right: 4,
                                zIndex: 2,
                                padding: '2px 6px',
                                borderRadius: 4,
                                border: '1px solid rgba(255,255,255,0.4)',
                                background: 'rgba(0,0,0,0.6)',
                                color: '#fff',
                                cursor: 'pointer',
                                fontSize: '0.6rem',
                                fontWeight: 600,
                              }}
                            >
                              NFT
                            </button>
                          ) : (
                            <div style={{ position: 'absolute', top: 4, right: 4, zIndex: 2 }} onMouseDown={(e) => e.stopPropagation()}>
                              <ConnectButton.Custom>
                                {({ openConnectModal }) => (
                                  <button
                                    type="button"
                                    title="Connect wallet to choose NFT"
                                    onClick={(e) => { e.stopPropagation(); openConnectModal?.(); }}
                                    style={{
                                      padding: '2px 6px',
                                      borderRadius: 4,
                                      border: '1px solid rgba(255,255,255,0.4)',
                                      background: 'rgba(0,0,0,0.6)',
                                      color: '#fff',
                                      cursor: 'pointer',
                                      fontSize: '0.6rem',
                                      fontWeight: 600,
                                    }}
                                  >
                                    Connect
                                  </button>
                                )}
                              </ConnectButton.Custom>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    {/* Below: username and X username from Supabase profiles */}
                    <div
                      style={{
                        flex: '1 1 auto',
                        minHeight: 0,
                        padding: '6px 8px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        gap: 2,
                      }}
                    >
                      <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {profile.username || 'No username'}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {profile.xUsername ? `@${String(profile.xUsername).replace(/^@/, '')}` : 'No X linked'}
                      </div>
                    </div>
                  </>
                ) : isImageWidget ? (
                  (() => {
                    const opts = imageWidgetOptions[item.instanceId] || {};
                    const corners = opts.corners !== 'square' ? 'rounded' : 'square';
                    return (
                  <div
                    style={{
                      position: 'relative',
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      borderRadius: corners === 'square' ? 0 : '0.375rem',
                      boxSizing: 'border-box',
                    }}
                  >
                    {imageWidgetUrl ? (
                      <img
                        src={imageWidgetUrl}
                        alt={item.label || 'Image'}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          pointerEvents: 'none',
                        }}
                      />
                    ) : (
                      <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.85)', textAlign: 'center', padding: 10 }}>
                        {item.label || ''}
                      </div>
                    )}

                    {effectiveEditMode && (
                      <div
                        style={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          zIndex: 2,
                          display: 'flex',
                          gap: 6,
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        {address ? (
                          <button
                            type="button"
                            title="Choose NFT from wallet"
                            onClick={(e) => {
                              e.stopPropagation();
                              setNftSelectorTarget('imageWidget');
                              setNftSelectorForInstance(item.instanceId);
                              setNftSelectorOpen(true);
                            }}
                            style={{
                              padding: '4px 8px',
                              borderRadius: 4,
                              border: '1px solid rgba(255,255,255,0.35)',
                              background: 'rgba(0,0,0,0.55)',
                              color: '#fff',
                              cursor: 'pointer',
                              fontSize: '0.65rem',
                              fontWeight: 700,
                            }}
                          >
                            NFT
                          </button>
                        ) : (
                          <ConnectButton.Custom>
                            {({ openConnectModal }) => (
                              <button
                                type="button"
                                title="Connect wallet to choose NFT"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openConnectModal?.();
                                }}
                                style={{
                                  padding: '4px 8px',
                                  borderRadius: 4,
                                  border: '1px solid rgba(255,255,255,0.35)',
                                  background: 'rgba(0,0,0,0.55)',
                                  color: '#fff',
                                  cursor: 'pointer',
                                  fontSize: '0.65rem',
                                  fontWeight: 700,
                                }}
                              >
                                Connect
                              </button>
                            )}
                          </ConnectButton.Custom>
                        )}
                        <button
                          type="button"
                          title="Upload image"
                          onClick={(e) => {
                            e.stopPropagation();
                            startUploadFor(item.instanceId);
                          }}
                          style={{
                            padding: '4px 8px',
                            borderRadius: 4,
                            border: '1px solid rgba(255,255,255,0.35)',
                            background: 'rgba(0,0,0,0.55)',
                            color: '#fff',
                            cursor: 'pointer',
                            fontSize: '0.65rem',
                            fontWeight: 700,
                          }}
                        >
                          Upload
                        </button>
                      </div>
                    )}
                  </div>
                    );
                  })()
                ) : item.type === 'textbox' ? (
                  <TextBoxContent
                    editMode={effectiveEditMode}
                    instanceId={item.instanceId}
                    value={textWidgetText[item.instanceId] ?? ''}
                    onValueChange={(v) => setTextWidgetText((prev) => ({ ...prev, [item.instanceId]: v }))}
                    maxChars={item.maxChars}
                    onFocusInstance={(id) => setSelectedWidgetInstanceId(id)}
                  />
                ) : (
                  item.label || ''
                )}
              </div>
            );
          })}
          </div>
        </div>

      {!staticView && (
      <aside style={{
          width: panelOpen ? 260 : 48,
          minWidth: panelOpen ? 260 : 48,
          height: '100vh',
          background: '#282828',
          borderRadius: 0,
          flexShrink: 0,
          overflow: 'hidden',
          position: 'relative',
          transition: 'width 0.2s ease, min-width 0.2s ease',
        }}>
        {/* Gradient on left edge of panel (same as left sidebar) */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 8,
            background: 'linear-gradient(180deg, #2a2a2a 0%, #1e1e1e 50%, #151515 100%)',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />
        <button
          type="button"
          onClick={() => setPanelOpen((v) => !v)}
          style={{
            position: 'absolute',
            top: 10,
            left: 10,
            zIndex: 10,
            padding: '6px 10px',
            borderRadius: 6,
            border: '1px solid rgba(255,255,255,0.2)',
            background: 'rgba(255,255,255,0.12)',
            color: 'rgba(255,255,255,0.95)',
            cursor: 'pointer',
            fontSize: '0.8rem',
            lineHeight: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title={panelOpen ? 'Collapse panel' : 'Expand panel'}
        >
          {panelOpen ? '←' : '→'}
        </button>
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            padding: '3.25rem 1rem 1rem 1rem',
            height: '100%',
            overflowY: 'auto',
            overflowX: 'hidden',
            boxSizing: 'border-box',
            visibility: panelOpen ? 'visible' : 'hidden',
            opacity: panelOpen ? 1 : 0,
            transition: 'opacity 0.15s ease',
            pointerEvents: panelOpen ? 'auto' : 'none',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <h2
            style={{
              fontSize: '1.1rem',
              fontWeight: 700,
              margin: '0 0 1rem 0',
              letterSpacing: '0.02em',
              color: '#fff',
            }}
          >
            Profile Page Widgets
          </h2>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              paddingTop: 16,
              paddingBottom: 16,
              borderBottom: '1px solid rgba(0,0,0,0.3)',
              flexWrap: 'wrap',
            }}
          >
            <button
              type="button"
              title="Show grid and edit widgets"
              onClick={() => setEditMode(true)}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                border: '1px solid rgba(255,255,255,0.3)',
                background: editMode ? '#16a34a' : 'rgba(255,255,255,0.1)',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 500,
              }}
            >
              Edit Mode
            </button>
            <button
              type="button"
              title="Preview how your profile will look when others view it"
              onClick={() => setEditMode(false)}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                border: '1px solid rgba(255,255,255,0.3)',
                background: !editMode ? '#16a34a' : 'rgba(255,255,255,0.1)',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 500,
              }}
            >
              Profile Mode
            </button>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: 8,
              paddingTop: 16,
              paddingBottom: 16,
              borderBottom: '1px solid rgba(0,0,0,0.3)',
            }}
          >
            {WIDGET_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                style={{
                  width: '100%',
                  minHeight: 44,
                  padding: '8px 6px',
                  borderRadius: 6,
                  border: '1px solid rgba(255,255,255,0.25)',
                  background: selectedCategory === cat.id ? '#16a34a' : 'rgba(255,255,255,0.1)',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  textAlign: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxSizing: 'border-box',
                  lineHeight: 1.2,
                  wordBreak: 'break-word',
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>
          {selectedCategory && (
            <>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  paddingTop: 16,
                  paddingBottom: 16,
                  flexShrink: 0,
                }}
              >
                <p
                  style={{
                    fontSize: '0.8rem',
                    color: 'rgba(255,255,255,0.7)',
                    marginTop: 0,
                    marginBottom: 8,
                  }}
                >
                  Drag/drop onto the grid
                </p>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    flexShrink: 0,
                  }}
                >
                {panelItemsToShow.map((item) => (
              <div
                key={item.id}
                className="profile-builder-panel-item"
                data-type={item.type}
                style={{
                cursor: editMode ? 'grab' : 'default',
                userSelect: 'none',
                flexShrink: 0,
                width: '100%',
                  height: 28,
                  borderRadius: 6,
                  background: 'linear-gradient(180deg, #3a3a3a 0%, #2a2a2a 50%, #222 100%)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: 'rgba(255,255,255,0.95)',
                  fontWeight: 500,
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  padding: '0 10px',
                  boxShadow: '0 1px 0 rgba(255,255,255,0.06)',
                }}
              onMouseDown={(e) => {
                if (!editMode) return;
                e.preventDefault();
                setDraggedId(`new:${item.id}`);
              }}
              >
                {item.label || ''}
              </div>
            ))}
                </div>
              </div>
              {selectedCategory === 'images' && (
                <>
                  <div style={{ borderTop: '1px solid rgba(0,0,0,0.3)' }} />
                  <div style={{ paddingTop: 16, paddingBottom: 16, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', marginTop: 0, marginBottom: 6 }}>
                      Image options (focus an image on the grid first):
                    </p>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
                      <button
                        type="button"
                        title="Rounded corners"
                        onClick={() => {
                          if (!selectedImageInstanceId) return;
                          setImageWidgetOptions((prev) => ({
                            ...prev,
                            [selectedImageInstanceId]: {
                              ...(prev[selectedImageInstanceId] || { corners: 'rounded', border: false }),
                              corners: 'rounded',
                            },
                          }));
                        }}
                        style={{
                          ...sidePanelFormatBtnStyle,
                          background: (imageWidgetOptions[selectedImageInstanceId]?.corners !== 'square') ? 'rgba(255,255,255,0.2)' : sidePanelFormatBtnStyle.background,
                        }}
                      >
                        Rounded
                      </button>
                      <button
                        type="button"
                        title="Square corners"
                        onClick={() => {
                          if (!selectedImageInstanceId) return;
                          setImageWidgetOptions((prev) => ({
                            ...prev,
                            [selectedImageInstanceId]: {
                              ...(prev[selectedImageInstanceId] || { corners: 'rounded', border: false }),
                              corners: 'square',
                            },
                          }));
                        }}
                        style={{
                          ...sidePanelFormatBtnStyle,
                          background: imageWidgetOptions[selectedImageInstanceId]?.corners === 'square' ? 'rgba(255,255,255,0.2)' : sidePanelFormatBtnStyle.background,
                        }}
                      >
                        Square
                      </button>
                      <button
                        type="button"
                        title="Rounded outline"
                        onClick={() => {
                          if (!selectedImageInstanceId) return;
                          setWidgetOutline((prev) => ({
                            ...prev,
                            [selectedImageInstanceId]: { enabled: true, shape: 'rounded' },
                          }));
                        }}
                        style={{
                          ...sidePanelFormatBtnStyle,
                          background: widgetOutline[selectedImageInstanceId]?.enabled && widgetOutline[selectedImageInstanceId]?.shape !== 'square' ? 'rgba(255,255,255,0.2)' : sidePanelFormatBtnStyle.background,
                          border: widgetOutline[selectedImageInstanceId]?.enabled && widgetOutline[selectedImageInstanceId]?.shape !== 'square' ? '1px solid rgba(255,255,255,0.5)' : sidePanelFormatBtnStyle.border,
                        }}
                      >
                        Outline (R)
                      </button>
                      <button
                        type="button"
                        title="Square outline"
                        onClick={() => {
                          if (!selectedImageInstanceId) return;
                          setWidgetOutline((prev) => ({
                            ...prev,
                            [selectedImageInstanceId]: { enabled: true, shape: 'square' },
                          }));
                        }}
                        style={{
                          ...sidePanelFormatBtnStyle,
                          background: widgetOutline[selectedImageInstanceId]?.enabled && widgetOutline[selectedImageInstanceId]?.shape === 'square' ? 'rgba(255,255,255,0.2)' : sidePanelFormatBtnStyle.background,
                          border: widgetOutline[selectedImageInstanceId]?.enabled && widgetOutline[selectedImageInstanceId]?.shape === 'square' ? '1px solid rgba(255,255,255,0.5)' : sidePanelFormatBtnStyle.border,
                        }}
                      >
                        Outline (S)
                      </button>
                      <button
                        type="button"
                        title="Remove outline"
                        onClick={() => {
                          if (!selectedImageInstanceId) return;
                          setWidgetOutline((prev) => ({
                            ...prev,
                            [selectedImageInstanceId]: { ...(prev[selectedImageInstanceId] || { shape: 'rounded' }), enabled: false },
                          }));
                        }}
                        style={{
                          ...sidePanelFormatBtnStyle,
                          background: widgetOutline[selectedImageInstanceId]?.enabled === false ? 'rgba(255,255,255,0.2)' : sidePanelFormatBtnStyle.background,
                        }}
                      >
                        No outline
                      </button>
                    </div>
                  </div>
                </>
              )}
              {selectedCategory === 'textboxes' && (
                <>
                  <div style={{ borderTop: '1px solid rgba(0,0,0,0.3)' }} />
                  <div style={{ paddingTop: 16, paddingBottom: 16, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', marginTop: 0, marginBottom: 6 }}>
                      Format text (focus a text box on the grid first):
                    </p>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
                    <button type="button" title="Bold" onClick={() => { document.execCommand('bold', false, null); syncFocusedTextBoxFromPanel(); }} style={sidePanelFormatBtnStyle}>B</button>
                    <button type="button" title="Italic" onClick={() => { document.execCommand('italic', false, null); syncFocusedTextBoxFromPanel(); }} style={{ ...sidePanelFormatBtnStyle, fontStyle: 'italic' }}>I</button>
                    <button type="button" title="Underline" onClick={() => { document.execCommand('underline', false, null); syncFocusedTextBoxFromPanel(); }} style={{ ...sidePanelFormatBtnStyle, textDecoration: 'underline' }}>U</button>
                    <button type="button" title="Bullet list" onClick={() => { document.execCommand('insertUnorderedList', false, null); syncFocusedTextBoxFromPanel(); }} style={sidePanelFormatBtnStyle}>•</button>
                    <button type="button" title="Numbered list" onClick={() => { document.execCommand('insertOrderedList', false, null); syncFocusedTextBoxFromPanel(); }} style={sidePanelFormatBtnStyle}>1.</button>
                    </div>
                    <div style={{ height: 10 }} />
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
                      <button
                        type="button"
                        title="Rounded outline"
                        onClick={() => {
                          if (!selectedWidgetInstanceId) return;
                          setWidgetOutline((prev) => ({
                            ...prev,
                            [selectedWidgetInstanceId]: { enabled: true, shape: 'rounded' },
                          }));
                        }}
                        style={{
                          ...sidePanelFormatBtnStyle,
                          background: widgetOutline[selectedWidgetInstanceId]?.enabled && widgetOutline[selectedWidgetInstanceId]?.shape !== 'square' ? 'rgba(255,255,255,0.2)' : sidePanelFormatBtnStyle.background,
                          border: widgetOutline[selectedWidgetInstanceId]?.enabled && widgetOutline[selectedWidgetInstanceId]?.shape !== 'square' ? '1px solid rgba(255,255,255,0.5)' : sidePanelFormatBtnStyle.border,
                        }}
                      >
                        Outline (R)
                      </button>
                      <button
                        type="button"
                        title="Square outline"
                        onClick={() => {
                          if (!selectedWidgetInstanceId) return;
                          setWidgetOutline((prev) => ({
                            ...prev,
                            [selectedWidgetInstanceId]: { enabled: true, shape: 'square' },
                          }));
                        }}
                        style={{
                          ...sidePanelFormatBtnStyle,
                          background: widgetOutline[selectedWidgetInstanceId]?.enabled && widgetOutline[selectedWidgetInstanceId]?.shape === 'square' ? 'rgba(255,255,255,0.2)' : sidePanelFormatBtnStyle.background,
                          border: widgetOutline[selectedWidgetInstanceId]?.enabled && widgetOutline[selectedWidgetInstanceId]?.shape === 'square' ? '1px solid rgba(255,255,255,0.5)' : sidePanelFormatBtnStyle.border,
                        }}
                      >
                        Outline (S)
                      </button>
                      <button
                        type="button"
                        title="Remove outline"
                        onClick={() => {
                          if (!selectedWidgetInstanceId) return;
                          setWidgetOutline((prev) => ({
                            ...prev,
                            [selectedWidgetInstanceId]: { ...(prev[selectedWidgetInstanceId] || { shape: 'rounded' }), enabled: false },
                          }));
                        }}
                        style={{
                          ...sidePanelFormatBtnStyle,
                          background: widgetOutline[selectedWidgetInstanceId]?.enabled === false ? 'rgba(255,255,255,0.2)' : sidePanelFormatBtnStyle.background,
                        }}
                      >
                        No outline
                      </button>
                    </div>
                  </div>
                </>
              )}
              {(selectedCategory === 'kodacams' || selectedCategory === 'bops' || selectedCategory === 'stats' || selectedCategory === 'badges') && (
                <>
                  <div style={{ borderTop: '1px solid rgba(0,0,0,0.3)' }} />
                  <div style={{ paddingTop: 16, paddingBottom: 16, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', marginTop: 0, marginBottom: 6 }}>
                      Widget options (focus a widget on the grid first):
                    </p>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
                      <button
                        type="button"
                        title="Rounded outline"
                        onClick={() => {
                          if (!selectedWidgetInstanceId) return;
                          setWidgetOutline((prev) => ({
                            ...prev,
                            [selectedWidgetInstanceId]: { enabled: true, shape: 'rounded' },
                          }));
                        }}
                        style={{
                          ...sidePanelFormatBtnStyle,
                          background: widgetOutline[selectedWidgetInstanceId]?.enabled && widgetOutline[selectedWidgetInstanceId]?.shape !== 'square' ? 'rgba(255,255,255,0.2)' : sidePanelFormatBtnStyle.background,
                          border: widgetOutline[selectedWidgetInstanceId]?.enabled && widgetOutline[selectedWidgetInstanceId]?.shape !== 'square' ? '1px solid rgba(255,255,255,0.5)' : sidePanelFormatBtnStyle.border,
                        }}
                      >
                        Outline (R)
                      </button>
                      <button
                        type="button"
                        title="Square outline"
                        onClick={() => {
                          if (!selectedWidgetInstanceId) return;
                          setWidgetOutline((prev) => ({
                            ...prev,
                            [selectedWidgetInstanceId]: { enabled: true, shape: 'square' },
                          }));
                        }}
                        style={{
                          ...sidePanelFormatBtnStyle,
                          background: widgetOutline[selectedWidgetInstanceId]?.enabled && widgetOutline[selectedWidgetInstanceId]?.shape === 'square' ? 'rgba(255,255,255,0.2)' : sidePanelFormatBtnStyle.background,
                          border: widgetOutline[selectedWidgetInstanceId]?.enabled && widgetOutline[selectedWidgetInstanceId]?.shape === 'square' ? '1px solid rgba(255,255,255,0.5)' : sidePanelFormatBtnStyle.border,
                        }}
                      >
                        Outline (S)
                      </button>
                      <button
                        type="button"
                        title="Remove outline"
                        onClick={() => {
                          if (!selectedWidgetInstanceId) return;
                          setWidgetOutline((prev) => ({
                            ...prev,
                            [selectedWidgetInstanceId]: { ...(prev[selectedWidgetInstanceId] || { shape: 'rounded' }), enabled: false },
                          }));
                        }}
                        style={{
                          ...sidePanelFormatBtnStyle,
                          background: widgetOutline[selectedWidgetInstanceId]?.enabled === false ? 'rgba(255,255,255,0.2)' : sidePanelFormatBtnStyle.background,
                        }}
                      >
                        No outline
                      </button>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
          <div
            style={{
              display: 'flex',
              gap: 10,
              justifyContent: 'space-between',
              marginTop: 'auto',
              paddingTop: 8,
            }}
          >
            <button
              type="button"
              onClick={() => navigate('/profile')}
              style={{
                flex: 1,
                maxWidth: '48%',
                padding: '10px 16px',
                borderRadius: 6,
                border: 'none',
                background: '#dc2626',
                color: '#fff',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveLayout}
              disabled={saveStatus === 'saving' || !address}
              style={{
                flex: 1,
                maxWidth: '48%',
                padding: '10px 16px',
                borderRadius: 6,
                border: 'none',
                background: saveStatus === 'success' ? '#15803d' : saveStatus === 'error' ? '#b91c1c' : '#16a34a',
                color: '#fff',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: saveStatus === 'saving' || !address ? 'not-allowed' : 'pointer',
                opacity: saveStatus === 'saving' || !address ? 0.8 : 1,
              }}
            >
              {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'success' ? 'Saved' : saveStatus === 'error' ? 'Error' : 'Save'}
            </button>
          </div>
        </div>
      </aside>
      )}

      {nftSelectorOpen && address && nftSelectorForInstance && (
        <NFTSelector
          ownerAddress={address}
          apiKeyEth={getAlchemyApiKey(import.meta.env.VITE_ALCHEMY_API_KEY_ETH || import.meta.env.VITE_ALCHEMY_API_KEY)}
          apiKeyApechain={getAlchemyApiKey(import.meta.env.VITE_ALCHEMY_API_KEY_APECHAIN || import.meta.env.VITE_ALCHEMY_API_KEY)}
          onSelect={(imageUrl) => {
            if (nftSelectorTarget === 'imageWidget') {
              setImageWidgetImages((prev) => ({ ...prev, [nftSelectorForInstance]: imageUrl }));
            } else {
              setProfileBlockNftImages((prev) => ({ ...prev, [nftSelectorForInstance]: imageUrl }));
            }
            setNftSelectorOpen(false);
            setNftSelectorForInstance(null);
          }}
          onClose={() => {
            setNftSelectorOpen(false);
            setNftSelectorForInstance(null);
          }}
        />
      )}

      <input
        ref={uploadInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={onUploadFileChange}
      />
    </div>
  );
}
