# Tenenbaum — Strategy Consulting Website

A premium, Apple-keynote-inspired marketing site for a boutique strategy
consulting firm. Built with React + Vite, Framer Motion, Lenis smooth scroll,
and a signature **Liquid Glass** design system. Ships with a small Express
backend for the contact form (email + persisted submissions) and newsletter.

## Highlights

- **Liquid Glass UI** — translucent, blurred surfaces with specular highlights
  and travelling reflections, used consistently across nav, cards, forms.
- **iOS-grade motion** — everything animates on `opacity / transform / filter`
  with a single easing curve `cubic-bezier(.22,.61,.36,1)`. Reveal, blur, mask,
  parallax, stagger, magnetic buttons, tilt cards, custom cursor.
- **Lenis smooth scrolling** — slow, natural inertia (respects reduced motion).
- **Custom cursor** — outer ring + inner dot, expands on interactive elements
  (desktop / pointer-fine only).
- **Full contact flow** — validated glass form → backend → email + JSON store →
  success animation. Newsletter capture with confirmation.
- **Production-minded** — code splitting, lazy vendors, SEO (Helmet, OpenGraph,
  Twitter, JSON-LD), `robots.txt`, `sitemap.xml`, WCAG-AA a11y, reduced-motion
  support, semantic HTML, keyboard navigation, focus states.

## Tech stack

| Area          | Choice                                    |
| ------------- | ----------------------------------------- |
| Framework     | React 19 + Vite                           |
| Animation     | Framer Motion                             |
| Smooth scroll | Lenis                                     |
| Routing       | React Router                              |
| SEO           | react-helmet-async                        |
| Backend       | Express + Nodemailer + JSON file store    |

## Getting started

```bash
npm install
cp .env.example .env   # optional: add SMTP creds for real email

# Run frontend + backend together (recommended)
npm run dev:all
#   web → http://localhost:5173   (proxies /api → :3001)
#   api → http://localhost:3001
```

Run them separately if you prefer: `npm run dev` and `npm run server`.

> Without SMTP credentials the backend **logs** emails to the console and still
> persists submissions to `server/data/*.json`, so the whole flow works out of
> the box in development.

## Production

```bash
npm run build     # emits dist/
npm start         # NODE_ENV=production; Express serves dist/ + /api on :3001
```

## API

| Method | Endpoint         | Body                                                             |
| ------ | ---------------- | ---------------------------------------------------------------- |
| POST   | `/api/contact`   | `{ name, company, email, phone, subject, message, consent }`     |
| POST   | `/api/newsletter`| `{ email }`                                                      |
| GET    | `/api/health`    | —                                                                |

Both write endpoints are validated, rate-limited, and honeypot-protected.

## Project structure

```
src/
  components/
    layout/      Navbar, Footer, CustomCursor, Seo, ScrollToTop, Layout
    sections/    Hero, Services, WhyChooseUs, Methodology, Industries,
                 CaseStudies, Testimonials, Faq, Newsletter, ContactCta
    ui/          Button, GlassCard, Section, Reveal, Field, AuroraBackground,
                 ScrollProgress
  pages/         Home, Contact, Privacy, Terms, NotFound
  hooks/         useLenis, useMousePosition, useMagnetic, useMediaQuery,
                 usePrefersReducedMotion
  animations/    variants.js (Framer Motion presets)
  context/       CursorContext
  services/      api.js
  utils/         validation.js, scroll.js
  constants/     site.js, content.js
  styles/        variables, reset, typography, glass, buttons, layout,
                 animations, utilities, components, globals
server/          index.js (Express), mailer.js, store.js, data/
```

## Design tokens

Brand palette, radii, motion and Liquid Glass values live in
`src/styles/variables.css`. Never pure black — the darkest ink is `#241924`.
Typography is **Shippori Mincho** (400 / 600 / 700).

## Extending

- Add a page: create it in `src/pages/`, add a `<Route>` in
  `components/layout/Layout.jsx`, and a `<Seo />` block.
- Add content: edit `src/constants/content.js` — sections are data-driven.
- Swap the store for a database: implement the same `append` / `readAll`
  surface in `server/store.js`.
```
