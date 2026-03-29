"""
AI Chatbot Service - vLLM-based OpenAI-compatible API
Serves Qwen2.5-Instruct (default) via vLLM with SSE streaming support
"""
import os
import time
import json
import logging
from typing import Optional, List, Dict, Any
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import uvicorn

# Configure logging
logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO").upper(),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Global state
app_state = {
    "model_loaded": False,
    "model_name": None,
    "model_revision": None,
    "start_time": time.time(),
    "llm_engine": None,
    "use_gpu": os.getenv("USE_GPU", "true").lower() == "true",
}

# Environment variables
PORT = int(os.getenv("PORT", "8000"))
MODEL_NAME = os.getenv("MODEL_NAME", "Qwen/Qwen2.5-7B-Instruct")
MODEL_REVISION = os.getenv("MODEL_REVISION", "main")
MAX_MODEL_LEN = int(os.getenv("MAX_MODEL_LEN", "8192"))
GPU_MEMORY_UTILIZATION = float(os.getenv("GPU_MEMORY_UTILIZATION", "0.9")) if os.getenv("GPU_MEMORY_UTILIZATION") else None
VLLM_TENSOR_PARALLEL_SIZE = int(os.getenv("VLLM_TENSOR_PARALLEL_SIZE", "1")) if os.getenv("VLLM_TENSOR_PARALLEL_SIZE") else None
VLLM_ENABLE_CHUNKED_PREFILL = os.getenv("VLLM_ENABLE_CHUNKED_PREFILL", "true").lower() == "true"
VLLM_MAX_NUM_SEQS = int(os.getenv("VLLM_MAX_NUM_SEQS", "256"))
AI_INTERNAL_API_KEY = os.getenv("AI_INTERNAL_API_KEY", "")  # API key for authentication

DEFAULT_SYSTEM_PROMPT = """You are an AI psychological support assistant.

Your role is NOT to diagnose or replace therapy.
Your role is to help users:
- reflect on their thoughts and emotions
- structure what they feel
- prepare for therapy sessions
- explore patterns gently

Communication style:
- warm, calm, non-judgmental
- never authoritative or absolute
- ask open-ended questions
- validate emotions before suggesting anything

Rules:
- never give medical or diagnostic claims
- avoid clichés or generic advice
- prioritize depth over speed
- if risk detected (self-harm), encourage seeking human help

Techniques allowed:
- cognitive behavioral reflection (CBT)
- reframing thoughts
- emotional labeling
- gentle curiosity

Respond thoughtfully in the user's language when they write in French, English, or Russian."""

CRISIS_PREPEND = (
    "I'm really glad you shared this… you don't have to go through this alone…\n\n"
)

# Lightweight keyword scan (EN / FR / RU); not a substitute for professional triage.
CRISIS_KEYWORDS = (
    "suicide",
    "suicidal",
    "self-harm",
    "self harm",
    "kill myself",
    "end my life",
    "want to die",
    "hurt myself",
    "self-injur",
    "overdose",
    "hang myself",
    "me suicider",
    "me tuer",
    "finir ma vie",
    "envie de mourir",
    "auto-mutilation",
    "automutilation",
    "суицид",
    "самоубийств",
    "покончить с собой",
    "хочу умереть",
    "навредить себе",
)

# Try to get git SHA from environment (set during build)
GIT_SHA = os.getenv("GIT_SHA", "unknown")
IMAGE_TAG = os.getenv("IMAGE_TAG", "unknown")


class ChatMessage(BaseModel):
    role: str = Field(..., description="Message role: user, assistant, or system")
    content: str = Field(..., description="Message content")


class ChatCompletionRequest(BaseModel):
    model: Optional[str] = Field(None, description="Model name (optional, uses default)")
    messages: List[ChatMessage] = Field(..., description="List of chat messages")
    temperature: Optional[float] = Field(0.7, ge=0.0, le=2.0, description="Sampling temperature")
    max_tokens: Optional[int] = Field(1000, ge=1, description="Maximum tokens to generate")
    stream: Optional[bool] = Field(False, description="Whether to stream the response")
    top_p: Optional[float] = Field(0.9, ge=0.0, le=1.0, description="Nucleus sampling parameter")
    frequency_penalty: Optional[float] = Field(0.0, ge=-2.0, le=2.0, description="Frequency penalty")
    presence_penalty: Optional[float] = Field(0.0, ge=-2.0, le=2.0, description="Presence penalty")


def detect_crisis_signals(text: str) -> bool:
    if not text or not text.strip():
        return False
    lowered = text.lower()
    return any(kw in lowered for kw in CRISIS_KEYWORDS)


def user_messages_text(messages: List[ChatMessage]) -> str:
    return "\n".join(m.content for m in messages if m.role == "user")


def prepare_messages_with_system(messages: List[ChatMessage]) -> List[ChatMessage]:
    """Ensure DEFAULT_SYSTEM_PROMPT is applied (merged with any client system message)."""
    if not messages:
        return [ChatMessage(role="system", content=DEFAULT_SYSTEM_PROMPT)]
    out: List[ChatMessage] = []
    merged = False
    for msg in messages:
        if msg.role == "system" and not merged:
            merged = True
            combined = f"{DEFAULT_SYSTEM_PROMPT}\n\n---\n\n{msg.content}"
            out.append(ChatMessage(role="system", content=combined))
        else:
            out.append(msg)
    if not merged:
        out.insert(0, ChatMessage(role="system", content=DEFAULT_SYSTEM_PROMPT))
    return out


def initialize_model():
    """Initialize vLLM engine (GPU mode) or mock (CPU mode)"""
    if not app_state["use_gpu"]:
        logger.info("USE_GPU=false: Running in mock/CPU mode")
        app_state["model_loaded"] = True
        app_state["model_name"] = "mock-model"
        app_state["model_revision"] = "mock"
        return
    
    try:
        import vllm
        from vllm import LLM, SamplingParams
        
        logger.info(f"Initializing vLLM with model: {MODEL_NAME}")
        
        # Build vLLM arguments (continuous batching is default; chunked prefill improves throughput)
        vllm_kwargs: Dict[str, Any] = {
            "model": MODEL_NAME,
            "trust_remote_code": True,
            "max_model_len": MAX_MODEL_LEN,
            "revision": MODEL_REVISION,
            "max_num_seqs": VLLM_MAX_NUM_SEQS,
        }
        
        if GPU_MEMORY_UTILIZATION:
            vllm_kwargs["gpu_memory_utilization"] = GPU_MEMORY_UTILIZATION
        
        if VLLM_TENSOR_PARALLEL_SIZE and VLLM_TENSOR_PARALLEL_SIZE > 1:
            vllm_kwargs["tensor_parallel_size"] = VLLM_TENSOR_PARALLEL_SIZE

        if VLLM_ENABLE_CHUNKED_PREFILL:
            vllm_kwargs["enable_chunked_prefill"] = True
        
        # Initialize LLM engine
        app_state["llm_engine"] = LLM(**vllm_kwargs)
        app_state["model_loaded"] = True
        app_state["model_name"] = MODEL_NAME
        app_state["model_revision"] = MODEL_REVISION
        
        logger.info(f"Model {MODEL_NAME} loaded successfully")
        
    except ImportError:
        logger.error("vLLM not installed. Install with: pip install vllm")
        app_state["model_loaded"] = False
    except Exception as e:
        logger.error(f"Failed to load model: {e}", exc_info=True)
        app_state["model_loaded"] = False


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup/shutdown"""
    # Startup
    logger.info("Starting AI Chatbot Service...")
    logger.info(f"USE_GPU={app_state['use_gpu']}")
    logger.info(f"MODEL_NAME={MODEL_NAME}")
    
    # Initialize model in background (non-blocking)
    try:
        initialize_model()
    except Exception as e:
        logger.error(f"Model initialization failed: {e}", exc_info=True)
        app_state["model_loaded"] = False
    
    yield
    
    # Shutdown
    logger.info("Shutting down AI Chatbot Service...")


app = FastAPI(
    title="AI Chatbot Service",
    description="OpenAI-compatible vLLM-based chat completion API",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def verify_api_key(
    authorization: Optional[str] = Header(None)
):
    """Verify API key for protected endpoints"""
    # Skip auth if key is not configured (for backward compatibility)
    if not AI_INTERNAL_API_KEY:
        return True  # No auth required if key not configured
    
    if not authorization:
        raise HTTPException(
            status_code=401,
            detail="Missing Authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Extract Bearer token
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Invalid Authorization header format. Expected: Bearer <token>",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = authorization[7:]  # Remove "Bearer " prefix
    
    if token != AI_INTERNAL_API_KEY:
        raise HTTPException(
            status_code=403,
            detail="Invalid API key"
        )
    
    return True


@app.get("/healthz")
async def healthz():
    """Health check endpoint - must be fast and stable (public endpoint)"""
    uptime = time.time() - app_state["start_time"]
    
    status = "ok" if app_state["model_loaded"] else "degraded"
    
    return JSONResponse({
        "status": status,
        "model_loaded": app_state["model_loaded"],
        "model_name": app_state["model_name"],
        "uptime": int(uptime),  # Production-ready format
        "uptime_seconds": int(uptime),  # Keep for backward compatibility
        "use_gpu": app_state["use_gpu"],
    })


@app.get("/version")
async def version():
    """Version endpoint with git SHA and image tag"""
    return JSONResponse({
        "git_sha": GIT_SHA,
        "image_tag": IMAGE_TAG,
        "model_name": app_state["model_name"],
        "model_revision": app_state["model_revision"],
        "service_version": "1.0.0",
    })


def generate_mock_response(messages: List[ChatMessage], stream: bool = False, crisis_detected: bool = False):
    """Generate a mock response for non-GPU mode"""
    response_text = "This is a mock response. GPU mode is disabled (USE_GPU=false)."
    if crisis_detected:
        response_text = CRISIS_PREPEND + response_text
    
    if stream:
        def mock_stream():
            # Simulate token-by-token streaming
            tokens = response_text.split()
            for i, token in enumerate(tokens):
                chunk = {
                    "id": f"mock-{int(time.time())}",
                    "object": "chat.completion.chunk",
                    "created": int(time.time()),
                    "model": "mock-model",
                    "choices": [{
                        "index": 0,
                        "delta": {"content": token + " "},
                        "finish_reason": None
                    }]
                }
                yield f"data: {json.dumps(chunk)}\n\n"
            
            # Final chunk
            final_chunk = {
                "id": f"mock-{int(time.time())}",
                "object": "chat.completion.chunk",
                "created": int(time.time()),
                "model": "mock-model",
                "choices": [{
                    "index": 0,
                    "delta": {},
                    "finish_reason": "stop"
                }]
            }
            yield f"data: {json.dumps(final_chunk)}\n\n"
            yield "data: [DONE]\n\n"
        
        return mock_stream()
    else:
        return {
            "id": f"mock-{int(time.time())}",
            "object": "chat.completion",
            "created": int(time.time()),
            "model": "mock-model",
            "choices": [{
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": response_text
                },
                "finish_reason": "stop"
            }],
            "usage": {
                "prompt_tokens": sum(len(msg.content.split()) for msg in messages),
                "completion_tokens": len(response_text.split()),
                "total_tokens": sum(len(msg.content.split()) for msg in messages) + len(response_text.split())
            }
        }


def generate_vllm_stream(
    messages: List[ChatMessage],
    temperature: float,
    max_tokens: int,
    model: str,
    top_p: float,
    prepend_crisis: bool = False,
):
    """Generate streaming response using vLLM"""
    if not app_state["llm_engine"]:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    from vllm import SamplingParams
    
    # Convert messages to prompt format
    # Use a simple chat template format
    prompt_parts = []
    for msg in messages:
        role = msg.role
        content = msg.content
        if role == "system":
            prompt_parts.append(f"System: {content}")
        elif role == "user":
            prompt_parts.append(f"User: {content}")
        elif role == "assistant":
            prompt_parts.append(f"Assistant: {content}")
    
    prompt = "\n".join(prompt_parts) + "\nAssistant:"
    
    # Create sampling params
    sampling_params = SamplingParams(
        temperature=temperature,
        max_tokens=max_tokens,
        top_p=top_p,
    )
    
    # Generate with streaming
    request_id = f"req-{int(time.time())}"
    completion_id = f"chatcmpl-{int(time.time())}"
    created_time = int(time.time())
    
    try:
        if prepend_crisis:
            chunk = {
                "id": completion_id,
                "object": "chat.completion.chunk",
                "created": created_time,
                "model": model or app_state["model_name"],
                "choices": [{
                    "index": 0,
                    "delta": {"content": CRISIS_PREPEND},
                    "finish_reason": None
                }]
            }
            yield f"data: {json.dumps(chunk)}\n\n"

        # vLLM's LLM.generate() returns a list of RequestOutput
        # For streaming, we use the generate() method which yields tokens
        # We'll use a synchronous generator that yields SSE chunks
        
        # Use vLLM's streaming generation
        # Note: vLLM's LLM class doesn't have native async streaming in all versions
        # We'll use the synchronous generate and yield tokens incrementally
        outputs = app_state["llm_engine"].generate([prompt], sampling_params, request_id=request_id)
        
        if not outputs or len(outputs) == 0:
            raise HTTPException(status_code=500, detail="No output generated")
        
        output = outputs[0]
        
        # Get the generated text
        generated_text = output.outputs[0].text
        
        # Stream the text token by token (split by whitespace for simplicity)
        # In production, you might want to use actual tokenization
        tokens = generated_text.split()
        previous_text = ""
        
        for i, token in enumerate(tokens):
            # Build up the text incrementally
            current_text = previous_text + (" " if previous_text else "") + token
            delta_text = token + (" " if i < len(tokens) - 1 else "")
            
            chunk = {
                "id": completion_id,
                "object": "chat.completion.chunk",
                "created": created_time,
                "model": model or app_state["model_name"],
                "choices": [{
                    "index": 0,
                    "delta": {"content": delta_text},
                    "finish_reason": None
                }]
            }
            yield f"data: {json.dumps(chunk)}\n\n"
            
            previous_text = current_text
        
        # Final chunk
        final_chunk = {
            "id": completion_id,
            "object": "chat.completion.chunk",
            "created": created_time,
            "model": model or app_state["model_name"],
            "choices": [{
                "index": 0,
                "delta": {},
                "finish_reason": "stop"
            }]
        }
        yield f"data: {json.dumps(final_chunk)}\n\n"
        yield "data: [DONE]\n\n"
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"vLLM generation error: {e}", exc_info=True)
        error_chunk = {
            "id": completion_id,
            "object": "error",
            "error": {
                "message": str(e),
                "type": "generation_error"
            }
        }
        yield f"data: {json.dumps(error_chunk)}\n\n"


async def generate_vllm_non_stream(
    messages: List[ChatMessage],
    temperature: float,
    max_tokens: int,
    model: str,
    top_p: float,
    prepend_crisis: bool = False,
) -> Dict[str, Any]:
    """Generate non-streaming response using vLLM"""
    if not app_state["llm_engine"]:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    from vllm import SamplingParams
    
    # Convert messages to prompt format
    prompt_parts = []
    for msg in messages:
        role = msg.role
        content = msg.content
        if role == "system":
            prompt_parts.append(f"System: {content}")
        elif role == "user":
            prompt_parts.append(f"User: {content}")
        elif role == "assistant":
            prompt_parts.append(f"Assistant: {content}")
    
    prompt = "\n".join(prompt_parts) + "\nAssistant:"
    
    # Create sampling params
    sampling_params = SamplingParams(
        temperature=temperature,
        max_tokens=max_tokens,
        top_p=top_p,
    )
    
    # Generate
    request_id = f"req-{int(time.time())}"
    completion_id = f"chatcmpl-{int(time.time())}"
    
    try:
        outputs = app_state["llm_engine"].generate([prompt], sampling_params, request_id=request_id)
        
        if not outputs or not outputs[0].outputs:
            raise HTTPException(status_code=500, detail="No output generated")
        
        output = outputs[0]
        generated_text = output.outputs[0].text
        if prepend_crisis:
            generated_text = CRISIS_PREPEND + generated_text
        
        # Estimate token counts (rough: ~4 chars per token)
        prompt_tokens = len(prompt) // 4
        completion_tokens = len(generated_text) // 4
        
        return {
            "id": completion_id,
            "object": "chat.completion",
            "created": int(time.time()),
            "model": model or app_state["model_name"],
            "choices": [{
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": generated_text
                },
                "finish_reason": "stop"
            }],
            "usage": {
                "prompt_tokens": prompt_tokens,
                "completion_tokens": completion_tokens,
                "total_tokens": prompt_tokens + completion_tokens
            }
        }
    except Exception as e:
        logger.error(f"vLLM generation error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")


@app.post("/v1/chat/completions")
async def chat_completions(
    request: ChatCompletionRequest,
    _: bool = Depends(verify_api_key)
):
    """OpenAI-compatible chat completions endpoint with SSE streaming support"""
    
    # Check if model is loaded (unless in mock mode)
    if app_state["use_gpu"] and not app_state["model_loaded"]:
        raise HTTPException(
            status_code=503,
            detail="Model not loaded. Service is starting up or model failed to load."
        )
    
    # Use request model or default
    model = request.model or app_state["model_name"] or MODEL_NAME

    crisis_detected = detect_crisis_signals(user_messages_text(request.messages))
    messages = prepare_messages_with_system(request.messages)
    temperature = 0.7 if request.temperature is None else request.temperature
    top_p = 0.9 if request.top_p is None else request.top_p
    max_tokens = request.max_tokens or 1000
    
    # Handle mock mode
    if not app_state["use_gpu"]:
        if request.stream:
            return StreamingResponse(
                generate_mock_response(messages, stream=True, crisis_detected=crisis_detected),
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                }
            )
        else:
            return JSONResponse(generate_mock_response(messages, stream=False, crisis_detected=crisis_detected))
    
    # Handle GPU mode
    try:
        if request.stream:
            # Use a generator function for streaming
            def stream_generator():
                for chunk in generate_vllm_stream(
                    messages,
                    temperature,
                    max_tokens,
                    model,
                    top_p,
                    prepend_crisis=crisis_detected,
                ):
                    yield chunk
            
            return StreamingResponse(
                stream_generator(),
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                }
            )
        else:
            result = await generate_vllm_non_stream(
                messages,
                temperature,
                max_tokens,
                model,
                top_p,
                prepend_crisis=crisis_detected,
            )
            return JSONResponse(result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Chat completion error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "AI Chatbot Service",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "health": "/healthz",
            "version": "/version",
            "chat": "/v1/chat/completions"
        }
    }


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=PORT,
        log_level=os.getenv("LOG_LEVEL", "info").lower(),
    )

