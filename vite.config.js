import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // В конфиге Vite нет import.meta.env — переменные читаются через loadEnv
  const env = loadEnv(mode, process.cwd())
  const apiTarget = env.VITE_API_URL || 'http://localhost:8080'

  return {
    plugins: [react()],
    base: '/',
    build: {
      rollupOptions: {
        output: {
          // Было 830 kB одним чанком (253 kB gzip). Стало: 534 + 197 + 65 + 37.
          //
          // ЧЕСТНО О ЭФФЕКТЕ: суммарный вес первой загрузки НЕ изменился —
          // ~270 kB gzip до и после. Все эти пакеты импортируются статически,
          // поэтому браузер скачивает их в любом случае; manualChunks лишь
          // раскладывает их по файлам. Выигрыш реальный, но другой:
          // параллельная загрузка вместо одного длинного файла и, главное,
          // кэширование — правка кода приложения больше не инвалидирует
          // supabase, d3 и i18n у вернувшегося пользователя.
          //
          // Чтобы d3 действительно не приезжал тем, кто не открывает
          // синастрию, его импорт должен стать динамическим. Это правка
          // импорта в Dashboard.tsx, то есть ВЫШЕ границы безопасности 2972
          // (design.md, Context) — отдельная задача с другим профилем риска.
          // d3 после tree-shaking весит 37 kB, а не 250, так что цена вопроса
          // невелика; главный кандидат на ленивую загрузку — supabase (197 kB).
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
