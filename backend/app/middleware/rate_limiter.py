"""
Rate limiting middleware using slowapi.
Protects auth endpoints, webhooks, and public routes from abuse.
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

# Use client IP as the rate-limit key
limiter = Limiter(key_func=get_remote_address)

# ── Limit presets ─────────────────────────────────────────────
# Auth: strict — prevent brute-force
AUTH_LIMIT = "5/minute"

# Registration: very strict — prevent mass account creation
REGISTER_LIMIT = "3/minute"

# Webhook: generous — WhatsApp sends bursts
WEBHOOK_LIMIT = "120/minute"

# General API: moderate
API_LIMIT = "60/minute"

# Password change: strict
PASSWORD_LIMIT = "3/minute"
