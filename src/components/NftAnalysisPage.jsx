import { useEffect, useState } from 'react';
import {
  fetchOpenSeaCollectionStats,
  fetchOpenSeaCollections,
  hasOpenSeaApiKey,
} from '../lib/openseaClient';

function formatEth(n) {
  if (n == null || Number.isNaN(n)) return '—';
  const x = Number(n);
  if (x >= 1000) return `${x.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  if (x >= 1) return x.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return x.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

export default function NftAnalysisPage({ onBack }) {
  const [state, setState] = useState({ kind: 'loading' });

  useEffect(() => {
    if (!hasOpenSeaApiKey()) {
      setState({ kind: 'no_key' });
      return;
    }

    let cancelled = false;

    const load = async () => {
      setState({ kind: 'loading' });
      try {
        const [collectionsRes, maycStats] = await Promise.all([
          fetchOpenSeaCollections({ chain: 'ethereum', limit: 8 }),
          fetchOpenSeaCollectionStats('mutant-ape-yacht-club').catch(() => null),
        ]);
        if (cancelled) return;
        const rows = Array.isArray(collectionsRes?.collections) ? collectionsRes.collections : [];
        setState({ kind: 'ok', collections: rows, maycStats });
      } catch (e) {
        if (cancelled) return;
        if (e?.code === 'missing_key') {
          setState({ kind: 'no_key' });
          return;
        }
        const msg =
          e?.status === 401
            ? 'OpenSea rejected the API key (401). Check the key in your OpenSea developer settings.'
            : e?.message || 'Could not reach OpenSea.';
        setState({ kind: 'error', message: msg });
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="studio-page studio-nft-analysis">
      <header className="studio-nft-analysis-head">
        <button type="button" className="studio-nft-analysis-back" onClick={onBack}>
          ← Back
        </button>
        <h1 className="studio-nft-analysis-title">NFT Analysis</h1>
      </header>

      {state.kind === 'no_key' ? (
        <div className="studio-nft-analysis-panel">
          <p className="studio-nft-analysis-lead">
            Add your OpenSea API key to enable live data (create one at{' '}
            <a
              href="https://docs.opensea.io/reference/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="studio-nft-analysis-link"
            >
              OpenSea API keys
            </a>
            ).
          </p>
          <p>
            In this project, set <code>VITE_OPENSEA_API_KEY</code> in <code>.env.local</code> (see{' '}
            <code>.env.example</code>), then restart the dev server or redeploy.
          </p>
          <p className="studio-nft-analysis-note">
            Keys in <code>VITE_*</code> variables are exposed to the browser; for production, prefer a
            small server or edge proxy that holds the secret.
          </p>
        </div>
      ) : null}

      {state.kind === 'loading' ? (
        <p className="studio-nft-analysis-status">Loading OpenSea data…</p>
      ) : null}

      {state.kind === 'error' ? (
        <div className="studio-nft-analysis-panel studio-nft-analysis-panel--error">
          <p>{state.message}</p>
        </div>
      ) : null}

      {state.kind === 'ok' ? (
        <div className="studio-nft-analysis-body">
          {state.maycStats?.total ? (
            <section className="studio-nft-analysis-panel">
              <h2 className="studio-nft-analysis-section-title">MAYC (sample stats)</h2>
              <p className="studio-nft-analysis-muted">
                Ethereum collection <code>mutant-ape-yacht-club</code> via OpenSea stats endpoint.
              </p>
              <dl className="studio-nft-analysis-stats">
                <div>
                  <dt>Floor</dt>
                  <dd>
                    {formatEth(state.maycStats.total.floor_price)}{' '}
                    {state.maycStats.total.floor_price_symbol || 'ETH'}
                  </dd>
                </div>
                <div>
                  <dt>Owners</dt>
                  <dd>{state.maycStats.total.num_owners?.toLocaleString?.() ?? '—'}</dd>
                </div>
                <div>
                  <dt>Total volume</dt>
                  <dd>{formatEth(state.maycStats.total.volume)}</dd>
                </div>
              </dl>
            </section>
          ) : null}

          <section className="studio-nft-analysis-panel">
            <h2 className="studio-nft-analysis-section-title">Collections (Ethereum sample)</h2>
            <p className="studio-nft-analysis-muted">First page from OpenSea list_collections.</p>
            <ul className="studio-nft-analysis-list">
              {state.collections.map((c) => (
                <li key={c.collection || c.name}>
                  <span className="studio-nft-analysis-list-name">{c.name || c.collection}</span>
                  {c.opensea_url ? (
                    <a
                      className="studio-nft-analysis-link"
                      href={c.opensea_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        </div>
      ) : null}
    </div>
  );
}
