# AGENTS.md

Guidance for working in the **Ryu Sushi** repository: an animated single-page website for a Japanese sushi food truck that travels around the Morbihan region (Bretagne, France).

## Stack

- **Frontend:** React 19 (functional components + hooks only, no classes), Vite 6, Framer Motion 12, Lenis 1 (smooth scroll), React Router 7
- **Backend:** Express 4 + better-sqlite3 + nodemailer, all in one file (`server/index.js`)
- **Styling:** plain CSS, one global stylesheet set, imported via `src/styles/globals.css`. No preprocessor, no CSS-in-JS, no module scoping
- **Node/npm:** verified on Node v26, npm 11. Lockfile (`package-lock.json`) present, use `npm ci`/`npm install`

## Commands

```bash
npm install           # install deps
npm run dev           # Vite dev server only -> http://localhost:5173 (frontend ONLY)
npm run server        # Express API only      -> http://localhost:3001 (backend ONLY)
npm run dev:all       # both concurrently      (concurrently)
npm run build         # production build to dist/ (this is the de-facto verification step)
npm run preview       # serve the built dist/
```

- **There is no test suite and no linter/formatter config.** Verify changes with `npm run build` (currently builds clean in ~3s) and manual checks.
- **Gotcha:** `npm run dev` does **not** start the backend. The Vite proxy forwards `/api/*` to `localhost:3001`, so any form submission will fail unless you also run `npm run server` (or use `dev:all`). The frontend works fine without the backend, only forms/API calls break.

## Architecture & Data Flow

Single-page site. `src/AppRouter.jsx` routes only `/` to `HomePage`, wrapped in an `InkTransition` (clip-path page-reveal). `HomePage.jsx` composes everything:

```
LoadingScreen (blocks render until onComplete) → Lenis init
→ <SEO/> (all meta + JSON-LD)
→ <KoiPond/> (background fish animation)
→ sections composed with <Suspense> + React.lazy:
   Hero → WaveDivider → About → WaveDivider → Gallery → WaveDivider
   → FoodTruck → WaveDivider → Menu → Contact
→ Footer
```

Control/data flow is **constants-driven** — the UI and the SEO schema both derive from the same data sources, so editing data updates everywhere without touching markup:

1. **Menu:** `src/constants/menu.js` is the single source of truth (comment: "source: menu_2026.md"). `menu_2026.md` is the authoritative human-facing document — keep both in sync. Structure: `MENU_CATEGORIES` (ordered array), `MENU_CATEGORY_NOTES`, `MENU_ITEMS` (record keyed by category), `MENU_CATEGORY_IMAGES` (one shared photo per category, e.g. Poke Bowls/Brochettes), `MENU_FORMULES` (the "Menus" tab, different shape: `pieces`, `persons`, `contents[]`, `sides`, optional `meta`/`note`).
2. **Schedule:** `WEEKLY_SCHEDULE` in `src/constants/index.js` is the single source of truth (doc: `planning_ryu_sushi.md`). Derived exports (`SERVED_CITIES`, `SCHEDULE_STOPS`, `OPENING_HOURS`) feed the SEO schema and the Food Truck section automatically. Scheduled "open now" logic lives in `src/utils/index.js` (`getOpenStatus`, `getBiweeklyState`, `getIsoWeekNumber`, `formatTimeLabel`, etc.). **Saturday is biweekly — odd ISO weeks only** (`biweekly: true` on Samedi).
3. **SEO:** `src/components/layout/SEO.jsx` builds every meta tag + ~8 JSON-LD schemas (WebSite, Organization, Restaurant, FoodTruck, one FoodEstablishment per schedule stop, BreadcrumbList, Menu) **purely from the constants above**. `SITE_URL` in `src/constants/index.js` is `https://ryusushi.com` — canonical, og, and all `@id` values reference it. Keep `public/sitemap.xml` and `public/robots.txt` in sync manually if URLs change.
4. **Forms:** `src/services/api.js` POSTs to `/api/{contact|reservation|newsletter}`. Vite proxy strips the `/api` prefix and rewrites to the Express server. Server validates + sanitizes with French error messages, writes to SQLite (`server/ryu-sushi.db`, created + auto-schema'd on first run, gitignored), then emails.

## Non-obvious Gotchas

- **`--black` and `--cream` CSS variables are named semantically, not literally.** In `src/styles/variables.css`, dark mode (default) defines `--black: #FAF7EF` (a light cream) and `--cream: #1A1410` (near-black). Think "ink on paper", not hex values. `--white` is also `#FAF7EF`. The `[data-theme="light"]` block remaps them to the literal colors. Theme is toggled by `data-theme` on `<html>` (index.html starts `data-theme="dark"`); `useTheme` in `src/hooks/index.js` persists `ryu-theme` in localStorage. Real brand palette: `--red #E73636`, `--orange #F0A202`, `--steel #7E94A0`.
- **Dead / orphaned code exists.** Only these sections are rendered: Hero, About, Gallery, FoodTruck, Menu, Contact. These are **not imported anywhere** (tree-shaken from the build): `src/sections/FaqSection.jsx`, `ReservationSection.jsx`, `SignatureRollsSection.jsx`, `SpecialsSection.jsx`. Likewise unused UI components: `AnimatedTruck.jsx`, `ChopstickCursor.jsx`, `FloatingIngredients.jsx`; `SteamEffect.jsx` is used only by the orphaned SpecialsSection. Unused constants tied to them: `SIGNATURE_ROLLS`, `FAQ_ITEMS`, `SPECIALS`. **`react-hook-form` and `submitReservation` are only consumed by the orphaned `ReservationSection`** — don't assume they're wired to real UI. Before wiring up or editing these, decide whether to revive or delete.
- **Content is in French** — UI copy, server validation messages (e.g. `'Nom valide requis'`), code comments, and docs. Prices use French formatting: `"6,50 €"` (comma). The Menu schema in SEO.jsx deliberately converts commas to dots for `Offer.price`. Keep new content French unless asked otherwise.
- **`public/llms.txt` is stale and wrong** — it still describes the truck as "à Paris" while the business (and all other SEO files) are in the **Morbihan/Vannes region**. `robots.txt` and `sitemap.xml` are correct. `llms.txt` needs updating if touched, but don't surprise-fix unrelated files.
- **Emails are silently skipped** if `SMTP_USER` is unset: `sendEmail` logs `[Email skipped]` and resolves, while the SQLite insert still succeeds. SMTP defaults to `smtp.ethereal.email`. Dashboard/UX shows success either way. `.env` is gitignored; copy `.env.example`.
- **README/PROJECT.md drift:** `PROJECT.md` mentions `server/db.js` but the database setup actually lives inline in `server/index.js` (there is no `db.js`). `AUDIT_SUMMARY.md` is a historical audit (2026-07) and describes an older Vannes-only schedule that no longer matches `WEEKLY_SCHEDULE`.
- **Server hardening is intentional:** security headers middleware, in-memory rate limit (100 req/min/IP), input sanitization (`sanitizeInput` strips `<`/`>` and caps at 1000 chars), body limit `10mb`. Preserve these on any new endpoint.
- **Images:** everything lives in `public/images/` (single flat folder, ASCII kebab-case). Referenced by absolute path `/images/<name>` (never imported through bundler for public images). Menu item thumbnails resolve via `item.image`; see the schema for `MENU_CATEGORY_IMAGES` fallback. Unused-but-kept images: `eau.jpg`, `mogu-mogu-fraise.jpg`, `mogu-mogu-mangue.jpg`, `instagram-473044809.jpg`.
- **Koi animation:** `KoiPond.jsx` renders purely decorative fish; all movement/coloring is CSS in `src/styles/koi.css`, parameterized per-fish via inline CSS custom properties (`--koi-dur`, `--koi-delay`, `--koi-rest`) plus path/size/depth/color classes (`koi--pathA/B`, `--sm/--md/--lg`, `--front/--mid/--back`, `--orange`, `--sumi`). The current branch is a koi rework to match brand artwork — preserve the class-pattern approach. `aria-hidden="true"` on all decorative elements.

## Conventions to Follow

- **Sections** (`src/sections/`): default-exported function component; root `<section id="..." className="section [section--dark]" aria-label="...">`; content in `.container`; optional `<span className="kanji-deco">` kanji accent; motion entrance via `initial="hidden" whileInView="visible" viewport={defaultViewport} variants={fadeInUp}` from `src/animations/variants.js` (shared variants: `fadeInUp`, `fadeInLeft/Right`, `fadeInScale`, `blurReveal`, `maskReveal`, `staggerContainer`; `defaultViewport = { once: true, margin: '-80px' }`).
- **UI components** (`src/components/ui/`): small presentational widgets (KoiPond, WaveDivider, LoadingScreen). `WaveDivider` is placed between sections with alternating `flip` + `color` props ("var(--black)" / "var(--cream)").
- **Naming:** files kebab-case (`FoodTruckSection.jsx`); components `PascalCase`; CSS uses BEM-ish blocks (`menu-list__item`, `schedule-card--today`); hooks prefixed `use` and grouped in `src/hooks/index.js`.
- **Data:** keep content in `src/constants/`, presentation logic in `src/utils/index.js`, API wrapper in `src/services/api.js` importing nothing from React.
- **Lenis:** initialized only in `HomePage` after the loading screen completes; destroy on unmount. CSS helpers in `globals.css` (`html.lenis`, `[data-lenis-prevent]`).
