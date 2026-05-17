"""Production-parity API proxy (Scaleway direct or legacy chatbot). Synced to prod via deploy-app.sh."""
import json
import os
import time
from pathlib import Path

import httpx
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.responses import StreamingResponse

app = FastAPI()
MODEL_API_URL = os.getenv("MODEL_API_URL", "http://127.0.0.1:8000").rstrip("/")
MODEL_API_URL_ALT = os.getenv("MODEL_API_URL_ALT", "").strip().rstrip("/")
USE_SCALEWAY_DIRECT = os.getenv("USE_SCALEWAY_DIRECT", "").strip().lower() in ("1", "true")
SCALEWAY_API_KEY = os.getenv("SCALEWAY_API_KEY", "").strip()
SCALEWAY_PROJECT_ID = os.getenv("SCALEWAY_PROJECT_ID", "5dad0cb7-c16a-4447-9a25-e89bd3448e8a").strip()
SCALEWAY_MODEL = os.getenv("SCALEWAY_MODEL", "mistral-small-3.2-24b-instruct-2506").strip()
SCALEWAY_API_BASE_URL = os.getenv("SCALEWAY_API_BASE_URL", "").strip().rstrip("/")
DEFAULT_MAX_TOKENS = 300
_PROMPT_DIR = Path(__file__).resolve().parent


def _load_dr_safe_system_prompt(mode: str | None) -> str:
    base = (_PROMPT_DIR / "dr_safe_system_prompt.txt").read_text(encoding="utf-8").strip()
    if mode == "guest":
        guest = (_PROMPT_DIR / "dr_safe_guest_append.txt").read_text(encoding="utf-8").strip()
        return f"{base}\n\n{guest}"
    return base


def _scaleway_v1_base() -> str:
    if SCALEWAY_API_BASE_URL:
        return SCALEWAY_API_BASE_URL
    return f"https://api.scaleway.ai/{SCALEWAY_PROJECT_ID}/v1"


def _scaleway_auth_headers(content_type: str = "application/json") -> dict:
    return {"Authorization": f"Bearer {SCALEWAY_API_KEY}", "Content-Type": content_type}


def _scaleway_request_body(body: bytes) -> bytes:
    try:
        data = json.loads(body)
        if not isinstance(data, dict):
            return body

        if not data.get("model"):
            data["model"] = SCALEWAY_MODEL

        mode = data.pop("mode", None)
        if isinstance(mode, str):
            mode = mode.strip().lower() or None
        else:
            mode = None

        messages = data.get("messages")
        if isinstance(messages, list):
            has_system = any(
                isinstance(m, dict) and m.get("role") == "system" for m in messages
            )
            if not has_system:
                data["messages"] = [
                    {"role": "system", "content": _load_dr_safe_system_prompt(mode)}
                ] + messages

        max_t = data.pop("maxTokens", None)
        if max_t is None:
            max_t = data.get("max_tokens")
        if max_t is None:
            data["max_tokens"] = DEFAULT_MAX_TOKENS
        else:
            try:
                data["max_tokens"] = min(int(max_t), DEFAULT_MAX_TOKENS)
            except (TypeError, ValueError):
                data["max_tokens"] = DEFAULT_MAX_TOKENS

        return json.dumps(data).encode("utf-8")
    except Exception:
        pass
    return body


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


def _want_stream(body: bytes) -> bool:
    try:
        return json.loads(body).get("stream", True) is True
    except Exception:
        return True


@app.post("/chat/completions")
@app.post("/v1/chat/completions")
async def v1_chat_completions(request: Request):
    body = await request.body()
    ctype = request.headers.get("content-type", "application/json")
    timeout = httpx.Timeout(300.0, connect=30.0)
    want_stream = _want_stream(body)
    last_err = None

    if USE_SCALEWAY_DIRECT and SCALEWAY_API_KEY:
        url = f"{_scaleway_v1_base()}/chat/completions"
        headers = _scaleway_auth_headers(ctype)
        body = _scaleway_request_body(body)
        try:
            if want_stream:

                async def gen_scaleway():
                    async with httpx.AsyncClient(timeout=timeout) as client:
                        async with client.stream("POST", url, content=body, headers=headers) as response:
                            if response.status_code >= 400:
                                detail = (await response.aread())[:800].decode("utf-8", errors="replace")
                                raise HTTPException(
                                    status_code=502, detail=f"Scaleway {response.status_code}: {detail}"
                                )
                            async for chunk in response.aiter_bytes():
                                yield chunk

                return StreamingResponse(gen_scaleway(), media_type="text/event-stream", status_code=200)

            async with httpx.AsyncClient(timeout=timeout) as client:
                r = await client.post(url, content=body, headers=headers)
            return Response(
                content=r.content,
                status_code=r.status_code,
                media_type=r.headers.get("content-type", "application/json"),
            )
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Scaleway unreachable: {e!s}") from e

    headers = {"Content-Type": ctype}
    for base in _upstream_bases():
        url = f"{base}/v1/chat/completions"
        try:
            if want_stream:

                async def gen(u=url):
                    async with httpx.AsyncClient(timeout=timeout) as client:
                        async with client.stream("POST", u, content=body, headers=headers) as response:
                            async for chunk in response.aiter_bytes():
                                yield chunk

                return StreamingResponse(gen(), media_type="text/event-stream", status_code=200)

            async with httpx.AsyncClient(timeout=timeout) as client:
                r = await client.post(url, content=body, headers=headers)
            return Response(
                content=r.content,
                status_code=r.status_code,
                media_type=r.headers.get("content-type", "application/json"),
            )
        except Exception as e:
            last_err = e
            continue
    raise HTTPException(status_code=502, detail=f"chatbot unreachable: {last_err!s}")
