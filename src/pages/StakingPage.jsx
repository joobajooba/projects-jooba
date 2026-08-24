import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useSignMessage } from 'wagmi';
import collection from '../data/collection.json';
import { resolveImplingTier } from '../lib/hashMining';
import { composeStakeCanvas } from '../lib/stakeCanvas';
import {
  ALIGNMENTS,
  alignedTilesets,
  CANVAS_LAYOUTS,
  canvasById,
  durationById,
  estimateStake,
  formatImpCoin,
  formatRemaining,
  isAlignedPair,
  STAKING_DURATIONS,
  STAKING_IMPLINGZ_ADDRESS,
  tokenKey,
} from '../lib/staking';
import {
  buildStakeControlMessage,
  buildStakeMessage,
  fetchStakingState,
  requestStakeChallenge,
  submitStake,
  submitStakeControl,
} from '../lib/stakingApi';

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
      contract: STAKING_IMPLINGZ_ADDRESS,
    });
  });
  return [...uniqueImplingz.values()].sort((a, b) => Number(a.id) - Number(b.id));
}

function mapOwnedKeeps(items) {
  return (items ?? [])
    .map((keep) => ({
      id: String(keep.id),
      key: tokenKey(keep.contract, keep.id),
      name: keep.name || `Imp Keep #${keep.id}`,
      image: keep.image || '',
      tileset: String(keep.tileset || '').toLowerCase(),
      biome: keep.biome || 'Unknown',
      dungeonType: keep.dungeonType || '',
      miniBoss: keep.miniBoss || '',
      seed: keep.seed || '',
      contract: keep.contract,
      version: keep.version || 'v1',
    }))
    .sort((a, b) => {
      if (a.version !== b.version) return a.version.localeCompare(b.version);
      return Number(a.id) - Number(b.id);
    });
}

function keepsFromSlots(layout, slots, ownedKeeps) {
  return layout.keepSlots
    .map((slot) => ownedKeeps.find((keep) => keep.key === slots[slot]) || null)
    .filter(Boolean);
}

function StakeBoard({ canvasId, imp, keepsBySlot, alignedSlots }) {
  const layout = canvasById(canvasId);
  return (
    <div
      className={`stake-board stake-board--${layout.id}`}
      style={{
        gridTemplateColumns: `repeat(${layout.cols}, minmax(0, 1fr))`,
      }}
    >
      {layout.cells.map((slot, index) => {
        if (!slot) return <div key={`empty-${index}`} className="stake-board__empty" />;
        const nft = slot === 'imp' ? imp : keepsBySlot[slot];
        const aligned = alignedSlots?.has(slot);
        return (
          <div
            key={slot}
            className={`stake-board__cell${nft ? '' : ' stake-board__cell--open'}${
              aligned ? ' stake-board__cell--aligned' : ''
            }${slot === 'imp' ? ' stake-board__cell--imp' : ''}`}
          >
            {nft?.image ? <img src={nft.image} alt={nft.name} /> : <span>{slot === 'imp' ? 'Imp' : 'Keep'}</span>}
          </div>
        );
      })}
    </div>
  );
}

function CanvasDiagram({ canvasId }) {
  const layout = canvasById(canvasId);
  return (
    <div
      className={`stake-diagram stake-diagram--${layout.id}`}
      style={{ gridTemplateColumns: `repeat(${layout.cols}, 1fr)` }}
      aria-hidden="true"
    >
      {layout.cells.map((slot, index) => (
        <span
          key={`${slot || 'x'}-${index}`}
          className={!slot ? 'is-empty' : slot === 'imp' ? 'is-imp' : 'is-keep'}
        />
      ))}
    </div>
  );
}

export default function StakingPage() {
  const { walletAccount, openWalletMenu } = useOutletContext();
  const { signMessageAsync } = useSignMessage();
  const [ownedImplingz, setOwnedImplingz] = useState([]);
  const [ownedKeeps, setOwnedKeeps] = useState([]);
  const [loadingNfts, setLoadingNfts] = useState(false);
  const [nftError, setNftError] = useState('');
  const [balance, setBalance] = useState(0);
  const [lifetimeEarned, setLifetimeEarned] = useState(0);
  const [stakes, setStakes] = useState([]);
  const [stateError, setStateError] = useState('');
  const [canvasId, setCanvasId] = useState('pair');
  const [durationId, setDurationId] = useState('7d');
  const [selectedImpId, setSelectedImpId] = useState('');
  const [keepSlots, setKeepSlots] = useState({});
  const [busy, setBusy] = useState('');
  const [status, setStatus] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const [confirmStake, setConfirmStake] = useState(null);

  const layout = canvasById(canvasId);
  const duration = durationById(durationId);
  const selectedImp = ownedImplingz.find((imp) => imp.id === selectedImpId) ?? null;
  const selectedKeeps = useMemo(
    () => keepsFromSlots(layout, keepSlots, ownedKeeps),
    [layout, keepSlots, ownedKeeps]
  );
  const keepsBySlot = useMemo(() => {
    const next = {};
    layout.keepSlots.forEach((slot) => {
      const keep = ownedKeeps.find((item) => item.key === keepSlots[slot]);
      if (keep) next[slot] = keep;
    });
    return next;
  }, [layout, keepSlots, ownedKeeps]);
  const alignedSlots = useMemo(() => {
    const next = new Set();
    if (!selectedImp) return next;
    Object.entries(keepsBySlot).forEach(([slot, keep]) => {
      if (isAlignedPair(selectedImp.body, keep.tileset)) next.add(slot);
    });
    return next;
  }, [selectedImp, keepsBySlot]);
  const estimate = useMemo(
    () => estimateStake({ imp: selectedImp, keeps: selectedKeeps, canvas: layout, duration }),
    [selectedImp, selectedKeeps, layout, duration]
  );
  const matchTilesets = selectedImp ? alignedTilesets(selectedImp.body) : [];
  const lockedKeys = useMemo(() => {
    const keys = new Set();
    stakes
      .filter((stake) => stake.status === 'active')
      .forEach((stake) => {
        keys.add(tokenKey(stake.imp_contract, stake.imp_token_id));
        (stake.keeps || []).forEach((keep) => keys.add(tokenKey(keep.contract, keep.id)));
      });
    return keys;
  }, [stakes]);
  const availableImps = ownedImplingz.filter(
    (imp) => !lockedKeys.has(tokenKey(imp.contract, imp.id))
  );
  const availableKeeps = ownedKeeps.filter((keep) => !lockedKeys.has(keep.key));
  const canStake =
    Boolean(walletAccount && selectedImp && selectedKeeps.length === layout.keepCount && !busy);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    setKeepSlots({});
  }, [canvasId]);

  useEffect(() => {
    setSelectedImpId((current) => {
      const unlocked = ownedImplingz.filter(
        (imp) => !lockedKeys.has(tokenKey(imp.contract, imp.id))
      );
      return unlocked.some((imp) => imp.id === current) ? current : unlocked[0]?.id || '';
    });
  }, [ownedImplingz, lockedKeys]);

  useEffect(() => {
    if (!walletAccount) {
      setOwnedImplingz([]);
      setOwnedKeeps([]);
      setSelectedImpId('');
      setKeepSlots({});
      setStakes([]);
      setBalance(0);
      setLifetimeEarned(0);
      return undefined;
    }

    const controller = new AbortController();
    setLoadingNfts(true);
    setNftError('');
    setStateError('');

    fetchStakingState(walletAccount, { signal: controller.signal })
      .then((data) => {
        setBalance(Number(data.balance ?? 0));
        setLifetimeEarned(Number(data.lifetimeEarned ?? 0));
        setStakes(data.stakes ?? []);
      })
      .catch((error) => {
        if (error.name !== 'AbortError') {
          setStateError(error.message || 'Could not load staking state.');
        }
      });

    Promise.all([
      fetch(`/api/implingz?owner=${encodeURIComponent(walletAccount)}`, {
        signal: controller.signal,
      }).then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'Could not load your IMPLINGz.');
        return mapOwnedImplingz(data.items ?? []);
      }),
      fetch(`/api/keeps?owner=${encodeURIComponent(walletAccount)}&all=1`, {
        signal: controller.signal,
      }).then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'Could not load your Imp Keeps.');
        return mapOwnedKeeps(data.items ?? []);
      }),
    ])
      .then(([implingz, keeps]) => {
        setOwnedImplingz(implingz);
        setOwnedKeeps(keeps);
        setSelectedImpId((current) =>
          implingz.some((imp) => imp.id === current) ? current : implingz[0]?.id || ''
        );
      })
      .catch((error) => {
        if (error.name !== 'AbortError') {
          setNftError(error.message || 'Could not load your NFTs.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingNfts(false);
      });

    return () => controller.abort();
  }, [walletAccount]);

  function toggleKeep(keep) {
    setKeepSlots((current) => {
      const already = Object.entries(current).find(([, key]) => key === keep.key);
      if (already) {
        const next = { ...current };
        delete next[already[0]];
        return next;
      }
      const empty = layout.keepSlots.find((slot) => !current[slot]);
      if (!empty) return current;
      return { ...current, [empty]: keep.key };
    });
  }

  async function signAndStake() {
    if (!canStake) return;
    setBusy('stake');
    setStatus('Preparing a wallet signature…');
    try {
      const { nonce } = await requestStakeChallenge(walletAccount);
      const keepKeys = selectedKeeps.map((keep) => tokenKey(keep.contract, keep.id));
      const message = buildStakeMessage({
        walletAddress: walletAccount,
        canvasId,
        durationId,
        impTokenId: selectedImp.id,
        keepKeys,
        nonce,
      });
      const signature = await signMessageAsync({ message });
      setStatus('Composing your squad canvas…');
      let canvasImage = '';
      try {
        canvasImage = await composeStakeCanvas({
          canvasId,
          imp: selectedImp,
          keepsBySlot,
          alignedSlots,
        });
      } catch {
        canvasImage = '';
      }
      setStatus('Locking the stake…');
      const result = await submitStake({
        walletAddress: walletAccount,
        canvasId,
        durationId,
        impTokenId: selectedImp.id,
        impImage: selectedImp.image,
        keeps: layout.keepSlots.map((slot) => ({ ...keepsBySlot[slot], slot })),
        canvasImage,
        nonce,
        signature,
      });
      setStakes((current) => [result.stake, ...current.filter((item) => item.id !== result.stake.id)]);
      setKeepSlots({});
      setStatus(`Locked for ${duration.label}. Unstaking early forfeits all ImpCoin.`);
    } catch (error) {
      setStatus(
        error?.code === 4001
          ? 'Staking signature was cancelled.'
          : error?.message || 'This squad could not be staked.'
      );
    } finally {
      setBusy('');
    }
  }

  async function signControl(action, stake) {
    setBusy(`${action}:${stake.id}`);
    setStatus(action === 'claim' ? 'Claiming ImpCoin…' : 'Forfeiting this lock…');
    try {
      const { nonce } = await requestStakeChallenge(walletAccount);
      const signature = await signMessageAsync({
        message: buildStakeControlMessage({
          walletAddress: walletAccount,
          action,
          stakeId: stake.id,
          nonce,
        }),
      });
      const result = await submitStakeControl({
        action,
        walletAddress: walletAccount,
        stakeId: stake.id,
        nonce,
        signature,
      });
      setStakes((current) => current.map((item) => (item.id === stake.id ? result.stake : item)));
      if (action === 'claim') {
        setBalance(Number(result.balance ?? 0));
        setLifetimeEarned(Number(result.lifetimeEarned ?? 0));
        setStatus(`Claimed ${formatImpCoin(result.payout)}.`);
      } else {
        setStatus(`Unstaked. ${formatImpCoin(result.forfeited)} was forfeited.`);
      }
    } catch (error) {
      setStatus(
        error?.code === 4001
          ? 'Signature was cancelled.'
          : error?.message || 'This stake could not be updated.'
      );
    } finally {
      setBusy('');
      setConfirmStake(null);
    }
  }

  const activeStakes = stakes.filter((stake) => stake.status === 'active');

  return (
    <div className="staking-page">
      <div className="staking-page__inner">
        <header className="adventures-page__header">
          <p className="adventures-page__eyebrow">ImpCoin</p>
          <h1 className="adventures-page__title">Staking</h1>
          <p className="adventures-page__intro">
            Pair an Imp with Keeps from both Imp Keep collections. Matching Body colour to Keep
            Environment adds alignment modifiers. Finish the lock to earn ImpCoin, or unstake early
            and lose the whole reward.
          </p>
        </header>

        <section className="staking-balance">
          <div>
            <p className="adventure-panel__eyebrow">Wallet</p>
            <h2>{formatImpCoin(balance)}</h2>
            <p>{formatImpCoin(lifetimeEarned)} earned all-time</p>
          </div>
          <p>
            ImpCoin is the currency for upcoming IMPLINGz projects. Locks are signed with your
            wallet. Early unstake forfeits every ImpCoin from that canvas.
          </p>
        </section>

        {!walletAccount ? (
          <section className="staking-panel staking-panel--wide">
            <p className="staking-panel__message">Connect a wallet to load IMPLINGz and Imp Keeps.</p>
            <button type="button" className="staking-summary__action staking-summary__action--live" onClick={() => openWalletMenu?.()}>
              Connect wallet
            </button>
          </section>
        ) : null}

        {stateError ? (
          <p className="staking-panel__message staking-panel__message--error" role="alert">
            {stateError}
          </p>
        ) : null}

        {activeStakes.length > 0 ? (
          <section className="staking-panel staking-panel--wide">
            <div className="staking-panel__header">
              <p className="adventure-panel__eyebrow">Locked squads</p>
              <h2>Active stakes</h2>
              <p>These canvases stay locked until the timer ends. Unstaking now forfeits ImpCoin.</p>
            </div>
            <div className="staking-active">
              {activeStakes.map((stake) => {
                const left = Math.max(0, new Date(stake.unlocks_at).getTime() - now);
                const ready = left <= 0;
                const stakeLayout = canvasById(stake.canvas_id);
                const stakeKeeps = Object.fromEntries(
                  (stake.keeps || []).map((keep) => [keep.slot, keep])
                );
                const stakeAligned = new Set(
                  (stake.keeps || [])
                    .filter((keep) => isAlignedPair(stake.imp_body, keep.tileset))
                    .map((keep) => keep.slot)
                );
                return (
                  <article key={stake.id} className="staking-active__card">
                    {stake.canvas_image ? (
                      <img className="staking-active__art" src={stake.canvas_image} alt="" />
                    ) : (
                      <StakeBoard
                        canvasId={stake.canvas_id}
                        imp={{ name: `IMPLINGZ #${stake.imp_token_id}`, image: stake.imp_image }}
                        keepsBySlot={stakeKeeps}
                        alignedSlots={stakeAligned}
                      />
                    )}
                    <div className="staking-active__copy">
                      <h3>
                        {stakeLayout.title} · {formatImpCoin(stake.estimated_payout)}
                      </h3>
                      <p>
                        {stake.imp_body} {stake.imp_tier} · {stake.aligned_count} aligned Keep
                        {stake.aligned_count === 1 ? '' : 's'}
                      </p>
                      <p>{ready ? 'Ready to claim' : `Unlocks in ${formatRemaining(left)}`}</p>
                      <div className="staking-active__actions">
                        {ready ? (
                          <button
                            type="button"
                            className="staking-summary__action staking-summary__action--live"
                            disabled={Boolean(busy)}
                            onClick={() => signControl('claim', stake)}
                          >
                            {busy === `claim:${stake.id}` ? 'Claiming…' : 'Claim ImpCoin'}
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="staking-summary__action staking-summary__action--danger"
                            disabled={Boolean(busy)}
                            onClick={() => setConfirmStake(stake)}
                          >
                            Unstake and forfeit
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ) : null}

        <section className="staking-panel staking-panel--wide">
          <div className="staking-panel__header">
            <p className="adventure-panel__eyebrow">Step 1</p>
            <h2>Choose a canvas</h2>
            <p>The layout is locked in with the stake and becomes the squad image.</p>
          </div>
          <div className="staking-canvases">
            {Object.values(CANVAS_LAYOUTS).map((option) => (
              <button
                key={option.id}
                type="button"
                className={`staking-canvas${canvasId === option.id ? ' staking-canvas--selected' : ''}`}
                onClick={() => setCanvasId(option.id)}
              >
                <CanvasDiagram canvasId={option.id} />
                <strong>{option.label}</strong>
                <span>{option.description}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="staking-preview-wrap">
          <StakeBoard
            canvasId={canvasId}
            imp={selectedImp}
            keepsBySlot={keepsBySlot}
            alignedSlots={alignedSlots}
          />
          <p>
            {selectedKeeps.length}/{layout.keepCount} Keeps placed
            {estimate.alignedCount ? ` · ${estimate.alignedCount} aligned` : ''}
          </p>
        </section>

        <div className="staking-layout">
          <section className="staking-panel">
            <div className="staking-panel__header">
              <p className="adventure-panel__eyebrow">Step 2</p>
              <h2>Choose an Imp</h2>
              <p>One Imp sits at the heart of the canvas.</p>
            </div>
            {loadingNfts ? <p className="staking-panel__message">Loading IMPLINGz…</p> : null}
            {nftError ? (
              <p className="staking-panel__message staking-panel__message--error" role="alert">
                {nftError}
              </p>
            ) : null}
            {!loadingNfts && walletAccount && availableImps.length === 0 ? (
              <p className="staking-panel__message">No free IMPLINGz in this wallet.</p>
            ) : null}
            <div className="staking-grid">
              {availableImps.map((imp) => (
                <button
                  key={imp.id}
                  type="button"
                  className={`staking-card${selectedImpId === imp.id ? ' staking-card--selected' : ''}`}
                  onClick={() => setSelectedImpId(imp.id)}
                >
                  {imp.image ? <img src={imp.image} alt={imp.name} /> : null}
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
              <p className="adventure-panel__eyebrow">Step 3</p>
              <h2>Choose Keeps</h2>
              <p>
                Select {layout.keepCount} Keep{layout.keepCount === 1 ? '' : 's'} after the Imp. Gold
                rings mark alignment with {selectedImp?.body || 'the Imp'}.
              </p>
            </div>
            {!loadingNfts && walletAccount && availableKeeps.length === 0 ? (
              <p className="staking-panel__message">No free Imp Keeps in this wallet.</p>
            ) : null}
            <div className="staking-grid">
              {availableKeeps.map((keep) => {
                const aligned = selectedImp ? isAlignedPair(selectedImp.body, keep.tileset) : false;
                const selected = Object.values(keepSlots).includes(keep.key);
                return (
                  <button
                    key={keep.key}
                    type="button"
                    className={`staking-card${selected ? ' staking-card--selected' : ''}${
                      aligned ? ' staking-card--aligned' : ''
                    }`}
                    onClick={() => toggleKeep(keep)}
                  >
                    {keep.image ? <img src={keep.image} alt={`${keep.name} ${keep.biome}`} /> : null}
                    <span className="staking-card__name">{keep.name}</span>
                    <span className="staking-card__meta">
                      {keep.biome || keep.tileset}
                      {keep.version === 'v2' ? ' · v2' : ''}
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
            <p className="adventure-panel__eyebrow">Step 4</p>
            <h2>Lock time</h2>
            <p>Longer locks pay more ImpCoin. The timer starts when you sign.</p>
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
            <p className="adventure-panel__eyebrow">Lock estimate</p>
            <h2>{selectedImp ? formatImpCoin(estimate.payout) : 'Pick an Imp'}</h2>
            <p>
              {selectedImp ? `${selectedImp.name} · ${layout.title}` : 'Choose a canvas, Imp, and Keeps.'}
              {selectedKeeps.length
                ? ` · ${estimate.alignedCount}/${selectedKeeps.length} aligned`
                : ''}
            </p>
          </div>
          <ul className="staking-summary__mods">
            <li>
              <span>Duration</span>
              <strong>{estimate.durationMultiplier.toFixed(2)}x</strong>
            </li>
            <li>
              <span>Canvas</span>
              <strong>{estimate.canvasMultiplier.toFixed(2)}x</strong>
            </li>
            <li>
              <span>Keeps / align</span>
              <strong>{estimate.keepMultiplier.toFixed(2)}x</strong>
            </li>
            <li>
              <span>Tier</span>
              <strong>{selectedImp?.tier || '—'}</strong>
            </li>
          </ul>
          {selectedImp ? (
            <p className="staking-summary__hint">
              {selectedImp.body} aligns with {matchTilesets.join(', ') || 'no listed tilesets'}. Early
              unstake forfeits the full {formatImpCoin(estimate.payout)}.
            </p>
          ) : null}
          <button
            type="button"
            className={`staking-summary__action${canStake ? ' staking-summary__action--live' : ''}`}
            disabled={!canStake}
            onClick={signAndStake}
          >
            {busy === 'stake'
              ? 'Locking…'
              : canStake
                ? `Sign and stake for ${duration.label}`
                : `Place ${layout.keepCount} Keep${layout.keepCount === 1 ? '' : 's'} to stake`}
          </button>
        </section>
        {status ? <p className="staking-status">{status}</p> : null}

        <section className="staking-panel staking-panel--wide">
          <div className="staking-panel__header">
            <h2>Alignment chart</h2>
            <p>Imp Body colour to Keep Environment. Each match adds an extra ImpCoin modifier.</p>
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

      {confirmStake ? (
        <div className="staking-confirm" role="dialog" aria-modal="true" aria-labelledby="forfeit-title">
          <div className="staking-confirm__panel">
            <p className="adventure-panel__eyebrow">Forfeit</p>
            <h2 id="forfeit-title">Unstake and lose the reward?</h2>
            <p>
              This lock still has {formatImpCoin(confirmStake.estimated_payout)} waiting. Unstaking
              now releases the NFTs and forfeits all of it.
            </p>
            <div className="staking-confirm__actions">
              <button type="button" onClick={() => setConfirmStake(null)}>
                Keep staking
              </button>
              <button
                type="button"
                className="staking-summary__action staking-summary__action--danger"
                disabled={Boolean(busy)}
                onClick={() => signControl('unstake', confirmStake)}
              >
                {busy.startsWith('unstake:') ? 'Unstaking…' : 'Unstake and forfeit'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
