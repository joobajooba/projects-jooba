import { renderDungeonPreview } from './_lib/renderDungeonPng.js';
import {
  KEEP_DESCRIPTION,
  dungeonPreviewPath,
  openseaMetadata,
  parseKeepTokenId,
} from './_lib/dungeonTraits.js';

function siteOrigin(request) {
  const header = request.headers['x-forwarded-host'] || request.headers.host;
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, '');
  if (header) {
    const proto = request.headers['x-forwarded-proto'] || 'https';
    return `${proto}://${header}`;
  }
  return 'https://j00ba.xyz';
}

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const seed = String(request.query?.seed || '42');
  const fmt = String(request.query?.format || 'png').toLowerCase();
  const tokenId = parseKeepTokenId(request.query?.tokenId);

  try {
    const preview = await renderDungeonPreview(seed, tokenId);
    const origin = siteOrigin(request);
    const imageUrl = `${origin}${dungeonPreviewPath(seed, { format: 'png', tokenId })}`;
    const metadata = openseaMetadata({
      seedValue: preview.seed,
      imageUrl,
      externalUrl: `${origin}/the-dungeon`,
      tokenId,
      description: KEEP_DESCRIPTION,
      attributes: preview.attributes,
    });

    if (fmt === 'metadata') {
      response.setHeader('Cache-Control', 'public, max-age=86400, immutable');
      return response.status(200).json(metadata);
    }

    if (fmt === 'json' || fmt === 'meta') {
      response.setHeader('Cache-Control', 'public, max-age=86400, immutable');
      return response.status(200).json({
        seed: preview.seed,
        numericSeed: preview.numericSeed,
        rooms: preview.rooms,
        doors: preview.doors,
        stairs: preview.stairs,
        tileset: preview.tileset,
        biome: preview.biome,
        dungeonType: preview.dungeonType,
        miniBoss: preview.miniBoss,
        options: preview.options,
        attributes: preview.attributes,
        engine: preview.engine,
        tokenId,
        imageUrl: dungeonPreviewPath(seed, { format: 'png', tokenId }),
        metadata,
      });
    }

    response.setHeader('Content-Type', 'image/png');
    response.setHeader('Cache-Control', 'public, max-age=86400, immutable');
    return response.status(200).send(preview.png);
  } catch (error) {
    return response.status(500).json({
      error: `Dungeon render failed: ${error?.message || error}`,
    });
  }
}
