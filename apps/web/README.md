# SafePsy web app (`apps/web`)

Vite + React client for marketing pages, beta chat, wallet/DID flows, and legal pages.

## Environment variables

Create **`apps/web/.env`** from **`apps/web/env.example`** (`cp apps/web/env.example apps/web/.env`).

| Variable | Purpose |
|----------|---------|
| **`VITE_WALLETCONNECT_PROJECT_ID`** | **WalletConnect** (QR modal, mobile wallets). From [WalletConnect Cloud](https://cloud.walletconnect.com). If unset or left as the placeholder, only **injected extension wallets** (e.g. MetaMask) work for “Connect wallet”. |
| `VITE_API_URL` | API base URL for fetches; leave empty to use same-origin `/api` (Vite proxy in dev, your host in prod). |

Rebuild the client after changing any `VITE_*` value (`npm run build`).

## Local dependencies (recommended)

From the repo root:

```bash
docker compose -f docker-compose.local.yml up -d postgres redis
docker compose -f docker-compose.local.yml --profile rag up -d qdrant
```

Then set `DATABASE_URL` in `.env` (see `env.example`) and run `npm run dev`.

## Guest mode

- **No wallet** is required to try the chat (`/beta/chat`). Messages stay in the browser for that session only (React state); a full page refresh clears them.
- Guests are limited to **five user messages** per session. The UI shows a banner, usage counter, and a conversion modal linking to wallet creation (e.g. MetaMask) and the in-header **Connect wallet** control.
- API requests send `mode: "guest"` on `POST /api/chat/completions` so the backend does not attach DID quota or persist guest transcripts.

## Wallet mode

After **connect + verify**, chat uses client-side encryption (`useChatEncryption`) and `/api/chat/save` / `/api/chat/load` for ciphertext storage, subject to product limits and subscriptions.

## Product conversion metrics (optional)

If the user enables **analytics cookies**, the client stores anonymous milestone timestamps in the first-party cookie `sp_product_metrics` (landing session, wallet funnel, verified session, DID present, first message / first reply, return within 24h) and POSTs the same JSON to **`POST /api/metrics/funnel`** (same-origin `/api` in dev via Vite proxy), with `credentials: 'include'`, debounced and on tab hide. No wallet addresses or chat text. See `documentation/public documentation/CONVERSION_METRICS.md`.

## Chat upstream configuration

- If no LLM upstream is configured, the UI shows a **local mock mode** banner.
- Configure one of:
  - `SCALEWAY_API_KEY` for Scaleway Generative API
  - `AI_GPU_BASE_URL` / `CHATBOT_BASE_URL` for a self-hosted OpenAI-compatible upstream
