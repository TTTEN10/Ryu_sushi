"""Production-parity API proxy (Scaleway direct or legacy chatbot). Synced to prod via deploy-app.sh."""
import os
import time

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

app = FastAPI()
MODEL_API_URL = os.getenv("MODEL_API_URL", "http://127.0.0.1:8000").rstrip("/")
MODEL_API_URL_ALT = os.getenv("MODEL_API_URL_ALT", "").strip().rstrip("/")
USE_SCALEWAY_DIRECT = os.getenv("USE_SCALEWAY_DIRECT", "").strip().lower() in ("1", "true")
SCALEWAY_API_KEY = os.getenv("SCALEWAY_API_KEY", "").strip()
SCALEWAY_MODEL = os.getenv("SCALEWAY_MODEL", "mistral-small-3.2-24b-instruct-2506").strip()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
@app.get("/healthz")
def healthz():
    return {"ok": True, "service": "backend"}


def _upstream_bases():
    out = []
    for b in (MODEL_API_URL, MODEL_API_URL_ALT):
        if b and b not in out:
            out.append(b)
    return out if out else ["http://127.0.0.1:8000"]


def _models_upstream():
    if USE_SCALEWAY_DIRECT and SCALEWAY_API_KEY:
        return {
            "object": "list",
            "data": [
                {
                    "id": SCALEWAY_MODEL,
                    "object": "model",
                    "created": int(time.time()),
                    "owned_by": "scaleway",
                }
            ],
            "routing": "scaleway-direct",
        }
    errors = []
    timeout = httpx.Timeout(45.0, connect=15.0)
    for base in _upstream_bases():
        try:
            with httpx.Client(timeout=timeout) as client:
                r = client.get(f"{base}/v1/models")
                if r.status_code == 200:
                    data = r.json()
                    if isinstance(data, dict) and "data" in data:
                        return data
                errors.append(f"{base}: HTTP {r.status_code}")
        except Exception as e:
            errors.append(f"{base}: {type(e).__name__}")
    return JSONResponse(
        status_code=200,
        content={
            "object": "list",
            "data": [
                {
                    "id": os.getenv("FALLBACK_MODEL_ID", "dr-safe"),
                    "object": "model",
                    "created": int(time.time()),
                    "owned_by": "safepsy",
                }
            ],
            "warning": "chatbot /v1/models unreachable from app proxy: " + "; ".join(errors[:5]),
        },
    )


@app.get("/models")
def models():
    return _models_upstream()


@app.get("/v1/models")
def v1_models():
    return _models_upstream()


@app.post("/chat/completions")
@app.post("/v1/chat/completions")
def chat_completions_migrated():
    raise HTTPException(
        status_code=410,
        detail="Chat completions are served by node-api; update Caddy to route /api/chat/completions to node-api:3001",
    )
