# Chatbot deployment migration (2026-05)

Production no longer deploys a separate FastAPI chatbot VM or vLLM container. LLM traffic goes **Scaleway Generative API direct** from the app host Python proxy.

## Current production path

| Layer | Location |
|-------|----------|
| Deploy entry | `./deployment/deploy-live-app.sh` |
| Runbook | `deployment/DEPLOY-RUNBOOK.md` |
| App host | scw-last-app `151.115.151.231` — Caddy + Vite SPA + Python proxy |
| LLM | `USE_SCALEWAY_DIRECT=1` → Scaleway Generative API (`SCALEWAY_API_KEY` in repo `.env`) |
| Verify | `CHECK_LLM=1 USE_SCALEWAY_DIRECT=1 ./deployment/verify-production.sh` |

## Removed from the repo

- `apps/ai-chatbot/` — FastAPI inference service
- `deploy/chatbot/` — chatbot env template
- `deployment/chatbot/` — remote docker-compose for chatbot VM
- `deployment/bootstrap-chatbot-host.sh` — SSH bootstrap for chatbot host
- `deployment/test-llm-route-from-app.sh` — app → vLLM connectivity probe
- `instance_chatbot.md` — GPU/CPU sizing for dedicated chatbot instances

## Local / full-stack development

- **Web + Node API:** `npm run dev` — `ChatWidget` → `apps/api` → Scaleway or mock (`AIGatewayService`)
- **Prod-like stack on Mac:** `npm run deploy:local` — same Caddy + Python proxy as production (`deployment/deploy-local-app.sh`)

## Node API vs production proxy

| Environment | Serves `/api/chat/completions` |
|-------------|--------------------------------|
| `npm run dev` | Node `apps/api` (SSE, guest mode, encryption, RAG, crisis detection) |
| `deploy-live-app.sh` | Python proxy on app host (OpenAI-shaped; Scaleway direct) |

Architecture details: `documentation/private documentation/chatbot.md`.
