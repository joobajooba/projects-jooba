import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useSignMessage } from 'wagmi';
import collection from '../data/collection.json';
import {
  buildProfileSignatureMessage,
  fetchCommunityProfiles,
  formatAccountCreatedAt,
  requestProfileChallenge,
  saveCommunityProfile,
} from '../lib/communityProfiles';
import { decorateAccount, emptyAdventurerAccount } from '../lib/adventurerProgress';
import { fetchAdventurerAccount } from '../lib/adventuresApi';
import { resolveImplingTier } from '../lib/hashMining';

const COLLECTION_BY_ID = new Map(collection.map((impling) => [String(impling.id), impling]));
const EMPTY_PROFILE = {
  avatarId: '',
  nickname: '',
  bio: '',
};

function shortenAddress(address) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function normalizeImageUrl(imageUrl) {
  if (!imageUrl) return '';
  if (imageUrl.startsWith('ipfs://')) {
    return `https://dweb.link/ipfs/${imageUrl.slice('ipfs://'.length)}`;
  }
  return imageUrl;
}

function mapOwnedImplingz(items) {
  const uniqueImplingz = new Map();

  items.forEach((instance) => {
    const tokenId = String(instance.id);
    const localImpling = COLLECTION_BY_ID.get(tokenId);

    uniqueImplingz.set(tokenId, {
      id: tokenId,
      name: localImpling?.name ?? instance.metadata?.name ?? `IMPLINGZ #${tokenId}`,
      image:
        localImpling?.image ??
        normalizeImageUrl(instance.image_url || instance.metadata?.image || ''),
      tier:
        resolveImplingTier(localImpling) ||
        resolveImplingTier({
          attributes: instance.metadata?.attributes,
        }) ||
        'Tier 1',
    });
  });

  return [...uniqueImplingz.values()].sort((a, b) => Number(a.id) - Number(b.id));
}

export default function ProfilePage() {
  const { walletAccount, walletName, openWalletMenu } = useOutletContext();
  const { signMessageAsync } = useSignMessage();
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [ownedImplingz, setOwnedImplingz] = useState([]);
  const [implingzLoading, setImplingzLoading] = useState(false);
  const [implingzError, setImplingzError] = useState('');
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [adventurer, setAdventurer] = useState(emptyAdventurerAccount());
  const [joinedAt, setJoinedAt] = useState('');

  const selectedAvatar = useMemo(
    () => ownedImplingz.find((impling) => impling.id === profile.avatarId) ?? null,
    [ownedImplingz, profile.avatarId]
  );
  const tierCounts = useMemo(
    () =>
      ownedImplingz.reduce(
        (counts, impling) => {
          if (impling.tier === 'Tier 1') counts.tier1 += 1;
          if (impling.tier === 'Tier 2') counts.tier2 += 1;
          if (impling.tier === 'Tier 3') counts.tier3 += 1;
          return counts;
        },
        { tier1: 0, tier2: 0, tier3: 0 }
      ),
    [ownedImplingz]
  );

  useEffect(() => {
    if (!walletAccount) {
      setProfile(EMPTY_PROFILE);
      setOwnedImplingz([]);
      setAvatarPickerOpen(false);
      setSaveStatus('');
      setAdventurer(emptyAdventurerAccount());
      setJoinedAt('');
      return undefined;
    }

    const controller = new AbortController();
    const storageKey = `implingz-profile:${walletAccount.toLowerCase()}`;

    try {
      const storedProfile = JSON.parse(window.localStorage.getItem(storageKey));
      setProfile({
        avatarId: String(storedProfile?.avatarId ?? ''),
        nickname: String(storedProfile?.nickname ?? '').slice(0, 24),
        bio: String(storedProfile?.bio ?? '').slice(0, 240),
      });
    } catch {
      setProfile(EMPTY_PROFILE);
    }

    setImplingzLoading(true);
    setImplingzError('');

    fetchAdventurerAccount(walletAccount, { signal: controller.signal })
      .then((data) => {
        setAdventurer(decorateAccount(data.account));
      })
      .catch((error) => {
        if (error?.name === 'AbortError') return;
        setAdventurer(emptyAdventurerAccount(walletAccount.toLowerCase()));
      });

    fetch(`/api/implingz?owner=${encodeURIComponent(walletAccount)}&fresh=${Date.now()}`, {
      signal: controller.signal,
      cache: 'no-store',
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'Could not load your IMPLINGz.');
        return mapOwnedImplingz(data.items ?? []);
      })
      .then((implingz) => {
        setOwnedImplingz(implingz);
        setProfile((current) => ({
          ...current,
          avatarId: implingz.some((impling) => impling.id === current.avatarId)
            ? current.avatarId
            : '',
        }));
      })
      .catch((error) => {
        if (error.name !== 'AbortError') {
          setImplingzError(error.message || 'Could not load your IMPLINGz.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setImplingzLoading(false);
      });

    fetchCommunityProfiles({ walletAddress: walletAccount, signal: controller.signal })
      .then(([savedProfile]) => {
        if (!savedProfile) return;
        setProfile({
          avatarId: String(savedProfile.avatar_token_id ?? ''),
          nickname: String(savedProfile.nickname ?? '').slice(0, 24),
          bio: String(savedProfile.bio ?? '').slice(0, 240),
        });
        setJoinedAt(savedProfile.created_at || '');
      })
      .catch((error) => {
        if (error.name !== 'AbortError') {
          setSaveStatus('Your shared profile could not be loaded. Local details are shown.');
        }
      });

    return () => controller.abort();
  }, [walletAccount]);

  function updateProfile(field, value) {
    setProfile((current) => ({ ...current, [field]: value }));
    setSaveStatus('');
  }

  async function saveProfile(event) {
    event.preventDefault();
    if (!walletAccount || saving) return;

    const normalizedProfile = {
      avatarId: profile.avatarId,
      nickname: profile.nickname.trim(),
      bio: profile.bio.trim(),
    };

    setSaving(true);
    setSaveStatus('Preparing a wallet signature…');

    try {
      const walletAddress = walletAccount.toLowerCase();
      const { nonce } = await requestProfileChallenge(walletAddress);
      const signatureMessage = buildProfileSignatureMessage({
        walletAddress,
        nickname: normalizedProfile.nickname,
        bio: normalizedProfile.bio,
        avatarTokenId: normalizedProfile.avatarId || null,
        nonce,
      });
      const signature = await signMessageAsync({ message: signatureMessage });

      setSaveStatus('Verifying your wallet and profile Imp…');
      const saved = await saveCommunityProfile({
        walletAddress,
        nickname: normalizedProfile.nickname,
        bio: normalizedProfile.bio,
        avatarTokenId: normalizedProfile.avatarId || null,
        nonce,
        signature,
      });

      try {
        window.localStorage.setItem(
          `implingz-profile:${walletAddress}`,
          JSON.stringify(normalizedProfile)
        );
      } catch {
        // The shared Supabase profile remains the source of truth.
      }
      setProfile(normalizedProfile);
      setJoinedAt(saved.profile?.created_at || joinedAt);
      setSaveStatus('Profile saved to the Community board.');
    } catch (error) {
      setSaveStatus(
        error?.code === 4001
          ? 'Profile signing was cancelled.'
          : error?.message || 'Your profile could not be saved.'
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="profile-page">
      <div className="profile-page__inner">
        <header className="profile-page__header">
          <p className="profile-page__eyebrow">Adventurer identity</p>
          <h1>Profile</h1>
          <p>Choose how other adventurers will know you.</p>
        </header>

        {!walletAccount ? (
          <section className="profile-gate">
            <div className="profile-gate__icon" aria-hidden="true">
              ?
            </div>
            <h2>Connect your wallet first</h2>
            <p>Your wallet identifies your profile and provides the IMPLINGz available as avatars.</p>
            <button type="button" onClick={openWalletMenu}>
              Connect wallet
            </button>
          </section>
        ) : (
          <div className="profile-layout">
            <aside className="profile-summary">
              <button
                type="button"
                className={`profile-avatar${selectedAvatar ? ' profile-avatar--selected' : ''}`}
                onClick={() => setAvatarPickerOpen(true)}
                disabled={implingzLoading || ownedImplingz.length === 0}
              >
                {selectedAvatar ? (
                  <img src={selectedAvatar.image} alt={selectedAvatar.name} />
                ) : (
                  <>
                    <span aria-hidden="true">+</span>
                    <strong>Choose profile Imp</strong>
                  </>
                )}
              </button>

              <div className="profile-summary__identity">
                <strong>{profile.nickname || 'Unnamed Adventurer'}</strong>
                <span>{walletName} · {shortenAddress(walletAccount)}</span>
              </div>

              <div className="profile-summary__metric">
                <span>Total IMPLINGz</span>
                <strong>{implingzLoading ? '…' : ownedImplingz.length}</strong>
              </div>

              <div className="profile-summary__metric">
                <span>Account level</span>
                <strong>{adventurer.level}</strong>
              </div>
              <div className="profile-summary__metric">
                <span>Joined</span>
                <strong>{formatAccountCreatedAt(joinedAt || adventurer.created_at)}</strong>
              </div>
              <div className="profile-summary__xp">
                <span>
                  {adventurer.xp} XP
                  {adventurer.nextLevelXp ? ` / ${adventurer.nextLevelXp}` : ''}
                </span>
                <span>
                  {adventurer.active_adventures}/{adventurer.slots} adventures
                </span>
              </div>
              <div className="profile-summary__xp-bar" aria-hidden="true">
                <span style={{ width: `${Math.round((adventurer.progressRatio ?? 0) * 100)}%` }} />
              </div>

              <div className="profile-summary__tiers" aria-label="IMPLINGZ tier totals">
                <div>
                  <span>Tier 1</span>
                  <strong>{implingzLoading ? '…' : tierCounts.tier1}</strong>
                </div>
                <div>
                  <span>Tier 2</span>
                  <strong>{implingzLoading ? '…' : tierCounts.tier2}</strong>
                </div>
                <div>
                  <span>Tier 3</span>
                  <strong>{implingzLoading ? '…' : tierCounts.tier3}</strong>
                </div>
              </div>

              {implingzError && (
                <p className="profile-summary__error" role="alert">
                  {implingzError}
                </p>
              )}
            </aside>

            <form className="profile-form" onSubmit={saveProfile}>
              <div className="profile-form__heading">
                <div>
                  <p className="profile-page__eyebrow">Profile details</p>
                  <h2>About your adventurer</h2>
                </div>
                <span>{shortenAddress(walletAccount)}</span>
              </div>

              <label className="profile-field">
                <span>Nickname</span>
                <input
                  type="text"
                  value={profile.nickname}
                  maxLength={24}
                  placeholder="Enter a nickname"
                  onChange={(event) => updateProfile('nickname', event.target.value)}
                />
                <small>{profile.nickname.length}/24</small>
              </label>

              <label className="profile-field">
                <span>Profile bio</span>
                <textarea
                  value={profile.bio}
                  maxLength={240}
                  rows={7}
                  placeholder="Tell the realm about yourself..."
                  onChange={(event) => updateProfile('bio', event.target.value)}
                />
                <small>{profile.bio.length}/240</small>
              </label>

              <div className="profile-form__actions">
                <button type="submit" disabled={saving}>
                  {saving ? 'Saving…' : 'Save profile'}
                </button>
                {saveStatus && <p role="status">{saveStatus}</p>}
              </div>
            </form>
          </div>
        )}
      </div>

      {avatarPickerOpen && (
        <div
          className="profile-avatar-picker"
          role="dialog"
          aria-modal="true"
          aria-labelledby="profile-avatar-picker-title"
        >
          <div className="profile-avatar-picker__panel">
            <div className="profile-avatar-picker__header">
              <div>
                <p className="profile-page__eyebrow">Wallet collection</p>
                <h2 id="profile-avatar-picker-title">Choose your profile Imp</h2>
              </div>
              <button
                type="button"
                aria-label="Close profile picture selector"
                onClick={() => setAvatarPickerOpen(false)}
              >
                ×
              </button>
            </div>

            <div className="profile-avatar-picker__grid">
              {ownedImplingz.map((impling) => (
                <button
                  key={impling.id}
                  type="button"
                  className={
                    profile.avatarId === impling.id
                      ? 'profile-avatar-picker__item profile-avatar-picker__item--selected'
                      : 'profile-avatar-picker__item'
                  }
                  onClick={() => {
                    updateProfile('avatarId', impling.id);
                    setAvatarPickerOpen(false);
                  }}
                >
                  <img src={impling.image} alt={impling.name} />
                  <strong>{impling.name}</strong>
                  <span>{impling.tier || 'Owned'}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
