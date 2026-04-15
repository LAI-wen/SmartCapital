import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      build: {
        rollupOptions: {
          output: {
            manualChunks(id) {
              if (!id.includes('node_modules')) {
                return;
              }

              if (
                id.includes('/react/') ||
                id.includes('/react-dom/') ||
                id.includes('/scheduler/')
              ) {
                return 'framework';
              }

              if (id.includes('react-router')) {
                return 'router';
              }

              if (id.includes('lucide-react')) {
                return 'icons';
              }

              if (
                id.includes('recharts') ||
                id.includes('victory-vendor') ||
                id.includes('/d3-')
              ) {
                return 'charts';
              }

              if (id.includes('i18next') || id.includes('react-i18next')) {
                return 'i18n';
              }

              if (id.includes('date-fns')) {
                return 'date-utils';
              }
            }
          }
        }
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
