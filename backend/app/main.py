from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.core.config import get_settings
from app.middleware.rate_limiter import limiter
from app.routers import (
    admin, analytics, appointments, auth, billing,
    business, conversations, media, orders, team, templates, webhook,
)

settings = get_settings()
logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("buckflow_starting", environment=settings.environment)
    yield
    logger.info("buckflow_shutting_down")


app = FastAPI(
    title="BuckFlow AI",
    description="AI-powered WhatsApp Sales & Support for Nigerian Businesses",
    version="0.1.0",
    lifespan=lifespan,
)

# ── Rate limiter ──
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── CORS ──
cors_origins = (
    ["*"]
    if settings.environment == "development"
    else [
        "https://app.buckflow.ai",
        "https://admin.buckflow.ai",
        "https://buckflow-frontend.netlify.app",
        "https://buckflow-admin.netlify.app",
    ]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Trusted Host (production only) ──
if settings.environment != "development":
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=[
            "*.buckflow.ai",
            "*.railway.app",
            "*.onrender.com",
            "*.fly.dev",
            "localhost",
        ],
    )


# ── Global exception handler ──
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(
        "unhandled_exception",
        path=request.url.path,
        method=request.method,
        error=str(exc),
        error_type=type(exc).__name__,
    )
    return JSONResponse(
        status_code=500,
        content={
            "detail": "An internal error occurred. Please try again later.",
        },
    )


# ── Request logging middleware ──
@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info(
        "request_started",
        method=request.method,
        path=request.url.path,
        client=request.client.host if request.client else "unknown",
    )
    response = await call_next(request)
    logger.info(
        "request_completed",
        method=request.method,
        path=request.url.path,
        status=response.status_code,
    )
    return response


# ── Routers ──
app.include_router(webhook.router, prefix="/api/v1")
app.include_router(auth.router, prefix="/api/v1")
app.include_router(business.router, prefix="/api/v1")
app.include_router(orders.router, prefix="/api/v1")
app.include_router(conversations.router, prefix="/api/v1")
app.include_router(analytics.router, prefix="/api/v1")
app.include_router(appointments.router, prefix="/api/v1")
app.include_router(billing.router, prefix="/api/v1")
app.include_router(team.router, prefix="/api/v1")
app.include_router(templates.router, prefix="/api/v1")
app.include_router(media.router, prefix="/api/v1")
app.include_router(admin.router, prefix="/api/v1")


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "buckflow-ai"}
