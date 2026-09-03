import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useSignMessage } from 'wagmi';
import collection from '../data/collection.json';
import { resolveImplingTier } from '../lib/hashMining';
import { composeStakeCanvas, downloadPngFromImageSrc } from '../lib/stakeCanvas';
import {
  ALIGNMENTS,
  ALIGNMENT_BONUS_PER_KEEP,
  alignmentLabels,
  BASE_IMPCOIN_PER_DAY,
  CANVAS_LAYOUTS,
  canvasById,
  durationById,
  durationLabel,
  estimatedLockPayout,
  estimateStake,
  formatImpCoin,
  formatLockRemaining,
  formatRate,
  formatStakedFor,
  isAlignedPair,
  isRobinsLair,
  isStakeLocked,
  isVoidKeep,
  keepsHaveRobinsLair,
  keepsHaveVoid,
  lockMultiplierFor,
  pendingExactFromStake,
  pendingFromStake,
  displayPendingAmount,
  ROBINS_LAIR_MULTIPLIER,
  STAKE_DURATIONS,
  STAKING_IMPLINGZ_ADDRESS,
  stakeUnlocksAt,
  tokenKey,
  VOID_MULTIPLIER,
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
  const [canvasId, setCanvasId] = useState('solo');
  const [durationId, setDurationId] = useState('7d');
  const [selectedImpId, setSelectedImpId] = useState('');
  const [keepSlots, setKeepSlots] = useState({});
  const [busy, setBusy] = useState('');
  const [status, setStatus] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const [confirmStake, setConfirmStake] = useState(null);
  const [nftRefresh, setNftRefresh] = useState(0);

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
    () => estimateStake({ imp: selectedImp, keeps: selectedKeeps, durationId }),
    [selectedImp, selectedKeeps, durationId]
  );
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
  const canStakeAll = Boolean(walletAccount && availableImps.length > 0 && !busy);
  const soloLockEstimate = useMemo(
    () => estimateStake({ imp: availableImps[0] || selectedImp, keeps: [], durationId }),
    [availableImps, selectedImp, durationId]
  );

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!walletAccount) return undefined;
    let lastRefresh = Date.now();
    const refreshWalletNfts = () => {
      if (document.visibilityState !== 'visible') return;
      const now = Date.now();
      if (now - lastRefresh < 4000) return;
      lastRefresh = now;
      setNftRefresh((value) => value + 1);
    };
    document.addEventListener('visibilitychange', refreshWalletNfts);
    window.addEventListener('focus', refreshWalletNfts);
    return () => {
      document.removeEventListener('visibilitychange', refreshWalletNfts);
      window.removeEventListener('focus', refreshWalletNfts);
    };
  }, [walletAccount]);

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

    const cacheBust = `fresh=${Date.now()}`;
    const nftFetch = { signal: controller.signal, cache: 'no-store' };

    const loadImplingz = async () => {
      let lastError = new Error('Could not load your IMPLINGz.');
      for (let attempt = 0; attempt < 2; attempt += 1) {
        if (controller.signal.aborted) return [];
        try {
          const response = await fetch(
            `/api/implingz?owner=${encodeURIComponent(walletAccount)}&${cacheBust}`,
            nftFetch
          );
          const data = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(data.error || 'Could not load your IMPLINGz.');
          return mapOwnedImplingz(data.items ?? []);
        } catch (error) {
          if (error?.name === 'AbortError') throw error;
          lastError = error instanceof Error ? error : lastError;
          if (attempt === 0) await new Promise((resolve) => window.setTimeout(resolve, 600));
        }
      }
      throw lastError;
    };

    const loadKeeps = async () => {
      let lastError = new Error('Could not load your Imp Keeps.');
      for (let attempt = 0; attempt < 2; attempt += 1) {
        if (controller.signal.aborted) return [];
        try {
          const response = await fetch(
            `/api/keeps?owner=${encodeURIComponent(walletAccount)}&all=1&${cacheBust}`,
            nftFetch
          );
          const data = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(data.error || 'Could not load your Imp Keeps.');
          return mapOwnedKeeps(data.items ?? []);
        } catch (error) {
          if (error?.name === 'AbortError') throw error;
          lastError = error instanceof Error ? error : lastError;
          if (attempt === 0) await new Promise((resolve) => window.setTimeout(resolve, 600));
        }
      }
      throw lastError;
    };

    const implingzRequest = loadImplingz()
      .then((implingz) => {
        setOwnedImplingz(implingz);
      })
      .catch((error) => {
        if (error.name !== 'AbortError') {
          setNftError(error.message || 'Could not load your NFTs.');
        }
      });

    const keepsRequest = loadKeeps()
      .then((keeps) => {
        setOwnedKeeps(keeps);
      })
      .catch((error) => {
        if (error.name !== 'AbortError') {
          setNftError((current) => current || error.message || 'Could not load your Imp Keeps.');
        }
      });

    Promise.allSettled([implingzRequest, keepsRequest]).finally(() => {
      if (!controller.signal.aborted) setLoadingNfts(false);
    });

    return () => controller.abort();
  }, [walletAccount, nftRefresh]);

  function toggleKeep(keep) {
    if (lockedKeys.has(keep.key)) return;
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

  async function stakeOneImp({
    imp,
    stakeCanvasId,
    stakeDurationId,
    keeps,
    keepsForCanvas,
    alignedForCanvas,
  }) {
    const { nonce } = await requestStakeChallenge(walletAccount);
    const keepKeys = keeps.map((keep) => tokenKey(keep.contract, keep.id));
    const message = buildStakeMessage({
      walletAddress: walletAccount,
      canvasId: stakeCanvasId,
      durationId: stakeDurationId,
      impTokenId: imp.id,
      keepKeys,
      nonce,
    });
    const signature = await signMessageAsync({ message });
    let canvasImage = '';
    try {
      canvasImage = await composeStakeCanvas({
        canvasId: stakeCanvasId,
        imp,
        keepsBySlot: keepsForCanvas,
        alignedSlots: alignedForCanvas,
      });
    } catch {
      canvasImage = '';
    }
    return submitStake({
      walletAddress: walletAccount,
      canvasId: stakeCanvasId,
      durationId: stakeDurationId,
      impTokenId: imp.id,
      impImage: imp.image,
      keeps,
      canvasImage,
      nonce,
      signature,
    });
  }

  async function signAndStake() {
    if (!canStake) return;
    setBusy('stake');
    setStatus('Preparing a wallet signature…');
    try {
      const result = await stakeOneImp({
        imp: selectedImp,
        stakeCanvasId: canvasId,
        stakeDurationId: duration.id,
        keeps: layout.keepSlots.map((slot) => ({ ...keepsBySlot[slot], slot })),
        keepsForCanvas: keepsBySlot,
        alignedForCanvas: alignedSlots,
      });
      setStakes((current) => [result.stake, ...current.filter((item) => item.id !== result.stake.id)]);
      setKeepSlots({});
      setStatus(
        `Staked for ${durationLabel(result.stake?.duration_id, result.stake?.duration_days)}. Accruing ${formatRate(result.stake?.daily_rate || estimate.dailyRate)}.`
      );
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

  async function signAndStakeAll() {
    if (!canStakeAll) return;
    const queue = [...availableImps];
    const total = queue.length;
    setBusy('stake-all');
    setCanvasId('solo');
    setKeepSlots({});
    setStatus(`Staking all ${total} Imp${total === 1 ? '' : 's'} as Solo · ${duration.label}…`);

    let stakedCount = 0;
    try {
      for (let index = 0; index < queue.length; index += 1) {
        const imp = queue[index];
        setSelectedImpId(imp.id);
        setStatus(`Sign to stake ${index + 1}/${total}: ${imp.name}…`);
        const result = await stakeOneImp({
          imp,
          stakeCanvasId: 'solo',
          stakeDurationId: duration.id,
          keeps: [],
          keepsForCanvas: {},
          alignedForCanvas: new Set(),
        });
        stakedCount += 1;
        setStakes((current) => [
          result.stake,
          ...current.filter((item) => item.id !== result.stake.id),
        ]);
      }
      setStatus(
        stakedCount === total
          ? `Staked all ${total} Imp${total === 1 ? '' : 's'} as Solo for ${duration.label}. Each earns ${formatRate(soloLockEstimate.dailyRate)}.`
          : `Staked ${stakedCount}/${total} Imps.`
      );
    } catch (error) {
      setStatus(
        error?.code === 4001
          ? stakedCount > 0
            ? `Staking stopped after ${stakedCount}/${total}. Signature cancelled.`
            : 'Stake-all signature was cancelled.'
          : stakedCount > 0
            ? `Staked ${stakedCount}/${total} before an error: ${error?.message || 'could not finish.'}`
            : error?.message || 'Could not stake all Imps.'
      );
    } finally {
      setBusy('');
    }
  }

  async function signUnstake(stake) {
    if (isStakeLocked(stake, Date.now())) {
      setStatus(`This squad is locked for ${formatLockRemaining(stakeUnlocksAt(stake) - Date.now())}.`);
      setConfirmStake(null);
      return;
    }
    setBusy(`unstake:${stake.id}`);
    setStatus('Unstaking…');
    try {
      const { nonce } = await requestStakeChallenge(walletAccount);
      const signature = await signMessageAsync({
        message: buildStakeControlMessage({
          walletAddress: walletAccount,
          action: 'unstake',
          stakeId: stake.id,
          nonce,
        }),
      });
      const result = await submitStakeControl({
        action: 'unstake',
        walletAddress: walletAccount,
        stakeId: stake.id,
        nonce,
        signature,
      });
      setStakes((current) => current.map((item) => (item.id === stake.id ? result.stake : item)));
      setBalance(Number(result.balance ?? balance));
      setLifetimeEarned(Number(result.lifetimeEarned ?? lifetimeEarned));
      setStatus(
        result.payout
          ? `Unstaked and claimed ${formatImpCoin(result.payout)}.`
          : 'Unstaked. The NFTs are free to move again.'
      );
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

  async function downloadStakePng(stake) {
    setBusy(`png:${stake.id}`);
    setStatus('Preparing PNG…');
    try {
      const keepsBySlot = Object.fromEntries((stake.keeps || []).map((keep) => [keep.slot, keep]));
      const alignedSlots = new Set(
        (stake.keeps || [])
          .filter((keep) => isAlignedPair(stake.imp_body, keep.tileset))
          .map((keep) => keep.slot)
      );
      const src =
        stake.canvas_image ||
        (await composeStakeCanvas({
          canvasId: stake.canvas_id,
          imp: { name: `IMPLINGZ #${stake.imp_token_id}`, image: stake.imp_image },
          keepsBySlot,
          alignedSlots,
        }));
      await downloadPngFromImageSrc(src, `implingz-stake-${stake.imp_token_id}.png`);
      setStatus('Canvas PNG saved.');
    } catch (error) {
      setStatus(error?.message || 'Could not download the canvas PNG.');
    } finally {
      setBusy('');
    }
  }

  const activeStakes = stakes.filter((stake) => stake.status === 'active');
  const pendingTotal = activeStakes.reduce((sum, stake) => sum + pendingFromStake(stake, now), 0);
  const pendingExactTotal = activeStakes.reduce(
    (sum, stake) => sum + pendingExactFromStake(stake, now),
    0
  );
  const pendingShown =
    pendingTotal > 0
      ? pendingTotal
      : pendingExactTotal > 0
        ? Math.round(pendingExactTotal * 10) / 10
        : 0;
  const earnedSoFar = lifetimeEarned + pendingTotal;

  return (
    <div className="staking-page">
      <div className="staking-page__inner">
        <header className="adventures-page__header">
          <p className="adventures-page__eyebrow">ImpCoin</p>
          <h1 className="adventures-page__title">Staking</h1>
          <p className="adventures-page__intro">
            Stake an Imp on its own, or pair it with Keeps, then choose a lock. NFTs stay in your
            wallet. ImpCoin accrues on each squad while it is staked. Pending ImpCoin is added to this
            wallet when you unstake. Longer locks pay more ImpCoin per day. Matching Body colour to
            Keep environment adds ImpCoin. Void is a {VOID_MULTIPLIER}x bonus for any Imp.
            Robin&apos;s Lair is a {ROBINS_LAIR_MULTIPLIER}x bonus for any Imp.
          </p>
        </header>

        <section className="staking-balance">
          <div>
            <p className="adventure-panel__eyebrow">Wallet</p>
            <h2>{formatImpCoin(balance + pendingTotal)}</h2>
            <p>
              {formatImpCoin(balance)} claimed
              {walletAccount ? ` · ${formatImpCoin(pendingShown)} pending from staking` : ''}
            </p>
            <p>{formatImpCoin(earnedSoFar)} earned all-time</p>
          </div>
          <p>
            ImpCoin is an in-game balance, not an on-chain token. Pending ImpCoin is paid into this
            wallet when you unstake. Transferring a staked NFT burns pending ImpCoin from that squad.
          </p>
          {walletAccount ? (
            <button
              type="button"
              className="staking-balance__refresh"
              disabled={loadingNfts}
              onClick={() => setNftRefresh((value) => value + 1)}
            >
              {loadingNfts ? 'Reading wallet…' : 'Refresh wallet NFTs'}
            </button>
          ) : null}
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
              <p className="adventure-panel__eyebrow">Staked squads</p>
              <h2>Active stakes</h2>
              <p>NFTs stay in the wallet while ImpCoin accrues. Unstake to add pending ImpCoin to this wallet.</p>
            </div>
            <div className="staking-active">
              {activeStakes.map((stake) => {
                const pending = displayPendingAmount(stake, now);
                const stakedFor = formatStakedFor(now - new Date(stake.started_at).getTime());
                const locked = isStakeLocked(stake, now);
                const lockCopy = locked
                  ? formatLockRemaining(stakeUnlocksAt(stake) - now)
                  : 'Ready to unstake';
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
                        {stakeLayout.title} · {formatRate(stake.daily_rate)}
                      </h3>
                      <p>
                        {stake.imp_body} {stake.imp_tier}
                        {Number(stake.keep_count) === 0
                          ? ' · Solo Imp'
                          : ` · ${stake.aligned_count} aligned Keep${stake.aligned_count === 1 ? '' : 's'}`}
                        {keepsHaveVoid(stake.keeps) || stake.has_void ? ` · Void ${VOID_MULTIPLIER}x` : ''}
                        {keepsHaveRobinsLair(stake.keeps) ? ` · Robin's Lair ${ROBINS_LAIR_MULTIPLIER}x` : ''}
                      </p>
                      <p>
                        {durationLabel(stake.duration_id, stake.duration_days)} · {stakedFor} ·{' '}
                        {pending > 0 ? `${formatImpCoin(pending)} pending` : 'Accruing'}
                      </p>
                      <p>{lockCopy}</p>
                      <div className="staking-active__actions">
                        <button
                          type="button"
                          className="staking-summary__action staking-summary__action--live"
                          disabled={Boolean(busy)}
                          onClick={() => downloadStakePng(stake)}
                        >
                          {busy === `png:${stake.id}` ? 'Saving…' : 'Download PNG'}
                        </button>
                        <button
                          type="button"
                          className="staking-summary__action staking-summary__action--danger"
                          disabled={Boolean(busy) || locked}
                          onClick={() => setConfirmStake(stake)}
                        >
                          {locked ? lockCopy : 'Unstake'}
                        </button>
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
            <p>The layout is the squad image. Solo is just the Imp. Staking does not move the NFTs.</p>
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
            {layout.keepCount === 0
              ? 'Solo Imp'
              : `${selectedKeeps.length}/${layout.keepCount} Keeps placed`}
            {estimate.alignedCount ? ` · ${estimate.alignedCount} aligned` : ''}
            {estimate.hasVoid ? ` · Void ${VOID_MULTIPLIER}x` : ''}
            {estimate.hasRobinsLair ? ` · Robin's Lair ${ROBINS_LAIR_MULTIPLIER}x` : ''}
          </p>
        </section>

        <div className={`staking-layout${layout.keepCount === 0 ? ' staking-layout--solo' : ''}`}>
          <section className="staking-panel">
            <div className="staking-panel__header">
              <p className="adventure-panel__eyebrow">Step 2</p>
              <h2>Choose an Imp</h2>
              <p>
                {layout.keepCount === 0
                  ? 'This stake is just the Imp.'
                  : 'One Imp sits at the heart of the canvas.'}
              </p>
            </div>
            {loadingNfts ? <p className="staking-panel__message">Loading IMPLINGz from your wallet…</p> : null}
            {nftError ? (
              <p className="staking-panel__message staking-panel__message--error" role="alert">
                {nftError}
              </p>
            ) : null}
            {!loadingNfts && !nftError && walletAccount && ownedImplingz.length === 0 ? (
              <p className="staking-panel__message">No IMPLINGz in this wallet.</p>
            ) : null}
            {!loadingNfts && walletAccount && ownedImplingz.length > 0 && availableImps.length === 0 ? (
              <p className="staking-panel__message">All IMPLINGz in this wallet are already staked.</p>
            ) : null}
            <div className="staking-grid">
              {ownedImplingz.map((imp) => {
                const staked = lockedKeys.has(tokenKey(imp.contract, imp.id));
                return (
                  <button
                    key={imp.id}
                    type="button"
                    className={`staking-card${selectedImpId === imp.id ? ' staking-card--selected' : ''}${
                      staked ? ' staking-card--staked' : ''
                    }`}
                    disabled={staked}
                    onClick={() => {
                      if (!staked) setSelectedImpId(imp.id);
                    }}
                  >
                    {imp.image ? <img src={imp.image} alt={imp.name} /> : null}
                    <span className="staking-card__name">{imp.name}</span>
                    <span className="staking-card__meta">
                      {staked ? 'Already staked' : `${imp.body} · ${imp.tier}`}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {layout.keepCount > 0 ? (
          <section className="staking-panel">
            <div className="staking-panel__header">
              <p className="adventure-panel__eyebrow">Step 3</p>
              <h2>Choose Keeps</h2>
              <p>
                Select {layout.keepCount} Keep{layout.keepCount === 1 ? '' : 's'} after the Imp. Gold
                rings mark a Body / Environment match.
              </p>
            </div>
            {loadingNfts ? <p className="staking-panel__message">Loading Imp Keeps from your wallet…</p> : null}
            {!loadingNfts && !nftError && walletAccount && ownedKeeps.length === 0 ? (
              <p className="staking-panel__message">No Imp Keeps in this wallet.</p>
            ) : null}
            {!loadingNfts && walletAccount && ownedKeeps.length > 0 && availableKeeps.length === 0 ? (
              <p className="staking-panel__message">All Imp Keeps in this wallet are already staked.</p>
            ) : null}
            <div className="staking-grid">
              {ownedKeeps.map((keep) => {
                const aligned = selectedImp ? isAlignedPair(selectedImp.body, keep.tileset) : false;
                const robin = isRobinsLair(keep.tileset);
                const voidKeep = isVoidKeep(keep.tileset);
                const selected = Object.values(keepSlots).includes(keep.key);
                const staked = lockedKeys.has(keep.key);
                return (
                  <button
                    key={keep.key}
                    type="button"
                    className={`staking-card${selected ? ' staking-card--selected' : ''}${
                      aligned && !staked ? ' staking-card--aligned' : ''
                    }${robin && !staked ? ' staking-card--robin' : ''}${
                      voidKeep && !staked ? ' staking-card--void' : ''
                    }${staked ? ' staking-card--staked' : ''}`}
                    disabled={staked}
                    onClick={() => toggleKeep(keep)}
                  >
                    {keep.image ? <img src={keep.image} alt={`${keep.name} ${keep.biome}`} /> : null}
                    <span className="staking-card__name">{keep.name}</span>
                    <span className="staking-card__meta">
                      {staked
                        ? 'Already staked'
                        : `${keep.biome || keep.tileset}${keep.version === 'v2' ? ' · v2' : ''}${
                            aligned ? ' · aligned' : ''
                          }${voidKeep ? ` · ${VOID_MULTIPLIER}x` : ''}${
                            robin ? ` · ${ROBINS_LAIR_MULTIPLIER}x` : ''
                          }`}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
          ) : null}
        </div>

        <section className="staking-panel staking-panel--wide">
          <div className="staking-panel__header">
            <p className="adventure-panel__eyebrow">
              {layout.keepCount === 0 ? 'Step 3' : 'Step 4'}
            </p>
            <h2>Choose a lock</h2>
            <p>
              Longer locks pay a higher daily rate. The squad stays staked until this lock ends.
              Transferring a staked NFT still burns pending ImpCoin.
            </p>
          </div>
          <div className="staking-durations">
            {STAKE_DURATIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`staking-duration${durationId === option.id ? ' staking-duration--selected' : ''}`}
                onClick={() => setDurationId(option.id)}
              >
                <strong>{option.label}</strong>
                <span>{option.detail}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="staking-summary">
          <div className="staking-summary__copy">
            <p className="adventure-panel__eyebrow">Daily rate</p>
            <h2>{formatRate(estimate.dailyRate)}</h2>
            <p>
              {selectedImp
                ? `${selectedImp.name} · ${layout.title} · ${duration.label}`
                : `Choose a canvas, Imp${layout.keepCount ? ', Keeps' : ''}, and lock.`}
              {selectedKeeps.length
                ? ` · ${estimate.alignedCount}/${selectedKeeps.length} aligned`
                : ''}
              {estimate.hasVoid ? ` · Void ${VOID_MULTIPLIER}x` : ''}
              {estimate.hasRobinsLair ? ` · Robin's Lair ${ROBINS_LAIR_MULTIPLIER}x` : ''}
              {` · Lock ${estimate.lockMultiplier}x`}
            </p>
          </div>
          <ul className="staking-summary__mods">
            <li>
              <span>Base</span>
              <strong>{BASE_IMPCOIN_PER_DAY} / day</strong>
            </li>
            <li>
              <span>Alignment</span>
              <strong>
                +{ALIGNMENT_BONUS_PER_KEEP} × {estimate.alignedCount}
              </strong>
            </li>
            <li>
              <span>Void</span>
              <strong>{estimate.hasVoid ? `${VOID_MULTIPLIER}x` : '—'}</strong>
            </li>
            <li>
              <span>Robin&apos;s Lair</span>
              <strong>{estimate.hasRobinsLair ? `${ROBINS_LAIR_MULTIPLIER}x` : '—'}</strong>
            </li>
            <li>
              <span>Lock</span>
              <strong>
                {estimate.lockMultiplier}x · {duration.label}
              </strong>
            </li>
          </ul>
          {selectedImp ? (
            <p className="staking-summary__hint">
              {layout.keepCount === 0
                ? `A solo Imp earns ${formatImpCoin(BASE_IMPCOIN_PER_DAY)} / day before lock. This ${duration.label.toLowerCase()} lock is ${estimate.lockMultiplier}x, so ${formatRate(estimate.dailyRate)}. Pair Keeps on another canvas for alignment, Void, and Robin's Lair bonuses. About ${formatImpCoin(estimatedLockPayout(estimate.dailyRate, duration.days))} if this Imp stays staked for the full ${duration.label.toLowerCase()}.`
                : `${selectedImp.body} matches ${alignmentLabels(selectedImp.body)}. This ${duration.label.toLowerCase()} lock is ${estimate.lockMultiplier}x. About ${formatImpCoin(estimatedLockPayout(estimate.dailyRate, duration.days))} if this squad stays staked for the full ${duration.label.toLowerCase()}. Transferring a staked NFT burns pending ImpCoin from this squad.`}
            </p>
          ) : null}
          <div className="staking-summary__actions">
            <button
              type="button"
              className={`staking-summary__action${canStake ? ' staking-summary__action--live' : ''}`}
              disabled={!canStake}
              onClick={signAndStake}
            >
              {busy === 'stake'
                ? 'Staking…'
                : canStake
                  ? 'Sign and stake'
                  : layout.keepCount === 0
                    ? 'Choose an Imp to stake'
                    : `Place ${layout.keepCount} Keep${layout.keepCount === 1 ? '' : 's'} to stake`}
            </button>
            <button
              type="button"
              className={`staking-summary__action staking-summary__action--secondary${
                canStakeAll ? ' staking-summary__action--live' : ''
              }`}
              disabled={!canStakeAll}
              onClick={signAndStakeAll}
              title={`Stake every unstaked Imp as Solo with the ${duration.label} lock. You will sign once per Imp.`}
            >
              {busy === 'stake-all'
                ? 'Staking all…'
                : canStakeAll
                  ? `Stake all ${availableImps.length} Imp${availableImps.length === 1 ? '' : 's'}`
                  : 'No Imps left to stake'}
            </button>
          </div>
        </section>
        {status ? <p className="staking-status">{status}</p> : null}

        <section className="staking-panel staking-panel--wide">
          <div className="staking-panel__header">
            <h2>Alignment chart</h2>
            <p>
              Each aligned Keep adds +{ALIGNMENT_BONUS_PER_KEEP} ImpCoin / day. A solo Imp still earns
              the base {BASE_IMPCOIN_PER_DAY} ImpCoin / day before lock. Gold and Diamond match every
              environment. Any Imp with Void gets a {VOID_MULTIPLIER}x bonus. Any Imp with
              Robin&apos;s Lair gets a {ROBINS_LAIR_MULTIPLIER}x bonus. Longer locks multiply the
              daily rate up to {lockMultiplierFor('90d')}x.
            </p>
          </div>
          <div className="staking-alignments">
            {Object.keys(ALIGNMENTS).map((body) => (
              <div
                key={body}
                className={`staking-alignments__row${
                  selectedImp?.body === body ? ' staking-alignments__row--active' : ''
                }`}
              >
                <strong>{body}</strong>
                <span>{alignmentLabels(body)}</span>
              </div>
            ))}
            <div className="staking-alignments__row">
              <strong>All Impz</strong>
              <span>Void · {VOID_MULTIPLIER}x</span>
            </div>
            <div className="staking-alignments__row">
              <strong>All Impz</strong>
              <span>Robin&apos;s Lair · {ROBINS_LAIR_MULTIPLIER}x</span>
            </div>
            {STAKE_DURATIONS.map((option) => (
              <div
                key={option.id}
                className={`staking-alignments__row${
                  durationId === option.id ? ' staking-alignments__row--active' : ''
                }`}
              >
                <strong>{option.label}</strong>
                <span>Lock · {option.multiplier}x</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {confirmStake ? (
        <div className="staking-confirm" role="dialog" aria-modal="true" aria-labelledby="unstake-title">
          <div className="staking-confirm__panel">
            <p className="adventure-panel__eyebrow">Unstake</p>
            <h2 id="unstake-title">Unstake this squad?</h2>
            <p>
              You will claim {formatImpCoin(Number(confirmStake.pending ?? pendingFromStake(confirmStake, now)))}{' '}
              now. The NFTs stay in your wallet and can be staked again.
            </p>
            <div className="staking-confirm__actions">
              <button type="button" onClick={() => setConfirmStake(null)}>
                Keep staking
              </button>
              <button
                type="button"
                className="staking-summary__action staking-summary__action--danger"
                disabled={Boolean(busy)}
                onClick={() => signUnstake(confirmStake)}
              >
                {busy.startsWith('unstake:') ? 'Unstaking…' : 'Unstake'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
