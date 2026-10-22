# Ryu Sushi - Project Documentation

## Purpose

**Ryu Sushi** is a premium animated website for a Japanese food truck business. The site serves as the digital storefront for the Ryu Sushi brand, showcasing their menu, enabling customer reservations, and providing contact/ordering capabilities.

### Business Goals
- Present the food truck's premium Japanese cuisine offerings
- Enable customers to make reservations for events/catering
- Provide contact and ordering channels
- Build brand identity through high-quality animations and visual design
- Capture leads through newsletter signup

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                          │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  React 19 + Vite SPA                                │    │
│  │  ├── Pages (HomePage)                               │    │
│  │  ├── Sections (Hero, Menu, About, Contact, etc.)    │    │
│  │  ├── Components (Layout, UI)                        │    │
│  │  ├── Animations (Framer Motion, Lenis)              │    │
│  │  └── Styling (CSS Modules architecture)             │    │
│  └─────────────────────────────────────────────────────┘    │
│                              │                               │
│                         (Vite Proxy)                         │
│                              │                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Backend API Server (Express + Node.js)             │    │
│  │  ├── Contact form handler                           │    │
│  │  ├── Reservation system                             │    │
│  │  ├── Newsletter signup                              │    │
│  │  ├── Email service (Nodemailer)                     │    │
│  │  └── SQLite database                                │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19 | UI framework |
| Vite | 6.2 | Build tool & dev server |
| Framer Motion | 12.4 | Animations |
| Lenis | 1.1 | Smooth scrolling |
| React Router DOM | 7.2 | Client-side routing |
| React Hook Form | 7.54 | Form handling |
| React Helmet Async | 2.0 | Document head management |
| React Icons | 5.5 | Icon library |

### Backend
| Technology | Purpose |
|------------|---------|
| Express | API server framework |
| Node.js | Runtime |
| Better-SQLite3 | Database |
| Nodemailer | Email delivery |
| CORS | Cross-origin requests |

### Development
| Technology | Purpose |
|------------|---------|
| Concurrently | Run multiple commands |
| CSS Modules (plain CSS) | Styling architecture |

---

## Project Structure

```
Ryu Sushi/
├── src/
│   ├── AppRouter.jsx          # Main router with ink transition effect
│   ├── main.jsx               # Entry point
│   ├── pages/
│   │   └── HomePage.jsx       # Single-page application home
│   ├── sections/              # Page sections (feature-level components)
│   │   ├── HeroSection.jsx
│   │   ├── MenuSection.jsx
│   │   ├── AboutSection.jsx
│   │   ├── ContactSection.jsx
│   │   ├── ReservationSection.jsx
│   │   ├── FoodTruckSection.jsx
│   │   ├── GallerySection.jsx
│   │   ├── FaqSection.jsx
│   │   ├── SignatureRollsSection.jsx
│   │   └── SpecialsSection.jsx
│   ├── components/
│   │   ├── layout/            # Layout components (Header, Footer, etc.)
│   │   └── ui/                # Reusable UI components
│   ├── services/
│   │   └── api.js             # API client utilities
│   ├── hooks/                 # Custom React hooks
│   ├── constants/             # App-wide constants
│   ├── utils/                 # Helper functions
│   ├── animations/            # Animation configurations
│   └── styles/                # CSS stylesheets
├── server/
│   ├── index.js               # Express server entry
│   └── db.js                  # SQLite database setup
├── public/
│   └── images/                # Toutes les images du site (voir ci-dessous)
├── dist/                      # Production build output
├── index.html                 # HTML entry point
├── vite.config.js             # Vite configuration
├── package.json               # Dependencies & scripts
└── .env.example               # Environment variables template
```

---

## Images

Toutes les images vivent dans `public/images/` (dossier unique, noms de fichiers ASCII en
kebab-case). Elles sont servies à l'URL `/images/<nom>`.

Convention de nommage :

| Préfixe | Usage |
|---------|-------|
| `ryu-*` | Identité de marque (logo, camion) |
| `gallery-*` | Photos de la section Galerie |
| `<plat>.<ext>` | Vignette d'un article du menu (`cali-mango.png`, `sashimi-thon.png`…) |
| `poke-bowl`, `brochettes-japonaises` | Photo unique d'une catégorie entière |

Chaque article de `MENU_ITEMS` (`src/constants/menu.js`) porte un champ `image` optionnel,
résolu en `/images/<image>` et affiché en vignette ronde à gauche du nom. Les catégories qui
n'ont qu'une seule photo pour plusieurs articles (`Poke Bowls`, `Brochettes`) sont déclarées
dans `MENU_CATEGORY_IMAGES` : leur image s'affiche une fois en tête de catégorie.

Images conservées dans le dossier mais non affichées : `eau.jpg`, `mogu-mogu-fraise.jpg`,
`mogu-mogu-mangue.jpg`, `instagram-473044809.jpg`.

---

## API Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/contact` | Submit contact form |
| `POST` | `/api/reservation` | Submit reservation request |
| `POST` | `/api/newsletter` | Subscribe to newsletter |
| `POST` | `/api/email/send` | Send email (internal) |
| `GET` | `/api/health` | Health check |

---

## Development Commands

```bash
# Install dependencies
npm install

# Start frontend only (port 5173)
npm run dev

# Start backend only (port 3001)
npm run server

# Start both concurrently
npm run dev:all

# Production build
npm run build

# Preview production build
npm run preview
```

---

## Data Flow

### Form Submission Flow
```
User fills form → React Hook Form validates → API call (api.js) 
→ Express route handler → Nodemailer sends email → SQLite logs record 
→ Success/error response → UI feedback
```

### Page Navigation Flow
```
Link click → React Router navigation → InkTransition animation 
→ Route match → Section component render → Framer Motion entrance
```

---

## Brand Assets

### Colors
| Name | Hex | Usage |
|------|-----|-------|
| Primary Red | `#E73636` | CTAs, accents, highlights |
| Pitch Black | `#120B03` | Text, backgrounds |
| Floral White | `#FAF7EF` | Primary background |
| Golden Orange | `#F0A202` | Secondary accents |
| Cool Steel | `#7E94A0` | Muted text, borders |

### Typography
- Font families defined in CSS variables
- Japanese-inspired aesthetic
- CSS fishes animation in the background

---

## Key Design Patterns

### 1. Section-Based Page Architecture
The single-page application is composed of full-screen sections, each representing a distinct content area (Hero, Menu, About, etc.).

### 2. Ink Transition Effect
Page transitions use a clip-path animation that mimics ink spreading across paper, reinforcing the Japanese aesthetic.

### 3. CSS Modules Approach
Plain CSS files organized by component/section, following CSS Modules naming conventions for scoping.

### 4. Animation-First UX
Framer Motion powers entrance animations, hover states, and scroll-based effects. Lenis provides smooth scroll behavior.

---

## Environment Variables

Required for email functionality (copy `.env.example` to `.env`):

```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-user
SMTP_PASS=your-password
SMTP_FROM=hello@ryusushi.com
ADMIN_EMAIL=hello@ryusushi.com
```

---

## Deployment Considerations

- Frontend builds to `dist/` directory
- Backend runs as a standalone Node.js server
- SQLite database file location must be configured for production
- SMTP credentials required for email features
- Vite proxy configuration forwards `/api` requests to backend

---

## Files to Know

| File | Purpose |
|------|---------|
| `src/AppRouter.jsx` | Routing + transition animations |
| `src/pages/HomePage.jsx` | Main page composition |
| `server/index.js` | API server implementation |
| `src/services/api.js` | Frontend API client |
| `vite.config.js` | Build + proxy configuration |
| `src/sections/` | All page content sections |

---

## AI Agent Guidelines

When working on this codebase:

1. **Match the style**: Code uses functional React components with hooks, plain CSS for styling
2. **Preserve animations**: Framer Motion and Lenis integrations are core to the UX
3. **Section structure**: New sections should follow the pattern in `src/sections/`
4. **API consistency**: New endpoints follow the Express + SQLite + Nodemailer pattern
5. **Brand colors**: Use CSS variables from the brand palette

---

*Last updated: July 2025*
