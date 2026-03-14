import { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown } from 'lucide-react';

const PROJECTS = [
  {
    id: 'bops',
    name: 'Bops',
    network: 'Apechain',
    releaseDate: 'Coming Soon',
    image: '/bops.png',
  },
];

const FILTER_OPTIONS = [
  { value: 'coming-soon', label: 'Coming Soon' },
  { value: 'released', label: 'Released' },
];

function isComingSoon(project) {
  return (project.releaseDate || '').includes('Coming Soon');
}

export default function ProjectsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('coming-soon');
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef(null);

  useEffect(() => {
    const onOutside = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) setFilterOpen(false);
    };
    if (filterOpen) {
      document.addEventListener('click', onOutside);
      return () => document.removeEventListener('click', onOutside);
    }
  }, [filterOpen]);

  const filteredProjects = PROJECTS.filter((p) => {
    const matchesFilter =
      filter === 'coming-soon' ? isComingSoon(p) : !isComingSoon(p);
    const matchesSearch =
      !searchQuery.trim() ||
      p.name.toLowerCase().includes(searchQuery.trim().toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const currentFilterLabel = FILTER_OPTIONS.find((o) => o.value === filter)?.label ?? 'Filter';

  return (
    <div className="flex flex-col h-full min-h-0 overflow-auto">
      <div className="p-6">
        <h1 className="text-xl font-semibold text-gray-100 mb-4">Projects</h1>
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px] max-w-md">
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
          <div className="relative" ref={filterRef}>
            <button
              type="button"
              onClick={() => setFilterOpen((o) => !o)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-600 bg-gray-800 text-gray-200 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              aria-expanded={filterOpen}
              aria-haspopup="listbox"
            >
              <span>{currentFilterLabel}</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${filterOpen ? 'rotate-180' : ''}`} />
            </button>
            {filterOpen && (
              <ul
                className="absolute top-full left-0 mt-1 min-w-[140px] py-1 rounded-lg border border-gray-600 bg-gray-800 shadow-lg z-10"
                role="listbox"
              >
                {FILTER_OPTIONS.map((opt) => (
                  <li key={opt.value} role="option" aria-selected={filter === opt.value}>
                    <button
                      type="button"
                      onClick={() => { setFilter(opt.value); setFilterOpen(false); }}
                      className={`w-full text-left px-4 py-2 text-sm ${filter === opt.value ? 'bg-indigo-600 text-white' : 'text-gray-200 hover:bg-gray-700'}`}
                    >
                      {opt.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4 max-w-md">
          {filteredProjects.length === 0 ? (
            <p className="text-sm text-gray-500">No projects match the current filter or search.</p>
          ) : (
            filteredProjects.map((project) => (
              <div
                key={project.id}
                className="flex flex-col sm:flex-row gap-4 p-4 rounded-xl border border-gray-700 bg-gray-800/60"
              >
                <div className="w-full sm:w-32 h-32 shrink-0 rounded-lg overflow-hidden bg-gray-700">
                  <img
                    src={project.image}
                    alt={project.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex flex-col justify-center gap-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-100">Project Name | {project.name}</p>
                  <p className="text-sm text-gray-400">Network | {project.network}</p>
                  <p className="text-sm text-amber-400/90">Release Date | {project.releaseDate}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
