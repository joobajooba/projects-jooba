import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const openSeaKey = (env.VITE_OPENSEA_API_KEY || env.OPENSEA_API_KEY || '').trim();

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: openSeaKey
        ? {
            '/api/opensea': {
              target: 'https://api.opensea.io',
              changeOrigin: true,
              secure: true,
              rewrite: (p) => {
                const stripped = p.replace(/^\/api\/opensea/, '');
                return stripped.length > 0 ? stripped : '/';
              },
              configure: (proxy) => {
                proxy.on('proxyReq', (proxyReq) => {
                  proxyReq.setHeader('X-API-KEY', openSeaKey);
                });
              },
            },
          }
        : {},
    },
  };
});
