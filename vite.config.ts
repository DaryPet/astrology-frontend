import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // В конфиге Vite нет import.meta.env — переменные читаются через loadEnv
  const env = loadEnv(mode, process.cwd());
  const apiTarget = env.VITE_API_URL || 'http://localhost:8080';

  return {
    plugins: [react()],
    base: '/',
    server: {
      host: '0.0.0.0',
      port: 12001,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
        '/docs': {
          target: `${apiTarget}/docs`,
          changeOrigin: true,
        },
        '/health': {
          target: apiTarget,
          changeOrigin: true,
        }
      }
    }
  }
});
