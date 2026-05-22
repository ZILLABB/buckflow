from fastapi import Depends, HTTPException, status

from app.middleware.auth import get_current_user
from app.models.user import User, UserRole


async def get_super_admin(
    user: User = Depends(get_current_user),
) -> User:
    if user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super admin access required",
        )
    return user
