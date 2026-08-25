// @ts-nocheck — duplicate Vite typings from hoisted vs apps/web node_modules (monorepo)
/* global process */
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** Reorder built HTML so CSS `<link>` precedes module `<script>` (reduces FOUC). */
function cssBeforeModuleScriptPlugin() {
  return {
    name: 'css-before-module-script',
    enforce: 'post',
    transformIndexHtml(html: string) {
      const linkTag = html.match(/<link\s+rel="stylesheet"[^>]*href="\/assets\/[^"]+\.css"[^>]*\/?>/i)
      const scriptTag = html.match(/<script\s+type="module"[^>]*src="\/assets\/[^"]+\.js"[^>]*>\s*<\/script>/i)
      if (!linkTag || !scriptTag || linkTag.index === undefined || scriptTag.index === undefined) {
        return html
      }
      if (linkTag.index < scriptTag.index) return html
      let out = html.replace(linkTag[0], '').replace(scriptTag[0], '')
      out = out.replace(/<\/head>/i, `    ${linkTag[0]}\n    ${scriptTag[0]}\n  </head>`)
      return out
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const devPort = Number(env.VITE_PORT || 3000)
  const apiTarget = env.VITE_DEV_API_TARGET || 'http://localhost:3001'
  const pkg = JSON.parse(String(fs.readFileSync(fileURLToPath(new URL('package.json', import.meta.url)), 'utf8')))

  return {
    root: __dirname,
    // Use /beta/ base only for polinapsycho.com production (served from /beta path)
    base: mode === 'production' ? (process.env.VITE_BASE_PATH || '/beta/') : '/',
    plugins: [react(), cssBeforeModuleScriptPlugin()],
    ssr: {
      noExternal: ['react-helmet-async'],
    },
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
      __APP_VERSION__: JSON.stringify(pkg.version),
    },
    optimizeDeps: {
      include: ['process', 'buffer', 'stream-browserify', 'events'],
      esbuildOptions: {
        define: {
          global: 'globalThis',
        },
      },
    },
    server: {
      port: devPort,
      host: true,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
        '/healthz': {
          target: apiTarget,
          changeOrigin: true,
        },
        '/readyz': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
      commonjsOptions: {
        transformMixedEsModules: true,
      },
    },
  }
})
