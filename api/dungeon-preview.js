import { dungeonLayoutToSvg, generateDungeonLayout } from '../src/lib/dungeonLayout.js';

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'Method not allowed.' });
  }

  const seedParam = Array.isArray(request.query.seed) ? request.query.seed[0] : request.query.seed;
  const seed = seedParam || '42';
  const format = Array.isArray(request.query.format) ? request.query.format[0] : request.query.format;
  const layout = generateDungeonLayout(seed);
  const svg = dungeonLayoutToSvg(layout);

  if (format === 'svg') {
    response.setHeader('Content-Type', 'image/svg+xml');
    response.setHeader('Cache-Control', 'public, max-age=86400, immutable');
    return response.status(200).send(svg);
  }

  response.setHeader('Cache-Control', 'public, max-age=86400, immutable');
  return response.status(200).json({
    ...layout,
    svg,
    imageUrl: `/api/dungeon-preview?seed=${encodeURIComponent(layout.seed)}&format=svg`,
  });
}
