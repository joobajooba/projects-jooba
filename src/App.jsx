import { useState } from 'react';

function MenuIcon() {
  return (
    <svg
      className="sidebar-toggle__icon"
      viewBox="0 0 24 24"
      width="22"
      height="22"
      aria-hidden="true"
      focusable="false"
    >
      <rect
        x="3"
        y="3"
        width="18"
        height="18"
        rx="4"
        ry="4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path
        d="M7.5 9h9M7.5 12h9M7.5 15h9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

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
          <MenuIcon />
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
          <MenuIcon />
        </button>
      </aside>
    </div>
  );
}
