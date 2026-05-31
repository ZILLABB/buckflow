import re
import uuid
from pydantic import BaseModel, EmailStr, field_validator


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    password: str
    business_name: str
    business_type: str = "product"  # product, service, hybrid
    category: str = "other"

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2:
            raise ValueError("Name must be at least 2 characters")
        if len(v) > 100:
            raise ValueError("Name must be at most 100 characters")
        return v

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v

    @field_validator("business_name")
    @classmethod
    def validate_business_name(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2:
            raise ValueError("Business name must be at least 2 characters")
        if len(v) > 100:
            raise ValueError("Business name must be at most 100 characters")
        # Prevent script injection in business names
        if re.search(r'[<>{}]', v):
            raise ValueError("Business name contains invalid characters")
        return v

    @field_validator("business_type")
    @classmethod
    def validate_business_type(cls, v: str) -> str:
        allowed = {"product", "service", "hybrid"}
        if v not in allowed:
            raise ValueError(f"Business type must be one of: {', '.join(allowed)}")
        return v

    @field_validator("category")
    @classmethod
    def validate_category(cls, v: str) -> str:
        allowed = {
            "fashion", "food", "electronics", "health_beauty",
            "home_living", "education", "automotive", "agriculture",
            "real_estate", "logistics", "consulting", "other",
        }
        if v not in allowed:
            raise ValueError(f"Category must be one of: {', '.join(sorted(allowed))}")
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str
    role: str
    business_id: uuid.UUID | None

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
