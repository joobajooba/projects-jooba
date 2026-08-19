import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import collection from '../data/collection.json';
import { useAdventuresServerAccess } from '../lib/adventuresAccess';
import { resolveImplingTier } from '../lib/hashMining';
import {
  ALIGNMENTS,
  alignedTilesets,
  estimateStake,
  PREVIEW_KEEPS,
  STAKING_DURATIONS,
} from '../lib/stakingPreview';

const COLLECTION_BY_ID = new Map(collection.map((impling) => [String(impling.id), impling]));

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
        resolveImplingTier({ attributes: instance.metadata?.attributes }) ||
        'Tier 1',
      body: localImpling?.attributes?.Body || 'Unknown',
    });
  });

  return [...uniqueImplingz.values()].sort((a, b) => Number(a.id) - Number(b.id));
}

function formatImp(amount) {
  return `${amount.toLocaleString()} $IMP`;
}

function percentFromMultiplier(value) {
  return `+${Math.round((value - 1) * 100)}%`;
}

export default function StakingPage() {
  const { walletAccount } = useOutletContext();
  const access = useAdventuresServerAccess();
  const [ownedImplingz, setOwnedImplingz] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedImpId, setSelectedImpId] = useState('');
  const [selectedKeepId, setSelectedKeepId] = useState('');
  const [durationId, setDurationId] = useState('30d');

  const selectedImp = ownedImplingz.find((imp) => imp.id === selectedImpId) ?? null;
  const selectedKeep = PREVIEW_KEEPS.find((keep) => keep.id === selectedKeepId) ?? null;
  const duration = STAKING_DURATIONS.find((item) => item.id === durationId) ?? STAKING_DURATIONS[1];
  const estimate = useMemo(
    () => estimateStake(selectedImp, selectedKeep, duration),
    [selectedImp, selectedKeep, duration]
  );
  const matchTilesets = selectedImp ? alignedTilesets(selectedImp.body) : [];

  useEffect(() => {
    if (!walletAccount) {
      setOwnedImplingz([]);
      setSelectedImpId('');
      return undefined;
    }

    const controller = new AbortController();
    setLoading(true);
    setError('');

    fetch(`/api/implingz?owner=${encodeURIComponent(walletAccount)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'Could not load your IMPLINGz.');
        return mapOwnedImplingz(data.items ?? []);
      })
      .then((implingz) => {
        setOwnedImplingz(implingz);
        setSelectedImpId((current) =>
          implingz.some((imp) => imp.id === current) ? current : implingz[0]?.id || ''
        );
      })
      .catch((loadError) => {
        if (loadError.name !== 'AbortError') {
          setError(loadError.message || 'Could not load your IMPLINGz.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [walletAccount]);

  if (!access.unlocked) {
    return (
      <div
        className="adventures-gate-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="staking-wip-title"
      >
        <div className="adventures-gate__panel">
          <p className="adventures-gate__eyebrow">Staking</p>
          <h1 id="staking-wip-title">Work in progress</h1>
          <p>This page is being built/tested.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="staking-page">
      <div className="staking-page__inner">
        <header className="adventures-page__header">
          <p className="adventures-page__eyebrow">Layout preview</p>
          <h1 className="adventures-page__title">Staking</h1>
          <p className="adventures-page__intro">
            Lock an Imp for a chosen time to earn on-chain $IMP. Linking an Imp Keep adds a pair
            bonus. Matching Body colour to dungeon tileset adds an alignment bonus. Nothing here
            is live yet — keeps below are preview dungeons so you can see the pairing layout.
          </p>
        </header>

        <div className="staking-layout">
          <section className="staking-panel">
            <div className="staking-panel__header">
              <p className="adventure-panel__eyebrow">Step 1</p>
              <h2>Choose an Imp</h2>
            </div>
            {loading ? <p className="staking-panel__message">Loading IMPLINGz…</p> : null}
            {error ? (
              <p className="staking-panel__message staking-panel__message--error" role="alert">
                {error}
              </p>
            ) : null}
            {!loading && !error && ownedImplingz.length === 0 ? (
              <p className="staking-panel__message">No IMPLINGz were found in this wallet.</p>
            ) : null}
            <div className="staking-grid">
              {ownedImplingz.map((imp) => (
                <button
                  key={imp.id}
                  type="button"
                  className={`staking-card${selectedImpId === imp.id ? ' staking-card--selected' : ''}`}
                  onClick={() => setSelectedImpId(imp.id)}
                >
                  <img src={imp.image} alt={imp.name} />
                  <span className="staking-card__name">{imp.name}</span>
                  <span className="staking-card__meta">
                    {imp.body} · {imp.tier}
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="staking-panel">
            <div className="staking-panel__header">
              <p className="adventure-panel__eyebrow">Step 2</p>
              <h2>Link a dungeon</h2>
              <p>Optional. Imp-only is the base rate. A keep adds the pair bonus.</p>
            </div>
            <div className="staking-grid">
              <button
                type="button"
                className={`staking-card staking-card--empty${
                  selectedKeepId === '' ? ' staking-card--selected' : ''
                }`}
                onClick={() => setSelectedKeepId('')}
              >
                <span className="staking-card__name">Imp only</span>
                <span className="staking-card__meta">No pair bonus</span>
              </button>
              {PREVIEW_KEEPS.map((keep) => {
                const aligned = selectedImp ? alignedTilesets(selectedImp.body).includes(keep.tileset) : false;
                return (
                  <button
                    key={keep.id}
                    type="button"
                    className={`staking-card${selectedKeepId === keep.id ? ' staking-card--selected' : ''}${
                      aligned ? ' staking-card--aligned' : ''
                    }`}
                    onClick={() => setSelectedKeepId(keep.id)}
                  >
                    <img src={keep.image} alt={`${keep.name} ${keep.tileset}`} />
                    <span className="staking-card__name">{keep.name}</span>
                    <span className="staking-card__meta">
                      {keep.tileset}
                      {aligned ? ' · aligned' : ''}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        <section className="staking-panel staking-panel--wide">
          <div className="staking-panel__header">
            <p className="adventure-panel__eyebrow">Step 3</p>
            <h2>Lock time</h2>
            <p>Longer locks pay more $IMP. The Imp (and keep, if linked) would sit in a vault until the date.</p>
          </div>
          <div className="staking-durations">
            {STAKING_DURATIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`staking-duration${durationId === option.id ? ' staking-duration--selected' : ''}`}
                onClick={() => setDurationId(option.id)}
              >
                <strong>{option.label}</strong>
                <span>{option.multiplier.toFixed(2)}x duration</span>
              </button>
            ))}
          </div>
        </section>

        <section className="staking-summary">
          <div className="staking-summary__copy">
            <p className="adventure-panel__eyebrow">Estimate</p>
            <h2>{selectedImp ? formatImp(estimate.payout) : 'Pick an Imp'}</h2>
            <p>
              {selectedImp
                ? `${selectedImp.name} · ${selectedImp.body}`
                : 'Choose an Imp to see the rate.'}
              {selectedKeep ? ` + ${selectedKeep.name} (${selectedKeep.tileset})` : ' · Imp only'}
            </p>
          </div>

          <ul className="staking-summary__mods">
            <li>
              <span>Duration</span>
              <strong>{estimate.durationMultiplier.toFixed(2)}x</strong>
            </li>
            <li>
              <span>Pair</span>
              <strong>{selectedKeep ? percentFromMultiplier(estimate.pairMultiplier) : 'none'}</strong>
            </li>
            <li>
              <span>Alignment</span>
              <strong>
                {selectedKeep
                  ? estimate.aligned
                    ? `${percentFromMultiplier(estimate.alignmentMultiplier)} match`
                    : 'flat pair only'
                  : '—'}
              </strong>
            </li>
            <li>
              <span>Tier</span>
              <strong>{selectedImp?.tier || '—'}</strong>
            </li>
          </ul>

          {selectedImp ? (
            <p className="staking-summary__hint">
              {selectedImp.body} aligns with {matchTilesets.join(', ') || 'no listed tilesets'}.
              {selectedKeep && !estimate.aligned
                ? ` ${selectedKeep.tileset} is a normal pair, not an alignment match.`
                : ''}
            </p>
          ) : null}

          <button type="button" className="staking-summary__action" disabled>
            Stake — preview only
          </button>
        </section>

        <section className="staking-panel staking-panel--wide">
          <div className="staking-panel__header">
            <h2>Alignment chart</h2>
            <p>Body colour on the Imp, tileset on the keep. Match = extra modifier. Mismatch still gets the flat pair bonus.</p>
          </div>
          <div className="staking-alignments">
            {Object.entries(ALIGNMENTS).map(([body, tilesets]) => (
              <div
                key={body}
                className={`staking-alignments__row${
                  selectedImp?.body === body ? ' staking-alignments__row--active' : ''
                }`}
              >
                <strong>{body}</strong>
                <span>{tilesets.join(', ')}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
