"""
Seed script for BuckFlow AI — creates plans + super admin user.

Usage:
    python -m app.seed

Idempotent: skips rows that already exist.
"""

import asyncio
import sys

from sqlalchemy import select, text

from app.core.database import engine, async_session, Base
from app.core.security import hash_password
from app.models import (
    Plan, User, Business,
)
from app.models.subscription import PlanTier
from app.models.user import UserRole


PLANS = [
    {
        "name": "Basic",
        "tier": PlanTier.BASIC,
        "price_naira": 0,
        "conversation_limit": 50,
        "ai_messages_limit": 100,
        "ai_model": "gpt-4o-mini",
        "rag_enabled": False,
    },
    {
        "name": "Growth",
        "tier": PlanTier.GROWTH,
        "price_naira": 15000,
        "conversation_limit": 500,
        "ai_messages_limit": 2000,
        "ai_model": "gpt-4o-mini",
        "rag_enabled": True,
    },
    {
        "name": "Pro",
        "tier": PlanTier.PRO,
        "price_naira": 45000,
        "conversation_limit": 5000,
        "ai_messages_limit": 10000,
        "ai_model": "gpt-4o",
        "rag_enabled": True,
    },
]

SUPER_ADMIN = {
    "email": "admin@buckflow.ai",
    "full_name": "BuckFlow Super Admin",
    "password": "admin123",  # Change in production!
}


async def create_tables():
    """Create all tables (safe to call multiple times)."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("[OK] Database tables created / verified")


async def seed_plans():
    """Insert plans if they don't exist."""
    async with async_session() as session:
        for plan_data in PLANS:
            existing = await session.execute(
                select(Plan).where(Plan.tier == plan_data["tier"])
            )
            if existing.scalar_one_or_none():
                print(f"[SKIP] Plan '{plan_data['name']}' already exists")
                continue

            plan = Plan(**plan_data)
            session.add(plan)
            print(f"[OK] Created plan: {plan_data['name']} — ₦{plan_data['price_naira']:,}/mo")

        await session.commit()


async def seed_super_admin():
    """Create the super admin user if one doesn't exist."""
    async with async_session() as session:
        existing = await session.execute(
            select(User).where(User.role == UserRole.SUPER_ADMIN)
        )
        if existing.scalar_one_or_none():
            print("[SKIP] Super admin already exists")
            return

        admin = User(
            email=SUPER_ADMIN["email"],
            full_name=SUPER_ADMIN["full_name"],
            hashed_password=hash_password(SUPER_ADMIN["password"]),
            role=UserRole.SUPER_ADMIN,
            business_id=None,
        )
        session.add(admin)
        await session.commit()
        print(f"[OK] Created super admin: {SUPER_ADMIN['email']} (password: {SUPER_ADMIN['password']})")


async def main():
    print("=" * 50)
    print("  BuckFlow AI — Database Seed")
    print("=" * 50)
    print()

    await create_tables()
    print()
    await seed_plans()
    print()
    await seed_super_admin()

    print()
    print("=" * 50)
    print("  Seeding complete!")
    print("=" * 50)

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
