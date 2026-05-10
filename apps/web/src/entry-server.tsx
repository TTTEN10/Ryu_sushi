import { renderToString } from 'react-dom/server'
import { HelmetProvider } from 'react-helmet-async'
import { createMemoryRouter } from 'react-router-dom'
import App from './App'
import { routes } from './router'

export function render(url: string) {
  /** Passed by reference into react-helmet-async; populated as `context.helmet` during SSR. */
  const helmetContext: Record<string, unknown> = {}
  const router = createMemoryRouter(routes, { initialEntries: [url] })

  const appHtml = renderToString(
    <HelmetProvider context={helmetContext}>
      <App router={router} />
    </HelmetProvider>,
  )

  const helmet = helmetContext.helmet as {
    title?: { toString: () => string }
    meta?: { toString: () => string }
    link?: { toString: () => string }
    script?: { toString: () => string }
  } | undefined

  return {
    appHtml,
    head: {
      title: helmet?.title?.toString() ?? '',
      meta: helmet?.meta?.toString() ?? '',
      link: helmet?.link?.toString() ?? '',
      script: helmet?.script?.toString() ?? '',
    },
  }
}
