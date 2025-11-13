// ESM Vite config (vite.config.mjs)
// Use this file instead of a CommonJS config so ESM-only plugins (like @vitejs/plugin-react) can be imported.
//
// Place at: frontend/vite.config.mjs
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEV_PORT = process.env.PORT ? Number(process.env.PORT) : 5173;
const API_PROXY_TARGET = process.env.VITE_API_PROXY_TARGET || 'http://localhost:3000';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Allow imports like: import Foo from '@/components/Foo'
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: DEV_PORT,
    open: true,
    // Proxy /api to backend during development to avoid CORS and to match backend path
    proxy: {
      '/api': {
        target: API_PROXY_TARGET,
        changeOrigin: true,
        secure: false,
      },
    },
  },
  preview: {
    port: DEV_PORT,
    open: false,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
