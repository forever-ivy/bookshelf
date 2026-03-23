import path from 'node:path'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined
          }

          if (id.includes('/react/') || id.includes('/react-dom/')) {
            return 'vendor-react'
          }

          if (id.includes('/react-router-dom/') || id.includes('/react-router/')) {
            return 'vendor-router'
          }

          if (id.includes('/@tanstack/') || id.includes('/axios/')) {
            return 'vendor-data'
          }

          if (id.includes('/framer-motion/')) {
            return 'vendor-motion'
          }

          if (id.includes('/recharts/')) {
            return 'vendor-charts'
          }

          if (id.includes('/@radix-ui/') || id.includes('/lucide-react/')) {
            return 'vendor-ui'
          }

          return 'vendor-misc'
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    exclude: ['tests/e2e/**', 'node_modules/**', 'dist/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
    },
  },
})
