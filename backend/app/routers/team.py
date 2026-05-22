from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, EmailStr
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import hash_password
from app.middleware.auth import get_current_user
from app.models.business import Business
from app.models.conversation import Conversation
from app.models.mode_change_log import ModeChangeLog
from app.models.user import User, UserRole

router = APIRouter(prefix="/team", tags=["team"])

# Only OWNER and ADMIN can manage team members
TEAM_MANAGER_ROLES = {UserRole.OWNER, UserRole.ADMIN}


def _require_manager(user: User) -> None:
    """Raise 403 if the user is not allowed to manage team."""
    if user.role not in TEAM_MANAGER_ROLES:
        raise HTTPException(status_code=403, detail="Only owners and admins can manage the team")


# ── List Team Members ─────────────────────────────────────────
@router.get("/members")
async def list_members(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(User)
        .where(User.business_id == user.business_id)
        .order_by(
            # owner first, then admin, then agent, then viewer
            User.role.asc(),
            User.created_at.asc(),
        )
    )
    members = result.scalars().all()

    items = []
    for m in members:
        # Count conversations assigned to this member
        assigned_convos = await db.scalar(
            select(func.count(Conversation.id)).where(
                Conversation.business_id == user.business_id,
                Conversation.assigned_to == m.id,
            )
        ) or 0

        items.append({
            "id": str(m.id),
            "email": m.email,
            "full_name": m.full_name,
            "role": m.role.value,
            "is_active": m.is_active,
            "assigned_conversations": assigned_convos,
            "created_at": m.created_at.isoformat() if m.created_at else None,
            "is_current_user": m.id == user.id,
        })

    return items


# ── Invite Team Member ────────────────────────────────────────
class InviteMemberRequest(BaseModel):
    email: EmailStr
    full_name: str
    role: str = "agent"  # agent, admin, viewer
    password: str  # Temporary password — they can change later


@router.post("/members")
async def invite_member(
    data: InviteMemberRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_manager(user)

    # Validate role — can't create owner or super_admin
    try:
        new_role = UserRole(data.role)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid role")
    if new_role in {UserRole.SUPER_ADMIN, UserRole.OWNER}:
        raise HTTPException(status_code=400, detail="Cannot assign owner or super_admin role")

    # Admin can only create agents and viewers, not other admins
    if user.role == UserRole.ADMIN and new_role == UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only the owner can create admin members")

    # Check if email already exists
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    new_user = User(
        email=data.email,
        full_name=data.full_name,
        hashed_password=hash_password(data.password),
        role=new_role,
        business_id=user.business_id,
    )
    db.add(new_user)
    await db.flush()

    return {
        "id": str(new_user.id),
        "email": new_user.email,
        "full_name": new_user.full_name,
        "role": new_user.role.value,
        "status": "created",
    }


# ── Update Team Member ────────────────────────────────────────
class UpdateMemberRequest(BaseModel):
    role: str | None = None
    is_active: bool | None = None


@router.patch("/members/{member_id}")
async def update_member(
    member_id: str,
    data: UpdateMemberRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_manager(user)

    result = await db.execute(
        select(User).where(User.id == member_id, User.business_id == user.business_id)
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Team member not found")

    # Can't modify the owner
    if member.role == UserRole.OWNER:
        raise HTTPException(status_code=403, detail="Cannot modify the business owner")

    # Can't modify yourself (except deactivating)
    if member.id == user.id and data.role is not None:
        raise HTTPException(status_code=400, detail="Cannot change your own role")

    if data.role is not None:
        try:
            new_role = UserRole(data.role)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid role")
        if new_role in {UserRole.SUPER_ADMIN, UserRole.OWNER}:
            raise HTTPException(status_code=400, detail="Cannot assign owner or super_admin role")
        member.role = new_role

    if data.is_active is not None:
        member.is_active = data.is_active

    await db.flush()
    return {"status": "updated"}


# ── Remove Team Member ────────────────────────────────────────
@router.delete("/members/{member_id}")
async def remove_member(
    member_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_manager(user)

    result = await db.execute(
        select(User).where(User.id == member_id, User.business_id == user.business_id)
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Team member not found")
    if member.role == UserRole.OWNER:
        raise HTTPException(status_code=403, detail="Cannot remove the business owner")
    if member.id == user.id:
        raise HTTPException(status_code=400, detail="Cannot remove yourself")

    # Unassign any conversations
    convos = await db.execute(
        select(Conversation).where(Conversation.assigned_to == member.id)
    )
    for c in convos.scalars().all():
        c.assigned_to = None

    # Deactivate rather than hard-delete (preserves audit trail)
    member.is_active = False
    await db.flush()

    return {"status": "removed"}


# ── Activity Log (recent mode changes, etc.) ──────────────────
@router.get("/activity")
async def team_activity(
    limit: int = Query(20, le=50),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ModeChangeLog)
        .where(ModeChangeLog.conversation_id.in_(
            select(Conversation.id).where(Conversation.business_id == user.business_id)
        ))
        .order_by(ModeChangeLog.created_at.desc())
        .limit(limit)
    )
    logs = result.scalars().all()

    items = []
    for log in logs:
        # Get the user who made the change
        changed_by_name = None
        if log.changed_by:
            changed_by_user = await db.scalar(
                select(User.full_name).where(User.id == log.changed_by)
            )
            changed_by_name = changed_by_user

        items.append({
            "id": str(log.id),
            "conversation_id": str(log.conversation_id),
            "changed_by": str(log.changed_by) if log.changed_by else None,
            "changed_by_name": changed_by_name,
            "from_mode": log.from_mode,
            "to_mode": log.to_mode,
            "reason": log.reason,
            "created_at": log.created_at.isoformat() if log.created_at else None,
        })

    return items
