# Ryu Sushi

Premium animated website for the Ryu Sushi Japanese food truck.

## Stack

- **Frontend:** React 19, Vite, Framer Motion, Lenis, React Hook Form
- **Backend:** Node.js, Express, SQLite
- **Styling:** Plain CSS (CSS Modules architecture)

## Getting Started

```bash
# Install dependencies
npm install

# Start frontend dev server
npm run dev

# Start backend API server
npm run server

# Start both concurrently
npm run dev:all
```

Frontend runs at `http://localhost:5173`  
API runs at `http://localhost:3001` (proxied via `/api`)

## Build

```bash
npm run build
npm run preview
```

## API Routes

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/contact` | Contact form submission |
| POST | `/reservation` | Reservation requests |
| POST | `/newsletter` | Newsletter signup |
| POST | `/email/send` | Send email |
| GET | `/health` | Health check |

## Environment Variables

Create a `.env` file in the project root for email functionality:

```
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-user
SMTP_PASS=your-password
SMTP_FROM=hello@ryusushi.com
ADMIN_EMAIL=hello@ryusushi.com
```

## Brand Colors

| Name | Hex |
|------|-----|
| Primary Red | `#E73636` |
| Pitch Black | `#120B03` |
| Floral White | `#FAF7EF` |
| Golden Orange | `#F0A202` |
| Cool Steel | `#7E94A0` |
