import { renderDungeonPreview } from './lib/renderDungeonPng.js';

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const seed = String(request.query?.seed || '42');
  const fmt = String(request.query?.format || 'png').toLowerCase();

  try {
    const preview = await renderDungeonPreview(seed);

    if (fmt === 'json' || fmt === 'meta') {
      response.setHeader('Cache-Control', 'public, max-age=86400, immutable');
      return response.status(200).json({
        seed: preview.seed,
        numericSeed: preview.numericSeed,
        rooms: preview.rooms,
        tileset: preview.tileset,
        engine: preview.engine || 'python',
        imageUrl: `/api/dungeon-preview?seed=${encodeURIComponent(seed)}&format=png`,
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
