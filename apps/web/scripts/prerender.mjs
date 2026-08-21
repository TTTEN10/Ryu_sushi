/* global process, console */
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const webRoot = path.resolve(__dirname, '..')
const distDir = path.join(webRoot, 'dist')
const distSsrDir = path.join(webRoot, 'dist-ssr')

function read(filePath) {
  return fs.readFileSync(filePath, 'utf-8')
}

function write(filePath, contents) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, contents)
}

function routeToOutDir(route) {
  if (route === '/' || route === '') return distDir
  return path.join(distDir, route.replace(/^\//, ''))
}

async function loadRenderer() {
  const entryServer = path.join(distSsrDir, 'entry-server.cjs')
  const req = createRequire(import.meta.url)
  const mod = req(entryServer)
  if (typeof mod.render !== 'function') {
    throw new Error('dist-ssr/entry-server.cjs must export render(url)')
  }
  return mod.render
}

/** Public routes aligned with `src/router.tsx` (SEO-relevant HTML shells). */
function loadRoutes() {
  return [
    '/',
    '/explore',
    '/register',
    '/beta',
    '/sap-policy',
    '/contact-us',
    '/support',
    '/faq',
    '/tos',
    '/cookies',
    '/feedback',
    '/maintenance',
  ]
}

async function main() {
  const templatePath = path.join(distDir, 'index.html')
  const template = read(templatePath)

  const render = await loadRenderer()
  const routes = loadRoutes()

  for (const route of routes) {
    const { appHtml, head } = render(route)

    const html = template
      .replace('<!--app-html-->', appHtml)
      .replace('<!--helmet-title-->', head.title)
      .replace('<!--helmet-meta-->', head.meta)
      .replace('<!--helmet-link-->', head.link)
      .replace('<!--helmet-script-->', head.script)

    const outDir = routeToOutDir(route)
    write(path.join(outDir, 'index.html'), html)
    console.log(`[prerender] ${route} -> ${path.relative(webRoot, path.join(outDir, 'index.html'))}`)
  }
}

main().catch((err) => {
  console.error('[prerender] failed:', err)
  process.exit(1)
})
