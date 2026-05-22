import re

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token, hash_password, verify_password
from app.models.business import Business, BusinessType, BusinessCategory
from app.models.user import User, UserRole
from app.schemas.auth import UserCreate, UserLogin, TokenResponse, UserResponse


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def register(self, data: UserCreate) -> TokenResponse:
        existing = await self.db.execute(
            select(User).where(User.email == data.email)
        )
        if existing.scalar_one_or_none():
            raise ValueError("Email already registered")

        slug = re.sub(r"[^a-z0-9]+", "-", data.business_name.lower()).strip("-")
        existing_slug = await self.db.execute(
            select(Business).where(Business.slug == slug)
        )
        if existing_slug.scalar_one_or_none():
            slug = f"{slug}-{hash(data.email)%10000}"

        # Resolve business type and category
        try:
            biz_type = BusinessType(data.business_type)
        except ValueError:
            biz_type = BusinessType.PRODUCT
        try:
            biz_category = BusinessCategory(data.category)
        except ValueError:
            biz_category = BusinessCategory.OTHER

        business = Business(
            name=data.business_name,
            slug=slug,
            email=data.email,
            business_type=biz_type,
            category=biz_category,
            booking_enabled=(biz_type in (BusinessType.SERVICE, BusinessType.HYBRID)),
        )
        self.db.add(business)
        await self.db.flush()

        user = User(
            email=data.email,
            full_name=data.full_name,
            hashed_password=hash_password(data.password),
            role=UserRole.OWNER,
            business_id=business.id,
        )
        self.db.add(user)
        await self.db.flush()

        token = create_access_token({"sub": str(user.id), "biz": str(business.id)})
        return TokenResponse(
            access_token=token,
            user=UserResponse.model_validate(user),
        )

    async def login(self, data: UserLogin) -> TokenResponse:
        result = await self.db.execute(
            select(User).where(User.email == data.email)
        )
        user = result.scalar_one_or_none()
        if not user or not verify_password(data.password, user.hashed_password):
            raise ValueError("Invalid credentials")

        token = create_access_token(
            {"sub": str(user.id), "biz": str(user.business_id)}
        )
        return TokenResponse(
            access_token=token,
            user=UserResponse.model_validate(user),
        )
