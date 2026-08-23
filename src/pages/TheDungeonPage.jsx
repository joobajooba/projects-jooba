import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { usePublicClient, useWalletClient } from 'wagmi';
import { fetchKeepReplacement, requestKeepReplacementMint } from '../lib/adventuresApi';
import { keepOpenSeaCollectionUrl, keepOpenSeaItemUrl, tokenIdFromMintReceipt } from '../lib/dungeonKeep';
import {
  DUNGEON_KEEP_V1_ADDRESS,
  DUNGEON_KEEP_V2_ADDRESS,
  IMP_KEEPS_V2_ABI,
  classifyV1Keep,
  keepV2Configured,
  keepV2OpenSeaCollectionUrl,
} from '../lib/keepV2';
import { isBannedKeepWallet } from '../lib/keepV2Allowlist';
import { KEEP_V2_FIRST_VOID_ID, KEEP_V2_REPLACEMENTS, isKeepV2OpsWallet, replacementForWallet } from '../lib/keepV2Replacements';

export default function TheDungeonPage() {
  const { walletAccount } = useOutletContext();
  const publicClient = usePublicClient({ chainId: 4663 });
  const { data: walletClient } = useWalletClient({ chainId: 4663 });
  const [keeps, setKeeps] = useState([]);
  const [claimed, setClaimed] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [claimingId, setClaimingId] = useState('');
  const [replacement, setReplacement] = useState(null);
  const [opsGate, setOpsGate] = useState(null);
  const v2Ready = keepV2Configured();
  const banned = isBannedKeepWallet(walletAccount);
  const reservedReplacement = replacementForWallet(walletAccount);
  const showOps = isKeepV2OpsWallet(walletAccount);
  const showCreeBox = Boolean(reservedReplacement) && !showOps;

  const grouped = useMemo(() => {
    const eligible = [];
    const voided = [];
    keeps.forEach((keep) => {
      const kind = classifyV1Keep(keep.id, walletAccount);
      if (kind === 'eligible') eligible.push(keep);
      else if (reservedReplacement && Number(keep.id) === reservedReplacement.v1TokenId) return;
      else voided.push(keep);
    });
    return { eligible, voided };
  }, [keeps, walletAccount, reservedReplacement]);
  const eligibleKey = grouped.eligible.map((keep) => keep.id).join('|');

  useEffect(() => {
    if (!walletAccount) {
      setKeeps([]);
      setClaimed({});
      setReplacement(null);
      setOpsGate(null);
      return undefined;
    }

    const controller = new AbortController();
    setLoading(true);
    setError('');
    fetch(`/api/keeps?owner=${encodeURIComponent(walletAccount)}`, { signal: controller.signal })
      .then((response) => response.json().then((data) => ({ ok: response.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) throw new Error(data.error || 'Could not load your Imp Keeps.');
        setKeeps(data.items ?? []);
      })
      .catch((loadError) => {
        if (loadError.name === 'AbortError') return;
        setError(loadError.message || 'Could not load your Imp Keeps.');
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [walletAccount]);

  useEffect(() => {
    if (!v2Ready || !publicClient || grouped.eligible.length === 0) {
      setClaimed({});
      return undefined;
    }

    let cancelled = false;
    Promise.all(
      grouped.eligible.map(async (keep) => {
        const value = await publicClient.readContract({
          address: DUNGEON_KEEP_V2_ADDRESS,
          abi: IMP_KEEPS_V2_ABI,
          functionName: 'claimed',
          args: [BigInt(keep.id)],
        });
        return [keep.id, Boolean(value)];
      })
    )
      .then((rows) => {
        if (cancelled) return;
        setClaimed(Object.fromEntries(rows));
      })
      .catch(() => {
        if (!cancelled) setClaimed({});
      });

    return () => {
      cancelled = true;
    };
  }, [eligibleKey, publicClient, v2Ready]);

  useEffect(() => {
    if (!reservedReplacement || !walletAccount) {
      setReplacement(null);
      return undefined;
    }

    const controller = new AbortController();
    fetchKeepReplacement(walletAccount, { signal: controller.signal })
      .then((data) => setReplacement(data.replacement || null))
      .catch(() => {
        setReplacement({
          ...reservedReplacement,
          seed: reservedReplacement.seedHex,
          previewUrl: `/api/dungeon-preview?seed=${encodeURIComponent(reservedReplacement.seedHex)}&format=png&tokenId=${reservedReplacement.v1TokenId}`,
          nextTokenId: 0,
          mintable: false,
          alreadyMinted: false,
          reason: 'Could not check replacement status. Refresh in a moment.',
          contractAddress: DUNGEON_KEEP_V2_ADDRESS,
        });
      });

    return () => controller.abort();
  }, [reservedReplacement, walletAccount]);

  useEffect(() => {
    if (!showOps || !publicClient || !v2Ready) {
      if (!showOps) setOpsGate(null);
      return undefined;
    }

    let cancelled = false;
    const load = async () => {
      try {
        const cursor = Number(
          await publicClient.readContract({
            address: DUNGEON_KEEP_V2_ADDRESS,
            abi: IMP_KEEPS_V2_ABI,
            functionName: 'mintCursor',
          })
        );
        let nextTokenId = Number.isFinite(cursor) && cursor >= 1 ? cursor : 1;
        while (nextTokenId <= 2222) {
          try {
            await publicClient.readContract({
              address: DUNGEON_KEEP_V2_ADDRESS,
              abi: IMP_KEEPS_V2_ABI,
              functionName: 'ownerOf',
              args: [BigInt(nextTokenId)],
            });
            nextTokenId += 1;
          } catch {
            break;
          }
        }
        if (nextTokenId > 2222) nextTokenId = 0;
        const nextIsHonest = nextTokenId
          ? Boolean(
              await publicClient.readContract({
                address: DUNGEON_KEEP_V2_ADDRESS,
                abi: IMP_KEEPS_V2_ABI,
                functionName: 'isAllowed',
                args: [BigInt(nextTokenId)],
              })
            )
          : false;
        const creeMinted = Boolean(
          await publicClient.readContract({
            address: DUNGEON_KEEP_V2_ADDRESS,
            abi: IMP_KEEPS_V2_ABI,
            functionName: 'seedUsed',
            args: [BigInt(KEEP_V2_REPLACEMENTS[0].seedHex)],
          })
        );
        if (cancelled) return;
        setOpsGate({
          nextTokenId,
          nextIsHonest,
          creeMintable: !creeMinted && nextTokenId > 0 && !nextIsHonest,
          creeAlreadyMinted: creeMinted,
          honestLeftBeforeVoid:
            nextIsHonest && nextTokenId > 0 && nextTokenId < KEEP_V2_FIRST_VOID_ID
              ? KEEP_V2_FIRST_VOID_ID - nextTokenId
              : 0,
          firstVoidId: KEEP_V2_FIRST_VOID_ID,
        });
      } catch {
        if (!cancelled) setOpsGate(null);
      }
    };
    load();
    const timer = window.setInterval(load, 45000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [showOps, publicClient, v2Ready]);

  async function claimKeep(tokenId) {
    if (!walletClient || !v2Ready || banned) return;
    setClaimingId(String(tokenId));
    setStatus('');
    setError('');
    try {
      const hash = await walletClient.writeContract({
        address: DUNGEON_KEEP_V2_ADDRESS,
        abi: IMP_KEEPS_V2_ABI,
        functionName: 'claim',
        args: [BigInt(tokenId)],
      });
      await publicClient.waitForTransactionReceipt({ hash });
      setClaimed((current) => ({ ...current, [tokenId]: true }));
      setStatus(`Keep #${tokenId} claimed on the new collection.`);
    } catch (claimError) {
      setError(claimError?.shortMessage || claimError?.message || 'Claim failed.');
    } finally {
      setClaimingId('');
    }
  }

  async function claimAll() {
    const pending = grouped.eligible.filter((keep) => !claimed[keep.id]).slice(0, 40);
    if (!walletClient || !v2Ready || banned || pending.length === 0) return;
    setClaimingId('all');
    setStatus('');
    setError('');
    try {
      const hash = await walletClient.writeContract({
        address: DUNGEON_KEEP_V2_ADDRESS,
        abi: IMP_KEEPS_V2_ABI,
        functionName: 'claimMany',
        args: [pending.map((keep) => BigInt(keep.id))],
      });
      await publicClient.waitForTransactionReceipt({ hash });
      setClaimed((current) => {
        const next = { ...current };
        pending.forEach((keep) => {
          next[keep.id] = true;
        });
        return next;
      });
      setStatus(`Claimed ${pending.length} keep${pending.length === 1 ? '' : 's'} on the new collection.`);
    } catch (claimError) {
      setError(claimError?.shortMessage || claimError?.message || 'Claim failed.');
    } finally {
      setClaimingId('');
    }
  }

  async function mintReplacement() {
    if (!walletClient || !publicClient || !replacement?.mintable || banned) return;
    setClaimingId('replacement');
    setStatus('');
    setError('');
    try {
      const data = await requestKeepReplacementMint(walletAccount);
      const contractAddress = data.contractAddress || DUNGEON_KEEP_V2_ADDRESS;
      if (!data.signature || !data.voucher) {
        throw new Error('Could not prepare the Bun Bun replacement voucher.');
      }
      const hash = await walletClient.writeContract({
        address: contractAddress,
        abi: IMP_KEEPS_V2_ABI,
        functionName: 'mint',
        args: [BigInt(data.voucher.seed), BigInt(data.voucher.deadline), data.signature],
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      const tokenId = tokenIdFromMintReceipt(receipt);
      setReplacement((current) =>
        current
          ? {
              ...current,
              mintable: false,
              alreadyMinted: true,
              reason: 'This Bun Bun replacement has already been minted.',
            }
          : current
      );
      const itemUrl = tokenId ? keepOpenSeaItemUrl(contractAddress, tokenId) : keepV2OpenSeaCollectionUrl();
      setStatus(
        tokenId
          ? `Bun Bun keep restored as #${tokenId} on the new collection.`
          : 'Bun Bun keep restored on the new collection.'
      );
      if (itemUrl) {
        setStatus((current) => `${current} OpenSea: ${itemUrl}`);
      }
    } catch (mintError) {
      setError(mintError?.shortMessage || mintError?.message || 'Replacement mint failed.');
    } finally {
      setClaimingId('');
    }
  }

  const pendingCount = grouped.eligible.filter((keep) => !claimed[keep.id]).length;

  return (
    <div className="dungeon-page">
      <div className="dungeon-page__inner">
        <header className="dungeon-page__header">
          <p className="profile-page__eyebrow">Lost keeps</p>
          <h1>IMPLINGz Keeps migration</h1>
          <p>
            IMPLINGz Keeps can be migrated onto the new contract, those evil exploiters have been
            voided and cannot migrate over!
          </p>
          <p className="dungeon-page__meta">
            Old collection:{' '}
            <a href={keepOpenSeaCollectionUrl(DUNGEON_KEEP_V1_ADDRESS)} target="_blank" rel="noreferrer">
              voided Imp Keeps
            </a>
            {v2Ready ? (
              <>
                {' · '}
                New collection:{' '}
                <a href={keepV2OpenSeaCollectionUrl()} target="_blank" rel="noreferrer">
                  IMPLINGz Keeps
                </a>
              </>
            ) : (
              ' · New collection address will appear here after deploy.'
            )}
          </p>
        </header>

        {showOps ? (
          <section className="dungeon-page__ops">
            <p className="profile-page__eyebrow">Ops</p>
            {!opsGate ? (
              <p>…</p>
            ) : opsGate.creeAlreadyMinted ? (
              <p>Minted</p>
            ) : opsGate.creeMintable ? (
              <p className="dungeon-page__ok">#{opsGate.nextTokenId}</p>
            ) : (
              <p>
                #{opsGate.nextTokenId}
                {opsGate.honestLeftBeforeVoid ? ` · ${opsGate.honestLeftBeforeVoid}` : ''}
              </p>
            )}
          </section>
        ) : null}

        <section className="dungeon-page__market">
          <h2>Claim your honest keeps</h2>
          {!walletAccount ? (
            <p>Connect a wallet to read the Imp Keeps you currently hold.</p>
          ) : banned ? (
            <p className="dungeon-page__warn">This wallet is excluded from the migration.</p>
          ) : loading ? (
            <p>Reading your wallet…</p>
          ) : error && keeps.length === 0 ? null : (
            <>
              <p>
                This wallet holds {grouped.eligible.length} honest keep
                {grouped.eligible.length === 1 ? '' : 's'} right now. All of those can migrate.
                {grouped.voided.length
                  ? ` ${grouped.voided.length} keep${grouped.voided.length === 1 ? '' : 's'} in this wallet are void and will not migrate.`
                  : ''}
              </p>
              <p>
                There are 1603 honest keeps in total. Connect every wallet that still holds yours.
                Keeps you already sold move with the current owner.
              </p>
              {v2Ready && pendingCount > 0 ? (
                <button
                  type="button"
                  className="dungeon-page__claim"
                  disabled={Boolean(claimingId)}
                  onClick={claimAll}
                >
                  {claimingId === 'all' ? 'Claiming…' : `Claim ${pendingCount} keep${pendingCount === 1 ? '' : 's'}`}
                </button>
              ) : null}
              {!v2Ready ? (
                <p>The new contract is ready to deploy. Claims unlock as soon as it is live.</p>
              ) : null}
            </>
          )}
          {status ? <p className="dungeon-page__ok">{status}</p> : null}
          {error ? <p className="dungeon-page__warn">{error}</p> : null}

          <div className="dungeon-page__gallery">
            {showCreeBox && replacement ? (
              <article className="dungeon-page__keep dungeon-page__keep--restore">
                {replacement.previewUrl ? (
                  <img className="dungeon-page__map" src={replacement.previewUrl} alt="" />
                ) : null}
                <h3>Keep #{replacement.v1TokenId} · {replacement.miniBoss}</h3>
                {v2Ready && replacement.mintable && !banned ? (
                  <button
                    type="button"
                    className="dungeon-page__claim"
                    disabled={Boolean(claimingId)}
                    onClick={mintReplacement}
                  >
                    {claimingId === 'replacement' ? 'Minting…' : 'Mint Bun Bun replacement'}
                  </button>
                ) : null}
              </article>
            ) : null}
            {grouped.eligible.map((keep) => (
              <article key={keep.id} className="dungeon-page__keep">
                {keep.image ? <img className="dungeon-page__map" src={keep.image} alt="" /> : null}
                <h3>Keep #{keep.id}</h3>
                <p>Honest mint · {claimed[keep.id] ? 'Claimed' : 'Ready to claim'}</p>
                {v2Ready && !claimed[keep.id] && !banned ? (
                  <button
                    type="button"
                    className="dungeon-page__claim"
                    disabled={Boolean(claimingId)}
                    onClick={() => claimKeep(keep.id)}
                  >
                    {claimingId === String(keep.id) ? 'Claiming…' : 'Claim'}
                  </button>
                ) : null}
              </article>
            ))}
            {grouped.voided.map((keep) => (
              <article key={`void-${keep.id}`} className="dungeon-page__keep dungeon-page__keep--void">
                {keep.image ? <img className="dungeon-page__map" src={keep.image} alt="" /> : null}
                <h3>Keep #{keep.id}</h3>
                <p>Void · will not migrate</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
