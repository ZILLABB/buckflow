import re
from dataclasses import dataclass

import redis.asyncio as aioredis
import structlog

logger = structlog.get_logger()

# Suspicious URL patterns
SUSPICIOUS_URL_RE = re.compile(
    r"(bit\.ly|tinyurl|goo\.gl|t\.co|is\.gd|shorte\.st|adf\.ly|cutt\.ly)",
    re.IGNORECASE,
)

# Abusive keywords (basic list, can be extended)
ABUSE_KEYWORDS = [
    "scam", "fraud", "hack", "stolen", "illegal",
    "money laundering", "yahoo", "419",
]


@dataclass
class SpamCheckResult:
    is_spam: bool
    reason: str | None = None
    action: str = "allow"  # allow, slow, mute, block


class SpamDetector:
    """
    Basic anti-spam protection.
    Detects: repeated messages, flooding, abusive content, suspicious links.
    Actions: slow down, mute, notify.
    """

    def __init__(self, redis: aioredis.Redis):
        self.redis = redis

    async def check(
        self, business_id: str, customer_wa_id: str, message_text: str
    ) -> SpamCheckResult:
        # 1. Flood detection: >10 messages in 60 seconds
        flood_key = f"spam:flood:{business_id}:{customer_wa_id}"
        count = await self.redis.incr(flood_key)
        if count == 1:
            await self.redis.expire(flood_key, 60)

        if count > 15:
            logger.warning("spam_flood_detected", customer=customer_wa_id, count=count)
            return SpamCheckResult(
                is_spam=True, reason="flooding", action="mute"
            )
        if count > 10:
            return SpamCheckResult(
                is_spam=True, reason="high_frequency", action="slow"
            )

        # 2. Repeated message detection (same message >3 times in 5 minutes)
        import hashlib
        msg_hash = hashlib.md5(message_text.lower().strip().encode()).hexdigest()[:12]
        repeat_key = f"spam:repeat:{business_id}:{customer_wa_id}:{msg_hash}"
        repeat_count = await self.redis.incr(repeat_key)
        if repeat_count == 1:
            await self.redis.expire(repeat_key, 300)

        if repeat_count > 3:
            return SpamCheckResult(
                is_spam=True, reason="repeated_message", action="slow"
            )

        # 3. Suspicious links
        if SUSPICIOUS_URL_RE.search(message_text):
            return SpamCheckResult(
                is_spam=True, reason="suspicious_link", action="slow"
            )

        # 4. Abusive content
        lower = message_text.lower()
        for keyword in ABUSE_KEYWORDS:
            if keyword in lower:
                return SpamCheckResult(
                    is_spam=True, reason=f"abusive_content:{keyword}", action="slow"
                )

        return SpamCheckResult(is_spam=False)

    async def is_muted(self, business_id: str, customer_wa_id: str) -> bool:
        """Check if customer is temporarily muted (auto-mute from spam)."""
        mute_key = f"spam:muted:{business_id}:{customer_wa_id}"
        return bool(await self.redis.exists(mute_key))

    async def mute_customer(
        self, business_id: str, customer_wa_id: str, duration_secs: int = 300
    ) -> None:
        """Temporarily mute a customer (default 5 minutes)."""
        mute_key = f"spam:muted:{business_id}:{customer_wa_id}"
        await self.redis.setex(mute_key, duration_secs, "1")
