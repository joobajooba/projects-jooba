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
  {
    id: 'not-a-punks-cult',
    name: 'Not a Punks Cult',
    network: 'Apechain',
    releaseDate: '2025',
    image: '/notapunkscult.png',
    links: [
      { label: 'OpenSea', url: 'https://opensea.io/collection/not-a-punks-cult' },
      { label: 'X', url: 'https://x.com/notapunkscult' },
      { label: 'Discord', url: 'https://discord.gg/jFKwU8KrR4' },
    ],
  },
];

function isComingSoon(project) {
  return (project.releaseDate || '').includes('Coming Soon');
}

export default function ProjectsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showComingSoon, setShowComingSoon] = useState(true);
  const [showReleased, setShowReleased] = useState(true);
  const [filterOpen, setFilterOpen] = useState(false);
  const [linksModalProject, setLinksModalProject] = useState(null);
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
      (isComingSoon(p) && showComingSoon) || (!isComingSoon(p) && showReleased);
    const matchesSearch =
      !searchQuery.trim() ||
      p.name.toLowerCase().includes(searchQuery.trim().toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const filterLabel =
    showComingSoon && showReleased
      ? 'All'
      : [showComingSoon && 'Coming Soon', showReleased && 'Released'].filter(Boolean).join(', ');

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
              <span>{filterLabel}</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${filterOpen ? 'rotate-180' : ''}`} />
            </button>
            {filterOpen && (
              <div
                className="absolute top-full left-0 mt-1 min-w-[180px] py-2 px-2 rounded-lg border border-gray-600 bg-gray-800 shadow-lg z-10"
                role="listbox"
                aria-label="Filter by release status"
              >
                <label className="flex items-center gap-2 px-3 py-2 text-sm text-gray-200 hover:bg-gray-700 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showComingSoon}
                    onChange={(e) => setShowComingSoon(e.target.checked)}
                    className="rounded border-gray-500 bg-gray-700 text-indigo-500 focus:ring-indigo-500"
                  />
                  Coming Soon
                </label>
                <label className="flex items-center gap-2 px-3 py-2 text-sm text-gray-200 hover:bg-gray-700 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showReleased}
                    onChange={(e) => setShowReleased(e.target.checked)}
                    className="rounded border-gray-500 bg-gray-700 text-indigo-500 focus:ring-indigo-500"
                  />
                  Released
                </label>
              </div>
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
                role={project.links ? 'button' : undefined}
                tabIndex={project.links ? 0 : undefined}
                onClick={project.links ? () => setLinksModalProject(project) : undefined}
                onKeyDown={project.links ? (e) => e.key === 'Enter' && setLinksModalProject(project) : undefined}
                className={`flex flex-col sm:flex-row gap-4 p-4 rounded-xl border border-gray-700 bg-gray-800/60 ${project.links ? 'cursor-pointer hover:bg-gray-800/80 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-inset' : ''}`}
              >
                <div className="w-full sm:w-32 h-32 shrink-0 rounded-lg overflow-hidden bg-gray-700">
                  <img
                    src={project.image}
                    alt={project.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex flex-col justify-center gap-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-100">{project.name}</p>
                  <p className="text-sm text-gray-400">Network | {project.network}</p>
                  <p className="text-sm text-amber-400/90">Release Date | {project.releaseDate}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {linksModalProject?.links && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          aria-modal="true"
          role="dialog"
          aria-labelledby="project-links-title"
          onClick={() => setLinksModalProject(null)}
        >
          <div
            className="bg-gray-800 border border-gray-600 rounded-lg shadow-xl p-6 max-w-md mx-4 w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="project-links-title" className="text-lg font-semibold text-gray-100 mb-4">
              {linksModalProject.name}
            </h2>
            <ul className="space-y-3">
              {linksModalProject.links.map(({ label, url }) => (
                <li key={url}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-4 py-2 px-3 rounded-lg bg-gray-700/80 hover:bg-gray-700 text-gray-200 hover:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <span className="font-medium">{label}</span>
                    <span className="text-sm text-indigo-400 truncate max-w-[220px]">{url}</span>
                  </a>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => setLinksModalProject(null)}
              className="mt-4 w-full py-2 rounded-lg bg-gray-600 text-gray-100 font-medium hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
