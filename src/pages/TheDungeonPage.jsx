import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { usePublicClient, useWalletClient } from 'wagmi';
import {
  DUNGEON_KEEP_V1_ADDRESS,
  DUNGEON_KEEP_V2_ADDRESS,
  IMP_KEEPS_V2_ABI,
  classifyV1Keep,
  keepV2Configured,
  keepV2OpenSeaCollectionUrl,
} from '../lib/keepV2';
import { isBannedKeepWallet } from '../lib/keepV2Allowlist';
import { keepOpenSeaCollectionUrl } from '../lib/dungeonKeep';

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
  const v2Ready = keepV2Configured();
  const banned = isBannedKeepWallet(walletAccount);

  const grouped = useMemo(() => {
    const eligible = [];
    const voided = [];
    keeps.forEach((keep) => {
      const kind = classifyV1Keep(keep.id, walletAccount);
      if (kind === 'eligible') eligible.push(keep);
      else voided.push(keep);
    });
    return { eligible, voided };
  }, [keeps, walletAccount]);
  const eligibleKey = grouped.eligible.map((keep) => keep.id).join('|');

  useEffect(() => {
    if (!walletAccount) {
      setKeeps([]);
      setClaimed({});
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

  const pendingCount = grouped.eligible.filter((keep) => !claimed[keep.id]).length;

  return (
    <div className="dungeon-page">
      <div className="dungeon-page__inner">
        <header className="dungeon-page__header">
          <p className="profile-page__eyebrow">Lost keeps</p>
          <h1>Imp Keeps migration</h1>
          <p>
            The original Imp Keeps contract was exploited. Do not buy or list that collection.
            Honest keeps can be claimed here into a new collection. Exploit-minted tokens are
            void and will not migrate.
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
                  Imp Keeps
                </a>
              </>
            ) : (
              ' · New collection address will appear here after deploy.'
            )}
          </p>
        </header>

        <section className="dungeon-page__market">
          <h2>Claim your honest keeps</h2>
          {!walletAccount ? (
            <p>Connect a wallet to read the Imp Keeps you currently hold.</p>
          ) : banned ? (
            <p className="dungeon-page__warn">This wallet is excluded from the migration.</p>
          ) : loading ? (
            <p>Reading your wallet…</p>
          ) : (
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
