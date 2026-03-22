import { useState, useCallback } from 'react';
import {
  Sparkles,
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
  return (
    <div className="flex-1 overflow-auto">
      <div className="w-full px-6 lg:px-8 py-10">
        <div className="w-full">
          <h1 className="text-3xl font-semibold text-gray-100 mb-8">J00BA&apos;s ApeChain Sanctuary</h1>

          <div className="grid grid-cols-1 xl:grid-cols-[minmax(320px,0.85fr)_minmax(0,1.15fr)] gap-10 items-stretch">
            <div className="space-y-8 text-gray-300 leading-7">
              <section>
                <h2 className="text-lg font-semibold text-gray-100 mb-2">What:</h2>
                <p className="text-justify">
                  Welcome to J00BA&apos;s ApeChain Sanctuary, a community hub built to help ApeChain
                  communities connect and showcase what they&apos;re creating. Here, users can explore
                  profiles, view NFTs, check out artwork from project members, and see game stats from
                  games featured on the site. It&apos;s designed as a place where projects and individuals
                  can present what they&apos;re building and express their creativity.
                </p>
                <p className="text-justify mt-3">
                  In addition, ApeChain projects will be able to advertise and promote their projects
                  on the site for free, giving teams another way to share updates, highlight releases,
                  and reach members of the wider ecosystem.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-gray-100 mb-2">So What:</h2>
                <p className="text-justify">
                  By bringing these elements together, the goal is to strengthen connections within the
                  ApeChain ecosystem and help highlight smaller or lesser-known projects that people
                  might otherwise miss. Providing a space for free project promotion alongside community
                  content helps new builders gain visibility without needing large marketing budgets.
                  Giving communities a place to display their work, advertise their projects, and engage
                  with others can help those projects gain traction, grow their audiences, and
                  contribute to making ApeChain a more creative and active network.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-gray-100 mb-2">Now What:</h2>
                <p className="text-justify">
                  This site is still in its early stages, and there&apos;s plenty more to build and
                  improve. I also created it as a unique way to showcase my upcoming BOPS project while
                  engaging with others in the ecosystem. With feedback from the community and continued
                  development, the hope is to grow this sanctuary into a more engaging, collaborative
                  space where projects can share updates, promote their work, and connect with new
                  supporters, helping the ApeChain community as a whole continue to thrive.
                </p>
              </section>
            </div>

            <div className="xl:mt-14 h-full">
              <div className="overflow-hidden rounded-2xl border border-gray-700 bg-gray-900/60 shadow-[0_20px_50px_rgba(0,0,0,0.35)] h-full min-h-[520px]">
                <img
                  src="/home-sanctuary-art.png"
                  alt="J00BA's ApeChain Sanctuary artwork"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>

          <div className="mt-16 flex justify-center">
            <img
              src="/bops_timeline.png"
              alt="BOPS project timeline and roadmap"
              className="max-w-full h-auto object-contain"
            />
          </div>
        </div>
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
            <Sparkles className="w-5 h-5 shrink-0" />
            <div className="flex flex-col leading-tight">
              <span className="font-semibold text-gray-100">SOJ</span>
              <span className="text-xs text-gray-400">Apechain Communities</span>
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
