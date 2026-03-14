import { useState, useEffect, useCallback } from 'react';
import { Search } from 'lucide-react';
import { supabase } from '../lib/supabase';

const LATEST_LIMIT = 24;
const VIEW_MODES = ['small', 'medium', 'large'];

export default function CommunityPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [latestProfiles, setLatestProfiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [latestLoading, setLatestLoading] = useState(true);
  const [viewMode, setViewMode] = useState('medium');

  const fetchLatest = useCallback(async () => {
    if (!supabase) {
      setLatestLoading(false);
      return;
    }
    setLatestLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('owner_wallet, username, avatar_url')
      .order('created_at', { ascending: false })
      .limit(LATEST_LIMIT);
    if (error) {
      console.warn('Latest profiles fetch failed:', error);
      setLatestProfiles([]);
    } else {
      setLatestProfiles(data ?? []);
    }
    setLatestLoading(false);
  }, []);

  useEffect(() => {
    fetchLatest();
  }, [fetchLatest]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    if (!supabase) return;

    const q = searchQuery.trim();
    setLoading(true);

    const run = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('owner_wallet, username, avatar_url')
        .ilike('username', `%${q}%`)
        .order('username');
      if (error) {
        console.warn('Profile search failed:', error);
        setSearchResults([]);
      } else {
        setSearchResults(data ?? []);
      }
      setLoading(false);
    };

    const t = setTimeout(run, 200);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const showSearch = searchQuery.trim().length > 0;
  const list = showSearch ? searchResults : latestProfiles;
  const listLoading = showSearch ? loading : latestLoading;
  const listLabel = showSearch ? 'Search results' : 'Latest profiles';

  const gridClass =
    viewMode === 'small'
      ? 'grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2'
      : viewMode === 'large'
        ? 'grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6'
        : 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4';

  const cardTextClass =
    viewMode === 'small' ? 'text-xs' : viewMode === 'large' ? 'text-base' : 'text-sm';

  const placeholderTextClass =
    viewMode === 'small' ? 'text-xl' : viewMode === 'large' ? 'text-4xl' : 'text-2xl';

  return (
    <div className="flex flex-col h-full min-h-0 overflow-auto">
      <div className="p-6 pb-4">
        <h1 className="text-xl font-semibold text-gray-100 mb-4">Community</h1>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by profile username..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-600 bg-gray-800 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              aria-label="Search profiles by username"
            />
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-gray-600 bg-gray-800 p-1">
            {VIEW_MODES.map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${
                  viewMode === mode
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                }`}
                aria-label={`View mode: ${mode}`}
                aria-pressed={viewMode === mode}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-6 pb-6 flex-1 min-h-0">
        <p className="text-sm text-gray-400 mb-3">{listLabel}</p>
        {listLoading ? (
          <p className="text-gray-500 text-sm">Loading…</p>
        ) : list.length === 0 ? (
          <p className="text-gray-500 text-sm">
            {showSearch ? 'No profiles match that username.' : 'No profiles yet.'}
          </p>
        ) : (
          <div className={gridClass}>
            {list.map((profile) => (
              <div
                key={profile.owner_wallet}
                className="flex flex-col gap-2 rounded-xl bg-gray-800/60 border border-gray-700 hover:border-gray-600 transition-colors overflow-hidden"
              >
                <div className="w-full aspect-square overflow-hidden bg-gray-700">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div
                      className={`w-full h-full flex items-center justify-center text-gray-500 font-medium ${placeholderTextClass}`}
                    >
                      {(profile.username || '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <span
                  className={`font-medium text-gray-200 truncate w-full text-center px-2 pb-2 ${cardTextClass}`}
                >
                  {profile.username || 'Unnamed'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
