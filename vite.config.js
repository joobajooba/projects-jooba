import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import adventuresGateHandler from './api/adventures-gate.js';
import stakingGateHandler from './api/staking-gate.js';
import keepsHandler from './api/keeps.js';
import { KEEP_DESCRIPTION, dungeonPreviewPath, openseaMetadata, parseKeepTokenId } from './api/lib/dungeonTraits.js';
import { renderDungeonPreview } from './api/lib/renderDungeonPng.js';

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function localAdventureApis() {
  return {
    name: 'local-adventure-apis',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url || '/', 'http://localhost');

        function vercelJson() {
          return {
            statusCode: 200,
            setHeader(name, value) {
              res.setHeader(name, value);
            },
            status(code) {
              this.statusCode = code;
              return this;
            },
            json(data) {
              sendJson(res, this.statusCode || 200, data);
            },
          };
        }

        function handleGate(handler) {
          const wrapped = vercelJson();
          if (req.method === 'GET' || req.method === 'HEAD') {
            Promise.resolve(handler({ method: req.method, headers: req.headers, body: {} }, wrapped)).catch(
              () => {
                sendJson(res, 500, { error: 'Access check failed.' });
              }
            );
            return;
          }

          const chunks = [];
          req.on('data', (chunk) => chunks.push(chunk));
          req.on('end', () => {
            let body = {};
            try {
              body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
            } catch {
              body = {};
            }
            Promise.resolve(handler({ method: req.method, headers: req.headers, body }, wrapped)).catch(() => {
              sendJson(res, 500, { error: 'Access check failed.' });
            });
          });
        }

        if (url.pathname === '/api/adventures-gate') {
          handleGate(adventuresGateHandler);
          return;
        }

        if (url.pathname === '/api/staking-gate') {
          handleGate(stakingGateHandler);
          return;
        }

        if (url.pathname === '/api/keeps') {
          Promise.resolve(
            keepsHandler(
              { method: req.method, headers: req.headers, query: Object.fromEntries(url.searchParams) },
              vercelJson()
            )
          ).catch(() => {
            sendJson(res, 500, { error: 'Keep lookup failed.' });
          });
          return;
        }

        if (url.pathname === '/api/dungeon-preview') {
          const seed = url.searchParams.get('seed') || '42';
          const format = (url.searchParams.get('format') || 'png').toLowerCase();
          const tokenId = parseKeepTokenId(url.searchParams.get('tokenId'));
          renderDungeonPreview(seed, tokenId)
            .then((preview) => {
              const imageUrl = dungeonPreviewPath(seed, { format: 'png', tokenId });
              const metadata = openseaMetadata({
                seedValue: preview.seed,
                imageUrl: `http://localhost:5173${imageUrl}`,
                externalUrl: 'http://localhost:5173/the-dungeon',
                tokenId,
                description: KEEP_DESCRIPTION,
                attributes: preview.attributes,
              });
              if (format === 'metadata') {
                sendJson(res, 200, metadata);
                return;
              }
              if (format === 'json' || format === 'meta') {
                sendJson(res, 200, {
                  seed: preview.seed,
                  numericSeed: preview.numericSeed,
                  rooms: preview.rooms,
                  doors: preview.doors,
                  stairs: preview.stairs,
                  tileset: preview.tileset,
                  biome: preview.biome,
                  dungeonType: preview.dungeonType,
                  miniBoss: preview.miniBoss,
                  tokenId,
                  options: preview.options,
                  attributes: preview.attributes,
                  engine: preview.engine,
                  imageUrl,
                  metadata,
                });
                return;
              }
              res.statusCode = 200;
              res.setHeader('Content-Type', 'image/png');
              res.end(preview.png);
            })
            .catch((error) => {
              sendJson(res, 500, { error: error?.message || 'Dungeon render failed.' });
            });
          return;
        }

        if (url.pathname === '/api/keep-collection') {
          sendJson(res, 200, {
            name: 'Imp Keeps',
            description:
              '2222 procedurally generated Imp Keeps found through IMPLINGz adventures on Robinhood Chain. Each keep has Environment, Type, and Mini Boss.',
            image: '/roadmap/roadmap-dungeon.png',
            external_link: '/the-dungeon',
          });
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), localAdventureApis()],
  server: {
    port: 5173,
    proxy: {
      '/api/implingz': {
        target: 'https://j00ba.xyz',
        changeOrigin: true,
      },
    },
  },
});
