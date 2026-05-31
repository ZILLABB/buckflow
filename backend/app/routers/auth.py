import structlog
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, field_validator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import hash_password, verify_password
from app.middleware.auth import get_current_user
from app.middleware.rate_limiter import (
    limiter, AUTH_LIMIT, REGISTER_LIMIT, PASSWORD_LIMIT,
)
from app.models.user import User
from app.schemas.auth import UserCreate, UserLogin, TokenResponse
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])
logger = structlog.get_logger()


@router.post("/register", response_model=TokenResponse)
@limiter.limit(REGISTER_LIMIT)
async def register(
    request: Request,
    data: UserCreate,
    db: AsyncSession = Depends(get_db),
):
    try:
        service = AuthService(db)
        result = await service.register(data)
        logger.info("user_registered", email=data.email)
        return result
    except ValueError as e:
        logger.warning("registration_failed", email=data.email, reason=str(e))
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/login", response_model=TokenResponse)
@limiter.limit(AUTH_LIMIT)
async def login(
    request: Request,
    data: UserLogin,
    db: AsyncSession = Depends(get_db),
):
    try:
        service = AuthService(db)
        result = await service.login(data)
        logger.info("user_logged_in", email=data.email)
        return result
    except ValueError as e:
        logger.warning("login_failed", email=data.email, reason=str(e))
        raise HTTPException(status_code=401, detail=str(e))


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v


@router.post("/change-password")
@limiter.limit(PASSWORD_LIMIT)
async def change_password(
    request: Request,
    data: ChangePasswordRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not verify_password(data.current_password, user.hashed_password):
        logger.warning("password_change_failed", user_id=str(user.id))
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    user.hashed_password = hash_password(data.new_password)
    await db.flush()
    logger.info("password_changed", user_id=str(user.id))
    return {"status": "password_changed"}
