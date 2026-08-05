import { useState } from 'react';

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="page">
      {!sidebarOpen && (
        <button
          type="button"
          className="sidebar-toggle sidebar-toggle--open"
          aria-label="Open sidebar"
          onClick={() => setSidebarOpen(true)}
        >
          Open
        </button>
      )}

      <aside
        className={`sidebar${sidebarOpen ? ' sidebar--open' : ''}`}
        aria-hidden={!sidebarOpen}
      >
        <button
          type="button"
          className="sidebar-toggle sidebar-toggle--close"
          aria-label="Close sidebar"
          onClick={() => setSidebarOpen(false)}
        >
          Open
        </button>
      </aside>
    </div>
  );
}
