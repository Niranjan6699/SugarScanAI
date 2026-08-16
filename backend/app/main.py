import asyncio
import sys
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
import httpx
import os

from app.config import settings
from app.routers import users, scans, glucose, chat, dashboard, health, medications, live

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    # Database is managed by Supabase now
    logger.info("✅ Connected to Supabase")

    # Ping Ollama (warn but don't crash if down)
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{settings.OLLAMA_BASE_URL}/api/tags")
            if resp.status_code == 200:
                logger.info("✅ Ollama is running")
            else:
                logger.warning("⚠️  Ollama returned non-200 status")
    except Exception:
        logger.warning("⚠️  Ollama not reachable — AI features will fail until Ollama starts")

    yield
    logger.info("Shutting down SugarScan AI API")


app = FastAPI(
    title="SugarScan AI API",
    version="2.0.0",
    description="Diabetes health app — scan food, track glucose, chat with AI",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all routers
PREFIX = "/api/v1"
app.include_router(users.router, prefix=PREFIX)
app.include_router(scans.router, prefix=PREFIX)
app.include_router(glucose.router, prefix=PREFIX)
app.include_router(chat.router, prefix=PREFIX)
app.include_router(dashboard.router, prefix=PREFIX)
app.include_router(health.router, prefix=PREFIX)
app.include_router(medications.router, prefix=PREFIX)
app.include_router(live.router)

# Mount media directory for serving local images
os.makedirs(settings.MEDIA_DIR, exist_ok=True)
app.mount("/media", StaticFiles(directory=settings.MEDIA_DIR), name="media")


@app.get("/api/v1/health-check")
async def health_check():
    """Quick liveness check."""
    ollama_ok = False
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(f"{settings.OLLAMA_BASE_URL}/api/tags")
            ollama_ok = resp.status_code == 200
    except Exception:
        pass
    return {"status": "ok", "ollama": ollama_ok, "version": "2.0.0"}


# Global exception handlers
@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError):
    return JSONResponse(status_code=400, content={"detail": str(exc)})


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )
