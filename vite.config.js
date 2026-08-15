import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import adventuresGateHandler from './api/adventures-gate.js';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function renderDungeonPreview(seed, format) {
  const script = path.join(rootDir, 'api', 'dungeon-preview.py');
  const py = `
import json, sys
sys.path.insert(0, r${JSON.stringify(rootDir)})
from importlib.machinery import SourceFileLoader
mod = SourceFileLoader("dungeon_preview_api", r${JSON.stringify(script)}).load_module()
preview = mod.render_preview(${JSON.stringify(String(seed || '42'))})
fmt = ${JSON.stringify(format || 'png')}
if fmt in ("json", "meta"):
    print(json.dumps({
        "seed": preview["seed"],
        "numericSeed": preview["numericSeed"],
        "rooms": preview["rooms"],
        "tileset": preview["tileset"],
        "imageUrl": "/api/dungeon-preview?seed=" + str(preview["seed"]) + "&format=png",
    }))
else:
    sys.stdout.buffer.write(preview["png"])
`;

  const rendered = spawnSync('python', ['-c', py], {
    cwd: rootDir,
    env: process.env,
    encoding: format === 'json' || format === 'meta' ? 'utf8' : 'buffer',
    maxBuffer: 20 * 1024 * 1024,
  });

  if (rendered.status !== 0) {
    throw new Error(rendered.stderr?.toString() || 'Dungeon render failed.');
  }
  return rendered.stdout;
}

function localAdventureApis() {
  return {
    name: 'local-adventure-apis',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url || '/', 'http://localhost');

        if (url.pathname === '/api/adventures-gate') {
          const wrapped = {
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

          if (req.method === 'GET' || req.method === 'HEAD') {
            Promise.resolve(
              adventuresGateHandler({ method: req.method, headers: req.headers, body: {} }, wrapped)
            ).catch(() => {
              sendJson(res, 500, { error: 'Access check failed.' });
            });
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
            Promise.resolve(
              adventuresGateHandler(
                { method: req.method, headers: req.headers, body },
                wrapped
              )
            ).catch(() => {
              sendJson(res, 500, { error: 'Access check failed.' });
            });
          });
          return;
        }

        if (url.pathname === '/api/dungeon-preview') {
          try {
            const seed = url.searchParams.get('seed') || '42';
            const format = (url.searchParams.get('format') || 'png').toLowerCase();
            const body = renderDungeonPreview(seed, format);
            if (format === 'json' || format === 'meta') {
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(typeof body === 'string' ? body : body.toString('utf8'));
              return;
            }
            res.statusCode = 200;
            res.setHeader('Content-Type', 'image/png');
            res.end(Buffer.isBuffer(body) ? body : Buffer.from(body));
            return;
          } catch (error) {
            sendJson(res, 500, { error: error?.message || 'Dungeon render failed.' });
            return;
          }
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
