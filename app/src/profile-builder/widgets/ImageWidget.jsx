import React, { useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';

async function uploadAvatar(file, ownerWallet) {
  if (!supabase) throw new Error('Supabase not configured');
  const bucket = 'profile-avatars';
  const ext = file.name.split('.').pop() || 'png';
  const path = `${ownerWallet.toLowerCase()}/avatar-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data?.publicUrl || '';
}

export default function ImageWidget({ editMode, variant, ownerWallet, url, onChangeUrl }) {
  const isLarge = variant === 'large';
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState('');

  async function onPickFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr('');
    setUploading(true);
    try {
      const publicUrl = await uploadAvatar(file, ownerWallet);
      onChangeUrl?.(publicUrl);
    } catch (ex) {
      setErr(ex?.message || 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  return (
    <div className="h-full rounded-lg border border-white/10 bg-white/5 p-3 text-white">
      <div className="js-widget-drag-handle mb-2 cursor-move text-xs text-white/60">Profile Image</div>
      <div className={isLarge ? 'h-[calc(100%-40px)]' : 'h-[calc(100%-40px)]'}>
        {url ? (
          <img src={url} alt="" className="h-full w-full rounded-md object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center rounded-md bg-black/30 text-sm text-white/50">
            No image
          </div>
        )}
      </div>
      {editMode && (
        <div className="mt-2">
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onPickFile} />
          <button
            type="button"
            className="rounded-md border border-white/10 bg-black/30 px-3 py-1 text-xs text-white/80 hover:bg-black/40"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? 'Uploading…' : 'Upload image'}
          </button>
          {err && <div className="mt-1 text-xs text-red-300">{err}</div>}
          <div className="mt-1 text-[11px] text-white/40">
            Uses Supabase Storage bucket <code className="text-white/60">profile-avatars</code> (public).
          </div>
        </div>
      )}
    </div>
  );
}

