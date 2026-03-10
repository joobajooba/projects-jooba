import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchNewestProfiles, searchProfilesByUsername } from './userData';

function ProfileCard({ walletAddress, username, profilePictureUrl }) {
  const display = (username || '').trim() || 'No username';
  return (
    <Link
      to={`/profile/${walletAddress}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: 12,
        borderRadius: 10,
        border: '1px solid rgba(255,255,255,0.12)',
        background: 'rgba(255,255,255,0.04)',
        textDecoration: 'none',
        color: 'rgba(255,255,255,0.92)',
      }}
    >
      <div
        style={{
          width: '100%',
          aspectRatio: '1',
          borderRadius: 10,
          overflow: 'hidden',
          background: 'rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {profilePictureUrl ? (
          <img
            src={profilePictureUrl}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <span style={{ fontSize: 22, opacity: 0.7 }}>☺</span>
        )}
      </div>
      <div
        style={{
          fontWeight: 700,
          fontSize: 13,
          textAlign: 'center',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={display}
      >
        {display}
      </div>
    </Link>
  );
}

export default function CommunityPage() {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [newest, setNewest] = useState([]);
  const trimmed = query.trim();

  const showSearch = trimmed.length > 0;
  const title = useMemo(() => (showSearch ? 'Search results' : 'Newest profiles'), [showSearch]);
  const items = showSearch ? searchResults : newest;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await fetchNewestProfiles({ limit: 24 });
      if (cancelled) return;
      setNewest(data);
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!showSearch) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const t = setTimeout(async () => {
      const res = await searchProfilesByUsername(trimmed, { limit: 24 });
      if (cancelled) return;
      setSearchResults(res);
      setSearching(false);
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [trimmed, showSearch]);

  return (
    <div className="app-main-inner">
      <h1>Community</h1>

      <div style={{ maxWidth: 560, marginTop: 12 }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search profiles by username…"
          aria-label="Search profiles by username"
          style={{
            width: '100%',
            padding: '12px 14px',
            borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.18)',
            background: 'rgba(255,255,255,0.06)',
            color: '#fff',
            outline: 'none',
            boxSizing: 'border-box',
            fontSize: 14,
          }}
        />
      </div>

      <div style={{ marginTop: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>{title}</h2>
          {searching && <span style={{ fontSize: 13, opacity: 0.7 }}>Searching…</span>}
        </div>

        {items.length === 0 ? (
          <p style={{ opacity: 0.75, marginTop: 6 }}>
            {showSearch ? 'No profiles found.' : 'No profiles yet.'}
          </p>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
              gap: 12,
              maxWidth: 960,
            }}
          >
            {items.map((p) => (
              <ProfileCard
                key={p.walletAddress}
                walletAddress={p.walletAddress}
                username={p.username}
                profilePictureUrl={p.profilePictureUrl}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

