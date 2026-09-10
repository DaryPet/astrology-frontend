import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // Vite's config has no import.meta.env — variables are read via loadEnv
  const env = loadEnv(mode, process.cwd())
  const apiTarget = env.VITE_API_URL || 'http://localhost:8080'

  return {
    plugins: [react()],
    base: '/',
    // Strip console.* and debugger from production only; dev keeps them.
    esbuild: { drop: ['console', 'debugger'] },
    build: {
      rollupOptions: {
        output: {
          // Was 830 kB in a single chunk (253 kB gzip). Now: 534 + 197 + 65 + 37.
          //
          // HONEST ABOUT THE EFFECT: the total weight of the first load did NOT
          // change — ~270 kB gzip before and after. All these packages are imported
          // statically, so the browser downloads them either way; manualChunks only
          // spreads them across files. The win is real but different: parallel
          // downloads instead of one long file and, above all, caching — an app code
          // change no longer invalidates supabase, d3 and i18n for a returning user.
          //
          // For d3 to genuinely not ship to people who never open synastry, its
          // import must become dynamic. That is an import change in Dashboard.tsx,
          // i.e. ABOVE safety boundary 2972 (design.md, Context) — a separate task
          // with a different risk profile. After tree-shaking d3 weighs 37 kB, not
          // 250, so the stakes are low; the main lazy-loading candidate is supabase
          // (197 kB).
          manualChunks: {
            d3: ['d3'],
            i18n: ['i18next', 'react-i18next', 'i18next-browser-languagedetector'],
            supabase: ['@supabase/supabase-js'],
          },
        },
      },
    },
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
})
