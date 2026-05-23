from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.routers import (
    admin, analytics, appointments, auth, billing,
    business, conversations, orders, team, templates, webhook,
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
app.include_router(admin.router, prefix="/api/v1")


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "buckflow-ai"}
