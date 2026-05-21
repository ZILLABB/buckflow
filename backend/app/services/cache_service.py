import hashlib
import json
import uuid

import structlog
import redis.asyncio as redis

logger = structlog.get_logger()

CACHE_TTL = 3600  # 1 hour
CACHE_PREFIX = "bf:resp:"


class CacheService:
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client

    async def get_cached_response(
        self, business_id: uuid.UUID, message_text: str
    ) -> str | None:
        key = self._make_key(business_id, message_text)
        try:
            cached = await self.redis.get(key)
            if cached:
                logger.info("cache_hit", business_id=str(business_id))
                return cached
        except Exception as e:
            logger.warning("cache_read_error", error=str(e))
        return None

    async def cache_response(
        self, business_id: uuid.UUID, message_text: str, response: str
    ) -> None:
        key = self._make_key(business_id, message_text)
        try:
            await self.redis.setex(key, CACHE_TTL, response)
        except Exception as e:
            logger.warning("cache_write_error", error=str(e))

    async def invalidate_business_cache(self, business_id: uuid.UUID) -> None:
        pattern = f"{CACHE_PREFIX}{business_id}:*"
        try:
            cursor = 0
            while True:
                cursor, keys = await self.redis.scan(cursor, match=pattern, count=100)
                if keys:
                    await self.redis.delete(*keys)
                if cursor == 0:
                    break
        except Exception as e:
            logger.warning("cache_invalidate_error", error=str(e))

    def _make_key(self, business_id: uuid.UUID, text: str) -> str:
        normalized = text.strip().lower()
        text_hash = hashlib.md5(normalized.encode()).hexdigest()
        return f"{CACHE_PREFIX}{business_id}:{text_hash}"
