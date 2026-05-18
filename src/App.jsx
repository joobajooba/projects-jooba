import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import CryptoWalletModal from './components/CryptoWalletModal';
import WalletNftAvatarModal from './components/WalletNftAvatarModal';
import { useWalletProfile } from './hooks/useWalletProfile';
import { supabase } from './lib/supabaseClient';

const NAV_SECTIONS = [
  {
    title: 'Users',
    items: [
      { id: 'crypto-wallet', label: 'Crypto Wallet', icon: 'wallet', type: 'wallet' },
      { id: 'profile', label: 'Profile', icon: 'profile', targetId: 'profile' },
    ],
  },
  {
    title: 'Overview',
    items: [
      { id: 'roadmap', label: 'Roadmap', icon: 'map', targetId: 'roadmap' },
      { id: 'community', label: 'Community', icon: 'community', targetId: 'community' },
      { id: 'the-team', label: 'The Team', icon: 'team' },
    ],
  },
  {
    title: 'The Project',
    items: [
      { id: 'bops', label: 'Bops', icon: 'trophy' },
      { id: 'staking', label: 'Staking', icon: 'heart' },
    ],
  },
  {
    title: 'Other',
    items: [
      { id: 'mba-license', label: 'MBA License', icon: 'verified' },
      { id: 'our-collection', label: 'Apechain Portfolio', icon: 'cards' },
    ],
  },
];

const MARQUEE_ITEMS = Array.from({ length: 12 }, (_, index) => index);

const TEAM_MEMBERS = [
  {
    name: 'J00BA',
    role: 'WEB3 / Artist',
    image: '/section-art/roadmap.png',
  },
  {
    name: 'OkiDokie',
    role: 'Sound Engineering',
    image: '/team-okidokie.png',
  },
  {
    name: 'Melvolio',
    role: 'Developer',
    image: '/team-melvolio.png',
  },
  {
    name: 'Delivery-Service',
    role: 'Developer',
    image: '/section-art/coming-soon.png',
  },
];

const BOPS_HOLOGRAM_SLIDES = [
  { src: '/bops-hologram/bop-1.png', alt: 'Bop character portrait in sailor outfit' },
  { src: '/bops-hologram/bop-2.png', alt: 'Bop character portrait with green hologram outline' },
  { src: '/bops-hologram/bop-3.png', alt: 'Bop character portrait with glowing eyes' },
  { src: '/bops-hologram/bop-4.png', alt: 'Red bop character portrait' },
];

function NavIcon({ type }) {
  if (type === 'community') {
    return <img className="c-sidebar__icon c-sidebar__icon--image" src="/nav-community.png" alt="" aria-hidden="true" />;
  }

  return (
    <svg className="c-sidebar__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {type === 'wallet' && (
        <>
          <path d="M4 7.5h14.5a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2h12" />
          <path d="M15 12h5.5v4H15a2 2 0 0 1 0-4Z" />
          <path d="M16.5 14h.01" />
        </>
      )}
      {type === 'map' && (
        <>
          <path d="M3 6.5 8.5 4l7 2.5L21 4v13.5L15.5 20l-7-2.5L3 20V6.5Z" />
          <path d="M8.5 4v13.5" />
          <path d="M15.5 6.5V20" />
        </>
      )}
      {type === 'team' && (
        <>
          <path d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
          <path d="M17 10a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
          <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
          <path d="M14 14.5a4.75 4.75 0 0 1 6.5 4.5" />
        </>
      )}
      {type === 'profile' && (
        <>
          <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
          <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
        </>
      )}
      {type === 'trophy' && (
        <>
          <path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" />
          <path d="M8 6H4.5v2A3.5 3.5 0 0 0 8 11.5" />
          <path d="M16 6h3.5v2A3.5 3.5 0 0 1 16 11.5" />
          <path d="M12 13v4" />
          <path d="M8.5 20h7" />
          <path d="M10 17h4" />
        </>
      )}
      {type === 'heart' && (
        <path d="M20.5 8.5c0 5-8.5 10-8.5 10s-8.5-5-8.5-10A4.5 4.5 0 0 1 12 5.9a4.5 4.5 0 0 1 8.5 2.6Z" />
      )}
      {type === 'verified' && (
        <>
          <path d="M12 3.5 14.2 5l2.65-.15.9 2.5 2.05 1.65-.75 2.55.75 2.55-2.05 1.65-.9 2.5-2.65-.15L12 20.5l-2.2-1.5-2.65.15-.9-2.5L4.2 15l.75-2.55L4.2 9.9l2.05-1.65.9-2.5L9.8 5 12 3.5Z" />
          <path d="m8.7 12.2 2.1 2.1 4.5-4.6" />
        </>
      )}
      {type === 'cards' && (
        <>
          <rect x="7" y="4" width="10" height="14" rx="1.5" />
          <path d="M5 7.5 4.2 15a1.5 1.5 0 0 0 1.3 1.65l1.5.17" />
          <path d="M17 7.18 18.5 7a1.5 1.5 0 0 1 1.65 1.3l.8 7.5a1.5 1.5 0 0 1-1.3 1.65l-2.65.29" />
        </>
      )}
    </svg>
  );
}

function getCurrentPage() {
  if (!window.location.hash || window.location.hash === '#roadmap') return 'roadmap';
  if (window.location.hash.startsWith('#profile/')) return 'public-profile';
  if (window.location.hash === '#profile') return 'profile';
  if (window.location.hash === '#community') return 'community';
  if (window.location.hash === '#the-team') return 'team';
  if (window.location.hash === '#bops') return 'bops';
  if (window.location.hash === '#staking') return 'staking';
  if (window.location.hash === '#mba-license') return 'mba-license';
  if (window.location.hash === '#our-collection') return 'our-collection';
  return 'roadmap';
}

function getPublicProfileAddress() {
  const prefix = '#profile/';
  if (!window.location.hash.startsWith(prefix)) return null;

  try {
    const address = decodeURIComponent(window.location.hash.slice(prefix.length)).trim();
    return address || null;
  } catch {
    return null;
  }
}

function formatWalletAddress(address) {
  if (!address) return 'Wallet not connected';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function getMembershipDays(firstSeenAt) {
  if (!firstSeenAt) return 0;
  const firstSeenTime = new Date(firstSeenAt).getTime();
  if (!Number.isFinite(firstSeenTime)) return 0;
  const days = Math.floor((Date.now() - firstSeenTime) / 86400000);
  return Math.max(0, days);
}

function normalizeXAccountUrl(raw) {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: true, value: '' };

  const possibleHandle = trimmed.replace(/^@/, '');
  if (/^[a-zA-Z0-9_]{1,15}$/.test(possibleHandle)) {
    return { ok: true, value: `https://x.com/${possibleHandle}` };
  }

  const withProtocol = /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withProtocol);
    const host = url.hostname.replace(/^www\./, '');
    if (host !== 'x.com' && host !== 'twitter.com') {
      return { ok: false, message: 'Use an X/Twitter profile link' };
    }
    const [handle] = url.pathname.split('/').filter(Boolean);
    if (!handle) {
      return { ok: false, message: 'Use an X/Twitter profile link' };
    }
    return { ok: true, value: `https://x.com/${handle}` };
  } catch {
    return { ok: false, message: 'Use an X/Twitter profile link' };
  }
}

function ProfilePage() {
  const { address, isConnected } = useAccount();
  const {
    username,
    profilePictureUrl,
    bio,
    xAccountUrl,
    saveProfileDetails,
    saveProfilePictureUrl,
    saveError,
    setSaveError,
    refresh,
    loading,
  } = useWalletProfile(address);
  const [editing, setEditing] = useState(false);
  const [nftPickerOpen, setNftPickerOpen] = useState(false);
  const [draftUsername, setDraftUsername] = useState('');
  const [draftBio, setDraftBio] = useState('');
  const [draftXAccountUrl, setDraftXAccountUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const displayName = username || (isConnected ? 'Unnamed Jooba' : 'Guest Profile');

  useEffect(() => {
    if (!editing) {
      setDraftUsername(username ?? '');
      setDraftBio(bio ?? '');
      setDraftXAccountUrl(xAccountUrl ?? '');
    }
  }, [bio, editing, username, xAccountUrl]);

  const beginEditing = () => {
    setDraftUsername(username ?? '');
    setDraftBio(bio ?? '');
    setDraftXAccountUrl(xAccountUrl ?? '');
    setSaveError(null);
    setEditing(true);
  };

  const cancelEditing = () => {
    setSaveError(null);
    setEditing(false);
  };

  const saveEditing = async (event) => {
    event.preventDefault();
    if (!address) {
      setSaveError('Connect your wallet to edit your profile');
      return;
    }
    const xResult = normalizeXAccountUrl(draftXAccountUrl);
    if (!xResult.ok) {
      setSaveError(xResult.message);
      return;
    }
    setSaving(true);
    const ok = await saveProfileDetails({
      username: draftUsername,
      bio: draftBio,
      xAccountUrl: xResult.value,
    });
    setSaving(false);
    if (ok) setEditing(false);
  };

  const pickProfileNft = async (url) => {
    const ok = await saveProfilePictureUrl(url);
    if (ok) refresh();
  };

  return (
    <>
      <section className="c-profile-page" aria-label="Profile page">
        <article className="c-profile-card">
          <div className="c-profile-card__banner" aria-hidden="true" />
          <div className="c-profile-card__body">
            {editing ? (
              <button
                type="button"
                className="c-profile-card__avatar c-profile-card__avatar--button"
                onClick={() => setNftPickerOpen(true)}
                disabled={!address}
                aria-label="Choose NFT profile picture"
                title="Choose NFT profile picture"
              >
                {profilePictureUrl ? <img src={profilePictureUrl} alt="" /> : null}
                <span className="c-profile-card__avatar-edit">Select NFT</span>
              </button>
            ) : (
              <div className="c-profile-card__avatar" aria-label="Profile picture">
                {profilePictureUrl ? <img src={profilePictureUrl} alt="" /> : null}
              </div>
            )}
            <div className="c-profile-card__identity">
              <h1 className="c-profile-card__name">{displayName}</h1>
              <p className="c-profile-card__address" title={address ?? undefined}>
                {loading ? 'Loading profile...' : formatWalletAddress(address)}
              </p>
              {bio ? <p className="c-profile-card__bio">{bio}</p> : null}
              {xAccountUrl ? (
                <a className="c-profile-card__x-link" href={xAccountUrl} target="_blank" rel="noreferrer">
                  {xAccountUrl.replace(/^https?:\/\/(www\.)?/, '')}
                </a>
              ) : null}
            </div>
          </div>
          <div className="c-profile-card__edit-area">
            {!editing ? (
              <button
                type="button"
                className="c-profile-card__edit-button"
                onClick={beginEditing}
                disabled={!address}
              >
                Edit Profile
              </button>
            ) : (
              <form className="c-profile-card__form" onSubmit={saveEditing}>
                <label className="c-profile-card__field">
                  <span>Username</span>
                  <input
                    value={draftUsername}
                    onChange={(event) => setDraftUsername(event.target.value)}
                    maxLength={32}
                    placeholder="your_name"
                    autoComplete="username"
                    required
                  />
                </label>
                <label className="c-profile-card__field">
                  <span>Bio</span>
                  <textarea
                    value={draftBio}
                    onChange={(event) => setDraftBio(event.target.value)}
                    maxLength={200}
                    placeholder="Tell people about yourself"
                    rows={4}
                  />
                  <small>{draftBio.length}/200</small>
                </label>
                <label className="c-profile-card__field">
                  <span>X Account</span>
                  <input
                    value={draftXAccountUrl}
                    onChange={(event) => setDraftXAccountUrl(event.target.value)}
                    placeholder="https://x.com/username"
                    inputMode="url"
                  />
                </label>
                {saveError ? <p className="c-profile-card__error">{saveError}</p> : null}
                <div className="c-profile-card__actions">
                  <button type="submit" className="c-profile-card__edit-button" disabled={saving}>
                    {saving ? 'Updating...' : 'Confirm Updates'}
                  </button>
                  <button
                    type="button"
                    className="c-profile-card__cancel-button"
                    onClick={cancelEditing}
                    disabled={saving}
                  >
                    Cancel Updates
                  </button>
                </div>
              </form>
            )}
          </div>
        </article>
      </section>
      <WalletNftAvatarModal
        open={nftPickerOpen}
        address={address}
        onClose={() => setNftPickerOpen(false)}
        onPick={pickProfileNft}
      />
    </>
  );
}

function PublicProfilePage({ address }) {
  const { username, profilePictureUrl, bio, xAccountUrl, loading } = useWalletProfile(address);
  const displayName = username || (loading ? 'Loading profile...' : 'Unnamed Jooba');

  return (
    <section className="c-profile-page" aria-label="Public profile page">
      <article className="c-profile-card">
        <div className="c-profile-card__banner" aria-hidden="true" />
        <div className="c-profile-card__body">
          <div className="c-profile-card__avatar" aria-label="Profile picture">
            {profilePictureUrl ? <img src={profilePictureUrl} alt="" /> : null}
          </div>
          <div className="c-profile-card__identity">
            <h1 className="c-profile-card__name">{displayName}</h1>
            <p className="c-profile-card__address" title={address ?? undefined}>
              {loading ? 'Loading profile...' : formatWalletAddress(address)}
            </p>
            {bio ? <p className="c-profile-card__bio">{bio}</p> : null}
            {xAccountUrl ? (
              <a className="c-profile-card__x-link" href={xAccountUrl} target="_blank" rel="noreferrer">
                {xAccountUrl.replace(/^https?:\/\/(www\.)?/, '')}
              </a>
            ) : null}
          </div>
        </div>
      </article>
    </section>
  );
}

function CommunityPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadUsers() {
      setLoading(true);
      setError(null);

      if (!supabase) {
        setUsers([]);
        setError('Supabase is not configured');
        setLoading(false);
        return;
      }

      const { data, error: loadError } = await supabase
        .from('user_data')
        .select('wallet_address, username, profile_picture_url, first_logged_in_at')
        .order('username', { ascending: true, nullsFirst: false });

      if (cancelled) return;

      if (loadError) {
        setUsers([]);
        setError(loadError.message || 'Could not load community users');
      } else {
        setUsers(data ?? []);
      }
      setLoading(false);
    }

    loadUsers();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="c-community-page" aria-label="Community page">
      <div className="c-community-card">
        <div className="c-community-card__header">
          <p className="c-text c-text--eyebrow">Jooba Community</p>
          <h1 className="c-community-card__title">Community</h1>
        </div>

        {loading ? <p className="c-community-card__status">Loading users...</p> : null}
        {error ? <p className="c-community-card__error">{error}</p> : null}
        {!loading && !error && users.length === 0 ? (
          <p className="c-community-card__status">No community profiles yet.</p>
        ) : null}

        {!loading && !error && users.length > 0 ? (
          <div className="c-community-table-wrap">
            <table className="c-community-table">
              <thead>
                <tr>
                  <th scope="col">User</th>
                  <th scope="col">Wallet</th>
                  <th scope="col">Membership Age (Days)</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const walletAddress = user.wallet_address ?? '';
                  const username = user.username?.trim() || 'Unnamed Jooba';
                  const memberDays = getMembershipDays(user.first_logged_in_at);
                  const profileHref = walletAddress ? `#profile/${encodeURIComponent(walletAddress)}` : '#community';
                  return (
                    <tr
                      key={walletAddress || username}
                      className={walletAddress ? 'c-community-table__row c-community-table__row--link' : undefined}
                      onClick={() => {
                        if (walletAddress) window.location.hash = profileHref;
                      }}
                    >
                      <td>
                        <a
                          className="c-community-user c-community-user--link"
                          href={profileHref}
                          onClick={(event) => event.stopPropagation()}
                        >
                          <div className="c-community-user__avatar" aria-hidden="true">
                            {user.profile_picture_url ? <img src={user.profile_picture_url} alt="" /> : null}
                          </div>
                          <span>{username}</span>
                        </a>
                      </td>
                      <td>
                        <span className="c-community-wallet" title={walletAddress}>
                          {walletAddress ? formatWalletAddress(walletAddress) : 'No wallet'}
                        </span>
                      </td>
                      <td>
                        <span className="c-community-member-days">{memberDays}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function TeamPage() {
  return (
    <section className="c-team-page" aria-label="Team page">
      <div className="c-team-card">
        <div className="c-team-card__header">
          <p className="c-text c-text--eyebrow">Meet the builders</p>
          <h1 className="c-team-card__title">The Team</h1>
        </div>
        <div className="c-team-grid">
          {TEAM_MEMBERS.map((member) => (
            <article key={member.name} className="c-team-member">
              <img className="c-team-member__image" src={member.image} alt={`${member.name} portrait`} />
              <h2 className="c-team-member__name">{member.name}</h2>
              <p className="c-team-member__role">{member.role}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function RoadmapPage() {
  return (
    <section id="roadmap" className="l-page__hero" aria-label="Roadmap">
      <img className="c-roadmap-art" src="/roadmap-art.png" alt="J00BA roadmap artwork" />
    </section>
  );
}

function BopsPage() {
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setActiveSlide((currentSlide) => (currentSlide + 1) % BOPS_HOLOGRAM_SLIDES.length);
    }, 2000);

    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <section id="bops" className="c-bops-section" aria-label="Bops hologram slideshow">
      <div className="c-bops-section__panel c-bops-section__panel--copy">
        <h1 className="c-bops-section__title">Bops Summoning</h1>
        <div className="c-bops-section__body">
          <p className="c-bops-section__lede">
            Bops are coming to Apechain, will you participate? Available for mint this Summer
          </p>
          <dl className="c-bops-mint-list" aria-label="Bops mint details">
            <div className="c-bops-mint-list__item">
              <dt>Mint Date</dt>
              <dd>June / July</dd>
            </div>
            <div className="c-bops-mint-list__item">
              <dt>Mint Price</dt>
              <dd>TBC</dd>
            </div>
            <div className="c-bops-mint-list__item">
              <dt>Total Supply</dt>
              <dd>5555</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="c-bops-section__panel c-bops-section__panel--hologram">
        <div className="c-hologram" aria-live="polite">
          <div className="c-hologram__beam" aria-hidden="true" />
          <div className="c-hologram__frame">
            {BOPS_HOLOGRAM_SLIDES.map((slide, index) => (
              <img
                key={slide.src}
                className={`c-hologram__image${index === activeSlide ? ' is-active' : ''}`}
                src={slide.src}
                alt={index === activeSlide ? slide.alt : ''}
                aria-hidden={index !== activeSlide}
              />
            ))}
            <div className="c-hologram__scanlines" aria-hidden="true" />
            <div className="c-hologram__glitch" aria-hidden="true" />
          </div>
          <div className="c-hologram__base" aria-hidden="true">
            <span />
          </div>
        </div>
      </div>
    </section>
  );
}

function StakingPage() {
  return (
    <section id="staking" className="c-staking-page" aria-label="Staking page">
      <article className="c-staking-card">
        <h1 className="c-staking-card__title">Coming soon</h1>
        <p className="c-staking-card__text">This is currently in development</p>
      </article>
    </section>
  );
}

function MbaLicensePage() {
  return (
    <section id="mba-license" className="c-mba-license-page" aria-label="MBA License page">
      <img className="c-mba-license-page__image" src="/mba-license.png" alt="Made By Apes license certification mark" />
    </section>
  );
}

const COLLECTION_ITEMS = [
  { name: 'Zards #3722', image: '/collection-zard.png' },
  { name: 'Glyder #224', image: '/collection-glyder.png' },
  { name: 'Trainer #916', image: '/collection-trainer.png' },
  { name: 'Typical Tigers #4792', image: '/collection-typical-tigers.png' },
  { name: 'MIMU #3875', image: '/collection-mimu.png' },
  { name: 'OtherPets #4495', image: '/collection-otherpet.png' },
  { name: 'GOATs #351', image: '/collection-goats.png' },
  { name: 'Hoodlums #1365', image: '/collection-hoodlums.png' },
];

function OurCollectionPage() {
  return (
    <section id="our-collection" className="c-team-page" aria-label="Our Apechain Assets page">
      <div className="c-team-card">
        <div className="c-team-card__header">
          <p className="c-text c-text--eyebrow">Studio J00BA</p>
          <h1 className="c-team-card__title">Our Apechain Assets</h1>
        </div>
        <div className="c-team-grid">
          {COLLECTION_ITEMS.map((item) => (
            <article key={item.name} className="c-team-member">
              <img
                className="c-team-member__image c-team-member__image--collection"
                src={item.image}
                alt={`${item.name} NFT`}
              />
              <h2 className="c-team-member__name">{item.name}</h2>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function App() {
  const [currentPage, setCurrentPage] = useState(getCurrentPage);
  const [publicProfileAddress, setPublicProfileAddress] = useState(getPublicProfileAddress);
  const [walletModalOpen, setWalletModalOpen] = useState(false);

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentPage(getCurrentPage());
      setPublicProfileAddress(getPublicProfileAddress());
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const openWalletModal = () => {
    setWalletModalOpen(true);
  };

  return (
    <div id="site-top" className="l-page">
      <div className="c-marquee" aria-label="Coming soon">
        <div className="c-marquee__track" aria-hidden="true">
          {MARQUEE_ITEMS.map((item) => (
            <span key={item} className="c-marquee__item">
              Coming soon
            </span>
          ))}
        </div>
      </div>

      <aside id="site-sidebar" className="c-sidebar" aria-label="Site navigation">
        <div className="c-sidebar__brand">Studio J00BA</div>
        <nav className="c-sidebar__nav">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title} className="c-sidebar__section">
              <div className="c-sidebar__section-heading">
                <span>{section.title}</span>
              </div>
              {section.items.map((item) => (
                item.type === 'wallet' ? (
                  <button key={item.id} type="button" className="c-sidebar__link c-sidebar__link--button u-text-bold" onClick={openWalletModal}>
                    <NavIcon type={item.icon} />
                    <span className="c-sidebar__label">{item.label}</span>
                  </button>
                ) : (
                  <a key={item.id} className="c-sidebar__link u-text-bold" href={`#${item.targetId ?? item.id}`}>
                    <NavIcon type={item.icon} />
                    <span className="c-sidebar__label">{item.label}</span>
                  </a>
                )
              ))}
            </div>
          ))}
        </nav>
      </aside>

      <main className="l-page__content" aria-label="Main page content">
        {currentPage === 'profile' ? (
          <ProfilePage />
        ) : currentPage === 'public-profile' ? (
          <PublicProfilePage address={publicProfileAddress} />
        ) : currentPage === 'community' ? (
          <CommunityPage />
        ) : currentPage === 'team' ? (
          <TeamPage />
        ) : currentPage === 'bops' ? (
          <BopsPage />
        ) : currentPage === 'staking' ? (
          <StakingPage />
        ) : currentPage === 'mba-license' ? (
          <MbaLicensePage />
        ) : currentPage === 'our-collection' ? (
          <OurCollectionPage />
        ) : (
          <RoadmapPage />
        )}
      </main>

      <CryptoWalletModal open={walletModalOpen} onClose={() => setWalletModalOpen(false)} />
    </div>
  );
}