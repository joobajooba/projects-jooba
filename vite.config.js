import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { dungeonLayoutToSvg, generateDungeonLayout } from './src/lib/dungeonLayout.js';

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

        if (url.pathname === '/api/adventures-gate') {
          sendJson(res, 200, { unlocked: true });
          return;
        }

        if (url.pathname === '/api/dungeon-preview') {
          const seed = url.searchParams.get('seed') || '42';
          const format = url.searchParams.get('format');
          const layout = generateDungeonLayout(seed);
          const svg = dungeonLayoutToSvg(layout);
          if (format === 'svg') {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'image/svg+xml');
            res.end(svg);
            return;
          }
          sendJson(res, 200, { ...layout, svg });
          return;
        }

        if (url.pathname === '/api/keep-collection') {
          sendJson(res, 200, {
            name: 'Lost Keeps',
            description: 'Local preview. OpenSea metadata needs the live keep contract.',
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
