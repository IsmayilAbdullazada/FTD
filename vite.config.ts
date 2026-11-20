import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, type Plugin } from 'vite';
import { copyPublicAssets } from './scripts/public-assets.mjs';

function publicAssets(): Plugin {
  let root = '';
  let output = '';
  return {
    name: 'public-assets-allowlist',
    apply: 'build',
    configResolved(config) {
      root = config.root;
      output = path.resolve(root, config.build.outDir);
    },
    async writeBundle() {
      await copyPublicAssets(root, output);
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), publicAssets()],
    build: { copyPublicDir: false },
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname || process.cwd(), 'src'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
      strictPort: true,
      allowedHosts: ['.run.app'],
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        '/uploads/guides': {
          target: process.env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:3000',
          changeOrigin: false,
        },
        '/api': {
          target: process.env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:3000',
          changeOrigin: false,
        },
      },
    },
  };
});
