import React, { useEffect, useMemo, useState } from 'react';
import { useAccount } from 'wagmi';
import { Link, useNavigate } from 'react-router-dom';
import GridLayoutWrapper from './profile-builder/GridLayoutWrapper';
import WidgetPanel from './profile-builder/WidgetPanel';
import DescriptionWidget from './profile-builder/widgets/DescriptionWidget';
import ImageWidget from './profile-builder/widgets/ImageWidget';
import StatsWidget from './profile-builder/widgets/StatsWidget';
import { ensureProfile, fetchProfileByWallet, updateProfile } from './profileBuilderApi';

function makeId(prefix) {
  return `${prefix}-${Math.random().toString(16).slice(2)}-${Date.now()}`;
}

function defaultLayout(profileId) {
  // 12-col layout, rowHeight 30
  return {
    layout: [
      { i: 'desc-small', x: 0, y: 0, w: 4, h: 6, minW: 3, minH: 4 },
      { i: 'image-small', x: 4, y: 0, w: 4, h: 6, minW: 3, minH: 4 },
      { i: 'stats', x: 8, y: 0, w: 4, h: 4, minW: 3, minH: 3, maxH: 4 },
    ],
    widgets: {
      'desc-small': { type: 'description', variant: 'small' },
      'image-small': { type: 'image', variant: 'small' },
      stats: { type: 'stats', variant: '' },
    },
  };
}

export default function ProfileBuilderPage() {
  const { address } = useAccount();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [layout, setLayout] = useState([]);
  const [widgets, setWidgets] = useState({});
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [panelOpen, setPanelOpen] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!address) {
      setLoading(false);
      setProfile(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      const ensured = await ensureProfile(address);
      const p = ensured ?? (await fetchProfileByWallet(address));
      if (cancelled) return;
      setProfile(p);
      if (!p) {
        setError('Profiles table missing or Supabase error. Run the migration: supabase/migrations/create_profiles_and_views.sql in the Supabase SQL Editor.');
        setLoading(false);
        return;
      }
      const lj = p?.layout_json;
      const parsed = lj && typeof lj === 'object' ? lj : null;
      const init = parsed?.layout && parsed?.widgets ? parsed : defaultLayout(p?.id);
      setLayout(init.layout);
      setWidgets(init.widgets);
      setBio(p?.bio || '');
      setAvatarUrl(p?.avatar_url || '');
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [address]);

  const widgetNodes = useMemo(() => {
    if (!profile) return null;
    return layout.map((l) => {
      const meta = widgets[l.i];
      if (!meta) return null;
      if (meta.type === 'description') {
        return (
          <div key={l.i} data-grid={l}>
            <DescriptionWidget editMode variant={meta.variant} value={bio} onChange={setBio} />
          </div>
        );
      }
      if (meta.type === 'image') {
        return (
          <div key={l.i} data-grid={l}>
            <ImageWidget editMode variant={meta.variant} ownerWallet={profile.owner_wallet} url={avatarUrl} onChangeUrl={setAvatarUrl} />
          </div>
        );
      }
      if (meta.type === 'stats') {
        return (
          <div key={l.i} data-grid={l}>
            <StatsWidget profileId={profile.id} />
          </div>
        );
      }
      return null;
    });
  }, [profile, layout, widgets, bio, avatarUrl]);

  function handleDropWidget({ item, widgetType, widgetVariant }) {
    if (!widgetType) return;
    const id = makeId(widgetType);
    const w = widgetType === 'stats' ? 4 : widgetVariant === 'large' ? 6 : 4;
    const h = widgetType === 'stats' ? 4 : widgetVariant === 'large' ? 10 : 6;
    const newItem = { ...item, i: id, w, h, minW: 3, minH: 4 };
    if (widgetType === 'stats') newItem.maxH = 4;
    setLayout((prev) => [...prev, newItem]);
    setWidgets((prev) => ({ ...prev, [id]: { type: widgetType, variant: widgetVariant || '' } }));
  }

  async function handleSave() {
    if (!address || !profile) return;
    setSaving(true);
    setError('');
    const payload = {
      bio: bio || null,
      avatar_url: avatarUrl || null,
      layout_json: { layout, widgets },
    };
    const res = await updateProfile(address, payload);
    if (!res.ok) setError('Failed to save. Check console for details.');
    setSaving(false);
  }

  if (!address) {
    return (
      <div className="app-main-inner">
        <h1>Profile Builder</h1>
        <p>Connect your wallet to edit your profile layout.</p>
        <Link to="/profile" className="app-profile-back">← Back</Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="app-main-inner">
        <p>Loading builder…</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="app-main-inner">
        <h1 className="m-0 mb-2 text-xl font-semibold text-white">Could not load profile</h1>
        <p className="m-0 mb-3 text-white/80">{error || 'Something went wrong loading your profile.'}</p>
        <p className="m-0 mb-3 text-sm text-white/60">
          In Supabase Dashboard → SQL Editor, run the contents of <code className="rounded bg-white/10 px-1">supabase/migrations/create_profiles_and_views.sql</code> to create the <code className="rounded bg-white/10 px-1">profiles</code> and <code className="rounded bg-white/10 px-1">profile_views</code> tables.
        </p>
        <Link to="/profile" className="inline-block rounded border border-white/20 bg-white/5 px-3 py-2 text-sm text-white/90 no-underline hover:bg-white/10">← Back to profile</Link>
      </div>
    );
  }

  return (
    <div className="app-main-inner">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="m-0 text-xl font-semibold text-white">Edit Profile Page</h1>
          <p className="m-0 text-sm text-white/60">Drag widgets, resize, then save from the widgets panel.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10"
            onClick={() => setPanelOpen((v) => !v)}
          >
            {panelOpen ? 'Hide widgets' : 'Show widgets'}
          </button>
          <button
            type="button"
            className="rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/80 hover:bg-black/30"
            onClick={() => navigate('/profile')}
          >
            Exit edit mode
          </button>
        </div>
      </div>

      {error && <div className="mb-3 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}

      <GridLayoutWrapper
        editMode
        layout={layout}
        onLayoutChange={setLayout}
        onDropWidget={handleDropWidget}
      >
        {widgetNodes}
      </GridLayoutWrapper>

      <WidgetPanel
        open={panelOpen}
        onToggle={() => setPanelOpen((v) => !v)}
        onSave={handleSave}
        saving={saving}
      />
    </div>
  );
}

