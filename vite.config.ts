import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  // Make API key optional - app can run without AI features
  const apiKey = env.GEMINI_API_KEY || null;

  return {
    base: '/Announcer_MTG/', // GitHub Pages subdirectory
    build: {
      outDir: 'docs', // GitHub Pages uses /docs folder
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react()],
    define: {
      // API key can be set via localStorage at runtime or via env variable at build time
      'process.env.API_KEY': `(localStorage.getItem('gemini_api_key') || ${JSON.stringify(apiKey)})`,
      'process.env.GEMINI_API_KEY': `(localStorage.getItem('gemini_api_key') || ${JSON.stringify(apiKey)})`
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
