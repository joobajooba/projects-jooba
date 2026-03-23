import { useState, useCallback } from 'react';
import {
  Home,
  Users,
  FolderKanban,
  Building2,
  Gamepad2,
  Coins,
  User,
  CreditCard,
} from 'lucide-react';
import { DiscordLogo, XLogo } from '@phosphor-icons/react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import ProfileGrid from './components/ProfileGrid';
import CommunityPage from './pages/CommunityPage';
import GamesPage from './pages/GamesPage';
import ProjectsPage from './pages/ProjectsPage';
import MintPage from './pages/MintPage';
import TeamPage from './pages/TeamPage';
import { startXAuth } from './lib/xAuth';

function SidebarActions() {
  const [showDiscordModal, setShowDiscordModal] = useState(false);

  return (
    <>
      <ConnectButton.Custom>
        {({ account, openConnectModal, openAccountModal }) => {
          const handleConnectX = () => {
            if (account?.address) {
              startXAuth(account.address);
            } else {
              openConnectModal?.();
            }
          };
          const handleOpenDiscord = () => {
            setShowDiscordModal(true);
          };
          return (
            <div className="flex gap-1 w-full">
              <button
                type="button"
                onClick={account ? openAccountModal : openConnectModal}
                className="flex-1 aspect-square flex items-center justify-center rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 hover:text-gray-100"
                aria-label={account ? 'Account' : 'Connect wallet'}
              >
                <CreditCard className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={handleConnectX}
                className="flex-1 aspect-square flex items-center justify-center rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 hover:text-gray-100"
                aria-label="Connect X (Twitter)"
                title="Connect X profile"
              >
                <XLogo className="w-5 h-5" weight="regular" />
              </button>
              <button
                type="button"
                onClick={handleOpenDiscord}
                className="flex-1 aspect-square flex items-center justify-center rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 hover:text-gray-100"
                aria-label="SOJ Discord invite"
                title="Open SOJ Discord invite"
              >
                <DiscordLogo className="w-5 h-5" weight="regular" />
              </button>
            </div>
          );
        }}
      </ConnectButton.Custom>

      {showDiscordModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          aria-modal="true"
          role="dialog"
          aria-labelledby="soj-discord-modal-title"
          onClick={() => setShowDiscordModal(false)}
        >
          <div
            className="bg-gray-800 border border-gray-600 rounded-lg shadow-xl p-6 max-w-md mx-4 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="soj-discord-modal-title" className="text-lg font-semibold text-gray-100 mb-3">
              SOJ Discord invite
            </h2>
            <p className="text-gray-200 mb-2">
              This link will take you to the SOJ Discord server:
            </p>
            <p className="text-indigo-400 text-sm break-all mb-6">
              https://discord.gg/qhayVsuwjr
            </p>
            <div className="flex gap-3 justify-center">
              <button
                type="button"
                onClick={() => {
                  window.open('https://discord.gg/qhayVsuwjr', '_blank', 'noopener,noreferrer');
                  setShowDiscordModal(false);
                }}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                Accept
              </button>
              <button
                type="button"
                onClick={() => setShowDiscordModal(false)}
                className="px-4 py-2 rounded-lg bg-gray-600 text-gray-100 font-medium hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Decline
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const PLACEHOLDER_PAGES = {
  home: { title: 'Home', description: 'Welcome to Studio. Use the sidebar to open Profile.' },
  community: { title: 'Community', description: 'Community features coming soon.' },
  projects: { title: 'Projects', description: 'Projects overview.' },
  theTeam: { title: 'The Team', description: '' },
  studio: { title: 'Studio', description: '' },
  games: { title: 'Games', description: 'Games hub.' },
  mint: { title: 'Mint', description: 'Mint assets.' },
};

function HomePage() {
  const boxes = [
    { heading: 'Phase 1 | Guitarist', subtitle: 'Bops', imageSrc: '/phase1-guitarist.png' },
    { heading: 'Phase 2 | Bass', subtitle: 'TBC' },
    { heading: 'Phase 3 | Drummer', subtitle: 'TBC' },
    { heading: 'Phase 4 | Vocals', subtitle: 'TBC' },
  ];

  return (
    <div className="flex-1 h-full overflow-y-scroll overflow-x-hidden studio-scrollbar px-6 lg:px-8 py-8 pb-24">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 justify-items-center">
        {boxes.map((box) => (
          <div key={box.heading} className="w-full max-w-[270px] flex flex-col">
            <div
              className={`w-full aspect-[736/1024] rounded-xl overflow-hidden ${
                box.imageSrc ? 'bg-gray-800/60' : 'bg-gray-800/50'
              }`}
            >
              {box.imageSrc ? (
                <img
                  src={box.imageSrc}
                  alt={box.heading}
                  className="w-full h-full object-cover"
                  loading="eager"
                  decoding="sync"
                />
              ) : null}
            </div>
            <div className="mt-3 rounded-lg bg-gray-900/80 px-3 py-2 text-center">
              <p className="text-gray-100 font-semibold leading-tight">{box.heading}</p>
              <p className="text-indigo-300 leading-tight">{box.subtitle}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-14 mx-auto w-full max-w-6xl grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((section) => (
          <div
            key={section}
            className={`h-72 rounded-xl bg-gray-800/50 p-6 text-gray-200 overflow-hidden border ${
              section === 1
                ? 'border-red-400 shadow-[0_0_18px_rgba(248,113,113,0.55),inset_0_0_14px_rgba(248,113,113,0.2)]'
                : section === 2
                  ? 'border-blue-400 shadow-[0_0_18px_rgba(96,165,250,0.55),inset_0_0_14px_rgba(96,165,250,0.2)]'
                  : 'border-green-400 shadow-[0_0_18px_rgba(74,222,128,0.55),inset_0_0_14px_rgba(74,222,128,0.2)]'
            }`}
          >
            {section === 1 ? (
              <>
                <h3 className="text-xl font-bold text-gray-100 mb-3">What is Ape Studio</h3>
                <p className="text-xs leading-5 text-justify">
                  ApeStudio is a music studio built by apes to enable users to create fun music on
                  Apechain using &lt;Band Name&gt; to create your digital on chain band. Sound packs from
                  our nfts enable the use of widget based audio packs to create music.
                </p>
              </>
            ) : section === 2 ? (
              <>
                <h3 className="text-xl font-bold text-gray-100 mb-3">Whats the Plan?</h3>
                <p className="text-xs leading-5 text-justify">
                  This project will roll out in five phases, each introducing a new NFT that evolves
                  the band over time. As the band grows, so will the community, creating a shared and
                  engaging journey.
                </p>
                <p className="mt-3 text-xs leading-5 text-justify">
                  The goal is to build a fun, interactive music studio that supports the growth of the
                  wider ApeChain community. The final phase remains a secret, something exciting for the
                  community to look forward to.
                </p>
              </>
            ) : section === 3 ? (
              <>
                <h3 className="text-xl font-bold text-gray-100 mb-3">The Reasoning</h3>
                <p className="text-xs leading-5 text-justify">
                  I started this as a fun hobby project to deepen my understanding of Web3 while
                  developing my technical skills and creating engaging, original art. Being an Ape and
                  supporting ApeChain projects has been a genuinely enjoyable experience, and it
                  inspired me to build something of my own within the ecosystem. Alongside my friend, I
                  wanted to create a vibrant community centred around a fun and creative concept,
                  something that others could enjoy, engage with, and grow over time.
                </p>
              </>
            ) : null}
          </div>
        ))}
      </div>
      <div className="mt-14 mx-auto w-full max-w-xl space-y-8">
        {[1, 2, 3].map((square) => (
          <div
            key={square}
            className="w-full aspect-square rounded-xl bg-gray-800/50"
          />
        ))}
      </div>
    </div>
  );
}

function PlaceholderPage({ pageKey }) {
  const { title, description } = PLACEHOLDER_PAGES[pageKey] || PLACEHOLDER_PAGES.home;
  return (
    <div className="flex flex-col items-center justify-center flex-1 p-8 text-center">
      <h1 className="text-2xl font-semibold text-gray-100 mb-2">{title}</h1>
      {description ? <p className="text-gray-400">{description}</p> : null}
    </div>
  );
}

export default function App() {
  const [activePage, setActivePage] = useState('home');
  const [profileAvatarUrl, setProfileAvatarUrl] = useState('');
  const [viewProfileWallet, setViewProfileWallet] = useState(null);

  const handleProfileChange = useCallback((data) => {
    if (data?.avatarUrl !== undefined) setProfileAvatarUrl(data.avatarUrl ?? '');
  }, []);

  const navItems = [
    { key: 'home', icon: Home, label: 'Home' },
    { key: 'community', icon: Users, label: 'Community' },
    { key: 'projects', icon: FolderKanban, label: 'Projects' },
    { key: 'theTeam', icon: Users, label: 'The Team' },
    { key: 'studio', icon: Building2, label: 'Studio' },
    { key: 'games', icon: Gamepad2, label: 'Games' },
    { key: 'mint', icon: Coins, label: 'Mint' },
    { key: 'profile', icon: User, label: 'Profile' },
  ];

  return (
    <div className="flex h-screen flex-row min-h-0 overflow-hidden">
      <aside className="w-[10%] min-w-[140px] flex flex-col shrink-0 bg-gray-900/80 border-r border-gray-800 min-h-0">
        <header className="p-4 border-b border-gray-800 shrink-0">
          <div className="flex items-center gap-2 text-indigo-400">
            <div className="w-10 h-10 shrink-0 overflow-hidden rounded-sm">
              <img
                src="/sidebar-logo.png"
                alt="SOJ logo"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex flex-col leading-tight text-right items-end">
              <span className="font-semibold text-gray-100">StudioApe</span>
              <span className="text-xs text-gray-400">ApeChain Communities</span>
            </div>
          </div>
        </header>
        <div className="p-4 flex flex-col items-center gap-3 border-b border-gray-800 shrink-0">
          <SidebarActions />
          <hr className="w-full border-gray-700" />
          <div className="aspect-square w-full rounded-lg overflow-hidden bg-gray-800 border border-gray-700">
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
          <ConnectButton.Custom>
            {({ account, openAccountModal }) =>
              account ? (
                <button
                  type="button"
                  onClick={openAccountModal}
                  className="w-full text-center text-xs text-gray-400 hover:text-gray-300 truncate px-1"
                  title={account.address}
                >
                  {`${account.address.slice(0, 6)}…${account.address.slice(-4)}`}
                </button>
              ) : null
            }
          </ConnectButton.Custom>
        </div>
        <nav className="flex-1 py-2 min-h-0 overflow-auto">
          {navItems.map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setActivePage(key);
                if (key === 'profile') {
                  setViewProfileWallet(null);
                }
              }}
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
        <footer className="p-4 border-t border-gray-800 text-xs text-gray-500 flex items-center gap-2 shrink-0">
          <span>Dark Theme</span>
          <span className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">Studio</span>
        </footer>
      </aside>
      <main className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
        {activePage === 'home' ? (
          <HomePage />
        ) : activePage === 'profile' ? (
          <ProfileGrid onProfileChange={handleProfileChange} viewWallet={viewProfileWallet} />
        ) : activePage === 'community' ? (
          <CommunityPage
            onOpenProfile={(wallet) => {
              setViewProfileWallet(wallet);
              setActivePage('profile');
            }}
          />
        ) : activePage === 'projects' ? (
          <ProjectsPage />
        ) : activePage === 'theTeam' ? (
          <TeamPage />
        ) : activePage === 'games' ? (
          <GamesPage />
        ) : activePage === 'mint' ? (
          <MintPage />
        ) : (
          <PlaceholderPage pageKey={activePage} />
        )}
      </main>
    </div>
  );
}
