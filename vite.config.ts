import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', 'VITE_');

  return {
    // GitHub Pages uses /<repository-name>/ when deployed as a project site.
    // For local development this remains '/'.
    base: env.VITE_BASE_PATH || '/',

    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg'],
        manifest: {
          name: 'Expense Tracker',
          short_name: 'Expenses',
          description: 'Local-first personal expense tracker',
          theme_color: '#0b0d10',
          background_color: '#0b0d10',
          display: 'standalone',
          start_url: '.',
          icons: [
            { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' }
          ]
        }
      })
    ],

    server: {
      host: true
    }
  };
});
