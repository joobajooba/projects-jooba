import { useState, useEffect } from 'react';
import { Home, CreditCard, User } from 'lucide-react';
import { DiscordLogo, XLogo } from '@phosphor-icons/react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { startXAuth } from './lib/xAuth';
import ProfileAuthModal from './components/ProfileAuthModal';

function SidebarActions({ onProfileAvatarUrl }) {
  const [showDiscordModal, setShowDiscordModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

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
            <div className="flex flex-wrap gap-1 w-full">
              <button
                type="button"
                onClick={account ? openAccountModal : openConnectModal}
                className="flex-1 min-w-[2.5rem] aspect-square flex items-center justify-center rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 hover:text-gray-100"
                aria-label={account ? 'Account' : 'Connect wallet'}
              >
                <CreditCard className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={handleConnectX}
                className="flex-1 min-w-[2.5rem] aspect-square flex items-center justify-center rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 hover:text-gray-100"
                aria-label="Connect X (Twitter)"
                title="Connect X profile"
              >
                <XLogo className="w-5 h-5" weight="regular" />
              </button>
              <button
                type="button"
                onClick={handleOpenDiscord}
                className="flex-1 min-w-[2.5rem] aspect-square flex items-center justify-center rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 hover:text-gray-100"
                aria-label="SOJ Discord invite"
                title="Open SOJ Discord invite"
              >
                <DiscordLogo className="w-5 h-5" weight="regular" />
              </button>
              <button
                type="button"
                onClick={() => setShowProfileModal(true)}
                className="flex-1 min-w-[2.5rem] aspect-square flex items-center justify-center rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 hover:text-gray-100"
                aria-label="Profile: sign up or log in"
                title="Profile"
              >
                <User className="w-5 h-5" />
              </button>
            </div>
          );
        }}
      </ConnectButton.Custom>

      <ProfileAuthModal
        open={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        onSignupComplete={(payload) => {
          if (payload?.avatarUrl) onProfileAvatarUrl?.(payload.avatarUrl);
        }}
      />

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

export default function App() {
  const [profileAvatarUrl, setProfileAvatarUrl] = useState('');

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('studioape_profile');
      if (!raw) return;
      const p = JSON.parse(raw);
      if (typeof p?.avatarUrl === 'string' && p.avatarUrl) setProfileAvatarUrl(p.avatarUrl);
    } catch {
      /* ignore */
    }
  }, []);

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
            <div className="flex-1 flex flex-col leading-tight text-right">
              <span className="font-semibold text-gray-100 block w-full text-right">StudioApe</span>
            </div>
          </div>
        </header>
        <div className="p-4 flex flex-col items-center gap-3 border-b border-gray-800 shrink-0">
          <SidebarActions onProfileAvatarUrl={setProfileAvatarUrl} />
          {profileAvatarUrl ? (
            <div className="w-full max-w-[5.5rem] aspect-square rounded-lg overflow-hidden bg-gray-800 border border-gray-700 shrink-0">
              <img
                src={profileAvatarUrl}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
          ) : null}
        </div>
        <nav className="flex-1 py-2 min-h-0 overflow-auto" aria-label="Main">
          <div
            className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-sm bg-indigo-600 text-white"
            aria-current="page"
          >
            <Home className="w-4 h-4 shrink-0" />
            <span>Home</span>
          </div>
        </nav>
        <footer className="p-4 border-t border-gray-800 text-xs text-gray-500 flex items-center gap-2 shrink-0">
          <span>Dark Theme</span>
          <span className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">Studio</span>
        </footer>
      </aside>
      <main className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
        <HomePage />
      </main>
    </div>
  );
}
