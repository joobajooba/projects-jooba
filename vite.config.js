import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: 'app',
  publicDir: 'app/public',
  build: {
    outDir: 'dist', // relative to project root so Vercel finds it
  },
  plugins: [react()],
});
