# SafePsy web app (`apps/web`)

Vite + React client for marketing pages, beta chat, wallet/DID flows, and legal pages.

Full developer guide (env vars, guest mode, wallet mode, metrics): **`documentation/private documentation/WEB_APP_DEVELOPER_GUIDE.md`** (local clone only; not published on GitHub).

Quick start from repo root:

```bash
cp apps/web/env.example apps/web/.env
docker compose -f docker-compose.local.yml up -d postgres redis
npm run dev
```
