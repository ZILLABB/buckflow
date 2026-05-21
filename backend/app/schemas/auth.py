import uuid
from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    password: str
    business_name: str


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
