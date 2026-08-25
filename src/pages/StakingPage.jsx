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
  estimateStake,
  formatImpCoin,
  formatRate,
  formatStakedFor,
  isAlignedPair,
  isRobinsLair,
  isVoidKeep,
  keepsHaveRobinsLair,
  keepsHaveVoid,
  pendingFromStake,
  ROBINS_LAIR_MULTIPLIER,
  STAKING_IMPLINGZ_ADDRESS,
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
  const [canvasId, setCanvasId] = useState('pair');
  const [selectedImpId, setSelectedImpId] = useState('');
  const [keepSlots, setKeepSlots] = useState({});
  const [busy, setBusy] = useState('');
  const [status, setStatus] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const [confirmStake, setConfirmStake] = useState(null);

  const layout = canvasById(canvasId);
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
    () => estimateStake({ imp: selectedImp, keeps: selectedKeeps }),
    [selectedImp, selectedKeeps]
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
        cache: 'no-store',
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
      setStatus('Confirming the stake…');
      const result = await submitStake({
        walletAddress: walletAccount,
        canvasId,
        impTokenId: selectedImp.id,
        impImage: selectedImp.image,
        keeps: layout.keepSlots.map((slot) => ({ ...keepsBySlot[slot], slot })),
        canvasImage,
        nonce,
        signature,
      });
      setStakes((current) => [result.stake, ...current.filter((item) => item.id !== result.stake.id)]);
      setKeepSlots({});
      setStatus(`Staked. Accruing ${formatRate(result.stake?.daily_rate || estimate.dailyRate)}.`);
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

  async function signUnstake(stake) {
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

  return (
    <div className="staking-page">
      <div className="staking-page__inner">
        <header className="adventures-page__header">
          <p className="adventures-page__eyebrow">ImpCoin</p>
          <h1 className="adventures-page__title">Staking</h1>
          <p className="adventures-page__intro">
            Pair an Imp with Keeps. NFTs stay in your wallet. Sign to stake, then ImpCoin accrues
            while the squad is staked. Matching Body colour to Keep environment adds ImpCoin. Void is
            a {VOID_MULTIPLIER}x bonus for any Imp. Robin&apos;s Lair is a {ROBINS_LAIR_MULTIPLIER}x
            bonus for any Imp.
          </p>
        </header>

        <section className="staking-balance">
          <div>
            <p className="adventure-panel__eyebrow">Wallet</p>
            <h2>{formatImpCoin(balance)}</h2>
            <p>{formatImpCoin(lifetimeEarned)} earned all-time</p>
          </div>
          <p>
            ImpCoin is an in-game balance, not an on-chain token. Transferring a staked NFT burns
            pending ImpCoin from that squad.
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
              <p className="adventure-panel__eyebrow">Staked squads</p>
              <h2>Active stakes</h2>
              <p>NFTs stay in the wallet while ImpCoin accrues.</p>
            </div>
            <div className="staking-active">
              {activeStakes.map((stake) => {
                const pending = Number(stake.pending ?? pendingFromStake(stake, now));
                const stakedFor = formatStakedFor(now - new Date(stake.started_at).getTime());
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
                        {stake.imp_body} {stake.imp_tier} · {stake.aligned_count} aligned Keep
                        {stake.aligned_count === 1 ? '' : 's'}
                        {keepsHaveVoid(stake.keeps) || stake.has_void ? ` · Void ${VOID_MULTIPLIER}x` : ''}
                        {keepsHaveRobinsLair(stake.keeps) ? ` · Robin's Lair ${ROBINS_LAIR_MULTIPLIER}x` : ''}
                      </p>
                      <p>
                        {stakedFor} · {formatImpCoin(pending)} pending
                      </p>
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
                          disabled={Boolean(busy)}
                          onClick={() => setConfirmStake(stake)}
                        >
                          Unstake
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
            <p>The layout is the squad image. Staking does not move the NFTs.</p>
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
            {estimate.hasVoid ? ` · Void ${VOID_MULTIPLIER}x` : ''}
            {estimate.hasRobinsLair ? ` · Robin's Lair ${ROBINS_LAIR_MULTIPLIER}x` : ''}
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
                rings mark a Body / Environment match.
              </p>
            </div>
            {!loadingNfts && walletAccount && availableKeeps.length === 0 ? (
              <p className="staking-panel__message">No free Imp Keeps in this wallet.</p>
            ) : null}
            <div className="staking-grid">
              {availableKeeps.map((keep) => {
                const aligned = selectedImp ? isAlignedPair(selectedImp.body, keep.tileset) : false;
                const robin = isRobinsLair(keep.tileset);
                const voidKeep = isVoidKeep(keep.tileset);
                const selected = Object.values(keepSlots).includes(keep.key);
                return (
                  <button
                    key={keep.key}
                    type="button"
                    className={`staking-card${selected ? ' staking-card--selected' : ''}${
                      aligned ? ' staking-card--aligned' : ''
                    }${robin ? ' staking-card--robin' : ''}${voidKeep ? ' staking-card--void' : ''}`}
                    onClick={() => toggleKeep(keep)}
                  >
                    {keep.image ? <img src={keep.image} alt={`${keep.name} ${keep.biome}`} /> : null}
                    <span className="staking-card__name">{keep.name}</span>
                    <span className="staking-card__meta">
                      {keep.biome || keep.tileset}
                      {keep.version === 'v2' ? ' · v2' : ''}
                      {aligned ? ' · aligned' : ''}
                      {voidKeep ? ` · ${VOID_MULTIPLIER}x` : ''}
                      {robin ? ` · ${ROBINS_LAIR_MULTIPLIER}x` : ''}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        <section className="staking-summary">
          <div className="staking-summary__copy">
            <p className="adventure-panel__eyebrow">Daily rate</p>
            <h2>{selectedImp ? formatRate(estimate.dailyRate) : 'Pick an Imp'}</h2>
            <p>
              {selectedImp ? `${selectedImp.name} · ${layout.title}` : 'Choose a canvas, Imp, and Keeps.'}
              {selectedKeeps.length
                ? ` · ${estimate.alignedCount}/${selectedKeeps.length} aligned`
                : ''}
              {estimate.hasVoid ? ` · Void ${VOID_MULTIPLIER}x` : ''}
              {estimate.hasRobinsLair ? ` · Robin's Lair ${ROBINS_LAIR_MULTIPLIER}x` : ''}
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
          </ul>
          {selectedImp ? (
            <p className="staking-summary__hint">
              {selectedImp.body} matches {alignmentLabels(selectedImp.body)}. Transferring a staked
              NFT burns pending ImpCoin from this squad.
            </p>
          ) : null}
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
                : `Place ${layout.keepCount} Keep${layout.keepCount === 1 ? '' : 's'} to stake`}
          </button>
        </section>
        {status ? <p className="staking-status">{status}</p> : null}

        <section className="staking-panel staking-panel--wide">
          <div className="staking-panel__header">
            <h2>Alignment chart</h2>
            <p>
              Each aligned Keep adds +{ALIGNMENT_BONUS_PER_KEEP} ImpCoin / day. Gold and Diamond match
              every environment. Any Imp with Void gets a {VOID_MULTIPLIER}x bonus. Any Imp with
              Robin&apos;s Lair gets a {ROBINS_LAIR_MULTIPLIER}x bonus.
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
