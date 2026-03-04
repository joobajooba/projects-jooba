import React, { useEffect, useState } from 'react';
import { fetchProfileViewsCount } from '../../profileBuilderApi';

export default function StatsWidget({ profileId }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const c = await fetchProfileViewsCount(profileId);
      if (!cancelled) setCount(c);
    })();
    return () => { cancelled = true; };
  }, [profileId]);

  return (
    <div className="h-full rounded-lg border border-white/10 bg-white/5 p-3 text-white">
      <div className="js-widget-drag-handle mb-2 cursor-move text-xs text-white/60">
        Profile Stats
      </div>
      <div className="rounded-md bg-black/30 p-3">
        <div className="text-xs text-white/60">Profile views</div>
        <div className="mt-1 text-2xl font-semibold">{count}</div>
      </div>
    </div>
  );
}

