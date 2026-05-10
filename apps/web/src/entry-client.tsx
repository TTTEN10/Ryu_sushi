import './polyfills'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import { createBrowserRouter } from 'react-router-dom'
import App from './App'
import { routes } from './router'
import './styles.css'

const container = document.getElementById('root')
if (!container) {
  throw new Error('Missing #root element')
}

const app = (
  <React.StrictMode>
    <HelmetProvider>
      <App router={createBrowserRouter(routes)} />
    </HelmetProvider>
  </React.StrictMode>
)

// Hydrate only when SSR/prerender inserted real elements (not the HTML comment placeholder).
if (container.firstElementChild != null) {
  ReactDOM.hydrateRoot(container, app)
} else {
  ReactDOM.createRoot(container).render(app)
}
