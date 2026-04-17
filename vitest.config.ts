import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(viteConfig, defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    env: {
      VITE_FINNHUB_API_KEY: 'test-key',
    },
    exclude: ['server/**', 'node_modules/**'],
  },
}));
