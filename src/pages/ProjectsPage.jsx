import { useState } from 'react';
import { Search } from 'lucide-react';

export default function ProjectsPage() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="flex flex-col h-full min-h-0 overflow-auto">
      <div className="p-6">
        <h1 className="text-xl font-semibold text-gray-100 mb-4">Projects</h1>
        <div className="relative max-w-md mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-600 bg-gray-800 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            aria-label="Search projects"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-4 p-4 rounded-xl border border-gray-700 bg-gray-800/60 max-w-2xl">
          <div className="w-full sm:w-40 h-40 shrink-0 rounded-lg overflow-hidden bg-gray-700">
            <img
              src="/bops.png"
              alt="Bops"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex flex-col justify-center gap-1 min-w-0">
            <h2 className="text-lg font-semibold text-gray-100">Bops</h2>
            <p className="text-sm text-gray-400">Apechain</p>
            <p className="text-sm text-amber-400/90">ETA: Coming Soon</p>
          </div>
        </div>
      </div>
    </div>
  );
}
