import { useEffect, useState } from 'react';
import { usePublicClient } from 'wagmi';
import {
  DUNGEON_KEEP_ABI,
  keepOpenSeaCollectionUrl,
  keepOpenSeaItemUrl,
  seedHex,
} from '../lib/dungeonKeep';

export default function TheDungeonPage() {
  const [seed, setSeed] = useState('42');
  const [keeps, setKeeps] = useState([]);
  const [supply, setSupply] = useState(null);
  const [galleryError, setGalleryError] = useState('');
  const [previewMeta, setPreviewMeta] = useState(null);
  const publicClient = usePublicClient({ chainId: 4663 });
  const keepAddress = import.meta.env.VITE_DUNGEON_KEEP_ADDRESS;
  const collectionUrl = keepOpenSeaCollectionUrl(keepAddress);
  const previewUrl = `/api/dungeon-preview?seed=${encodeURIComponent(seed || '42')}&format=png`;

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/dungeon-preview?seed=${encodeURIComponent(seed || '42')}&format=json`)
      .then((response) => response.json())
      .then((data) => {
        if (!cancelled) setPreviewMeta(data);
      })
      .catch(() => {
        if (!cancelled) setPreviewMeta(null);
      });
    return () => {
      cancelled = true;
    };
  }, [seed]);

  useEffect(() => {
    if (!keepAddress || !publicClient) return undefined;
    let cancelled = false;

    async function loadKeeps() {
      try {
        const total = await publicClient.readContract({
          address: keepAddress,
          abi: DUNGEON_KEEP_ABI,
          functionName: 'totalSupply',
        });
        const count = Number(total);
        if (cancelled) return;
        setSupply(count);
        const start = Math.max(1, count - 11);
        const ids = [];
        for (let tokenId = count; tokenId >= start; tokenId -= 1) ids.push(tokenId);
        const rows = await Promise.all(
          ids.map(async (tokenId) => {
            const seedValue = await publicClient.readContract({
              address: keepAddress,
              abi: DUNGEON_KEEP_ABI,
              functionName: 'seedOf',
              args: [BigInt(tokenId)],
            });
            const hex = seedHex(seedValue);
            return {
              tokenId,
              hex,
              imageUrl: `/api/dungeon-preview?seed=${encodeURIComponent(hex)}&format=png`,
            };
          })
        );
        if (!cancelled) {
          setKeeps(rows);
          setGalleryError('');
        }
      } catch (error) {
        if (!cancelled) {
          setGalleryError(error?.shortMessage || error?.message || 'Could not load minted keeps.');
        }
      }
    }

    loadKeeps();
    return () => {
      cancelled = true;
    };
  }, [keepAddress, publicClient]);

  return (
    <div className="dungeon-page">
      <div className="dungeon-page__inner">
        <header className="dungeon-page__header">
          <p className="profile-page__eyebrow">Lost keeps</p>
          <h1>The Dungeon</h1>
          <p>
            Find a keep on an IMPLINGz adventure, then choose to mint or walk away. Minting is
            free aside from ETH gas. After mint, OpenSea reads this contract and shows the
            revealed dungeon. List it there in ETH if you want to trade.
          </p>
          {keepAddress ? (
            <p className="dungeon-page__meta">
              {supply === null ? 'Reading supply…' : `${supply} / 4444 minted`}
              {' · '}
              <a href={collectionUrl} target="_blank" rel="noopener noreferrer">
                Open on OpenSea
              </a>
            </p>
          ) : (
            <p className="dungeon-page__meta">
              The keep contract is not live yet. Adventures can still preview dungeons; minting
              opens after deploy.
            </p>
          )}
        </header>

        <section className="dungeon-page__market">
          <p className="profile-page__eyebrow">Minted keeps</p>
          <h2>Revealed on OpenSea</h2>
          <p>
            OpenSea indexes the live ERC-721. There is no on-site $DERP shop. Secondary listings
            use ETH / WETH on OpenSea.
          </p>
          {galleryError ? <p className="dungeon-page__meta">{galleryError}</p> : null}
          {keeps.length ? (
            <div className="dungeon-page__gallery">
              {keeps.map((keep) => (
                <article key={keep.tokenId} className="dungeon-page__keep">
                  <img
                    className="dungeon-page__keep-map"
                    src={keep.imageUrl}
                    alt={`Lost Keep #${keep.tokenId}`}
                  />
                  <h3>Keep #{keep.tokenId}</h3>
                  <a
                    href={keepOpenSeaItemUrl(keepAddress, keep.tokenId)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View / list on OpenSea
                  </a>
                </article>
              ))}
            </div>
          ) : (
            <p className="dungeon-page__meta">
              {keepAddress
                ? 'No keeps minted yet. The first winning adventure that mints will appear here and on OpenSea.'
                : 'Gallery appears after the keep contract is deployed.'}
            </p>
          )}
        </section>

        <label className="dungeon-page__seed">
          <span>Preview a seed / winning hash</span>
          <input
            value={seed}
            onChange={(event) => setSeed(event.target.value)}
            placeholder="Paste a winning hash"
          />
        </label>

        <p className="dungeon-page__meta">
          {previewMeta
            ? `${previewMeta.rooms} rooms · ${previewMeta.tileset} · seed ${previewMeta.numericSeed}`
            : 'Rendering dungeon from Dungeon_Generator…'}
        </p>

        <img className="dungeon-page__map" src={previewUrl} alt="Dungeon preview" />
      </div>
    </div>
  );
}
