from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.auth import UserCreate, UserLogin, TokenResponse
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse)
async def register(data: UserCreate, db: AsyncSession = Depends(get_db)):
    try:
        service = AuthService(db)
        return await service.register(data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin, db: AsyncSession = Depends(get_db)):
    try:
        service = AuthService(db)
        return await service.login(data)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))
