import { useState, useCallback } from 'react';
import {
  Sparkles,
  Home,
  Users,
  FolderKanban,
  Gamepad2,
  Coins,
  User,
} from 'lucide-react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import ProfileGrid from './components/ProfileGrid';

const PLACEHOLDER_PAGES = {
  home: { title: 'Home', description: 'Welcome to Studio. Use the sidebar to open Profile.' },
  community: { title: 'Community', description: 'Community features coming soon.' },
  projects: { title: 'Projects', description: 'Projects overview.' },
  games: { title: 'Games', description: 'Games hub.' },
  mint: { title: 'Mint', description: 'Mint assets.' },
};

function PlaceholderPage({ pageKey }) {
  const { title, description } = PLACEHOLDER_PAGES[pageKey] || PLACEHOLDER_PAGES.home;
  return (
    <div className="flex flex-col items-center justify-center flex-1 p-8 text-center">
      <h1 className="text-2xl font-semibold text-gray-100 mb-2">{title}</h1>
      <p className="text-gray-400">{description}</p>
    </div>
  );
}

export default function App() {
  const [activePage, setActivePage] = useState('profile');
  const [profileAvatarUrl, setProfileAvatarUrl] = useState('');

  const handleProfileChange = useCallback((data) => {
    if (data?.avatarUrl !== undefined) setProfileAvatarUrl(data.avatarUrl ?? '');
  }, []);

  const navItems = [
    { key: 'home', icon: Home, label: 'Home' },
    { key: 'community', icon: Users, label: 'Community' },
    { key: 'projects', icon: FolderKanban, label: 'Projects' },
    { key: 'games', icon: Gamepad2, label: 'Games' },
    { key: 'mint', icon: Coins, label: 'Mint' },
    { key: 'profile', icon: User, label: 'Profile' },
  ];

  return (
    <div className="flex h-full flex-row">
      <aside className="w-[10%] min-w-[140px] flex flex-col bg-gray-900/80 border-r border-gray-800">
        <header className="p-4 border-b border-gray-800">
          <div className="flex items-center gap-2 text-indigo-400">
            <Sparkles className="w-5 h-5 shrink-0" />
            <div className="flex flex-col leading-tight">
              <span className="font-semibold text-gray-100">Studio</span>
              <span className="text-xs text-gray-400">Profile Builder</span>
            </div>
          </div>
        </header>
        <div className="p-4 flex flex-col items-center gap-3 border-b border-gray-800">
          <div className="aspect-square w-full max-w-[88px] rounded-lg overflow-hidden bg-gray-800 border border-gray-700 shrink-0">
            {profileAvatarUrl ? (
              <img
                src={profileAvatarUrl}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-500">
                <User className="w-8 h-8" />
              </div>
            )}
          </div>
          <div className="w-full flex justify-center">
            <ConnectButton showBalance={false} />
          </div>
        </div>
        <nav className="flex-1 py-2">
          {navItems.map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActivePage(key)}
              className={`w-full flex items-center gap-2 px-4 py-2.5 text-left text-sm transition-colors ${
                activePage === key
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-gray-100'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <footer className="p-4 border-t border-gray-800 text-xs text-gray-500 flex items-center gap-2">
          <span>Dark Theme</span>
          <span className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">Studio</span>
        </footer>
      </aside>
      <main className="flex-1 flex flex-col min-w-0">
        {activePage === 'profile' ? (
          <ProfileGrid onProfileChange={handleProfileChange} />
        ) : (
          <PlaceholderPage pageKey={activePage} />
        )}
      </main>
    </div>
  );
}
