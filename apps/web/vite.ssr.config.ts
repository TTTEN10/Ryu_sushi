// Separate SSR bundle for Node prerender (CommonJS output — see package.json build:ssr).
// @ts-nocheck — duplicate Vite typings from hoisted vs apps/web node_modules (monorepo)
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  root: __dirname,
  plugins: [react()],
  resolve: {
    preserveSymlinks: true,
    alias: {
      buffer: 'buffer',
      'process/browser': 'process',
      stream: 'stream-browserify',
      events: 'events',
    },
    conditions: ['browser', 'module', 'import'],
  },
  define: {
    'process.env': {},
    global: 'globalThis',
  },
  optimizeDeps: {
    include: ['process', 'buffer', 'stream-browserify', 'events'],
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
  build: {
    outDir: 'dist-ssr',
    sourcemap: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    rollupOptions: {
      output: {
        format: 'cjs',
        entryFileNames: '[name].cjs',
      },
    },
  },
  ssr: {
    noExternal: ['react-helmet-async'],
  },
})
