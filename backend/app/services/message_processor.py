import uuid
from datetime import date, datetime, timezone

import redis.asyncio as aioredis
import structlog
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai_engine.engine import AIEngine
from app.core.redis import get_redis
from app.models.ai_request import AIRequest
from app.models.business import Business
from app.models.conversation import Conversation, ConversationMode
from app.models.customer import Customer
from app.models.message import Message, MessageDirection, MessageType, ResponseSource
from app.models.usage_log import UsageLog
from app.rule_engine.engine import RuleEngine
from app.services.cache_service import CacheService
from app.services.usage_limiter import UsageLimiter
from app.whatsapp.client import WhatsAppClient
from app.whatsapp.normalizer import NormalizedMessage

logger = structlog.get_logger()


class MessageProcessor:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.ai_engine = AIEngine()
        self.redis = get_redis()
        self.cache = CacheService(self.redis)
        self.limiter = UsageLimiter(db, self.redis)

    async def process(self, msg: NormalizedMessage) -> None:
        business = await self._get_business(msg.phone_number_id)
        if not business:
            logger.warning("no_business_for_phone", phone_id=msg.phone_number_id)
            return

        if not await self.limiter.check_rate_limit(business.id):
            logger.warning("rate_limited", business_id=str(business.id))
            return

        usage_status = await self.limiter.check(business.id)
        if not usage_status.allowed:
            logger.warning("usage_blocked", reason=usage_status.reason, business_id=str(business.id))
            return

        customer = await self._get_or_create_customer(
            business.id, msg.from_number, msg.sender_name
        )
        conversation = await self._get_or_create_conversation(business.id, customer.id)
        await self._store_inbound(conversation.id, msg)

        if conversation.mode == ConversationMode.HUMAN:
            logger.info("human_mode_active", conversation_id=str(conversation.id))
            return

        wa_client = WhatsAppClient(
            phone_number_id=business.whatsapp_phone_number_id,
            api_token=business.whatsapp_api_token,
        )

        # Layer 1: Rule engine (free)
        rule_engine = RuleEngine(self.db, business.id)
        rule_match = await rule_engine.process(msg.text)
        if rule_match:
            await self._send_and_store(
                wa_client, conversation.id, msg.from_number,
                rule_match.response, ResponseSource.RULE_ENGINE,
            )
            await self._update_usage(business.id, ResponseSource.RULE_ENGINE, 0)
            return

        # Layer 1.5: Cache check (free)
        cached = await self.cache.get_cached_response(business.id, msg.text)
        if cached:
            await self._send_and_store(
                wa_client, conversation.id, msg.from_number,
                cached, ResponseSource.CACHE,
            )
            await self._update_usage(business.id, ResponseSource.CACHE, 0)
            return

        # Check if AI is allowed
        if not usage_status.ai_allowed:
            fallback = (
                "Thank you for your message! Our team will get back to you shortly. "
                "For quick answers, try asking about our products, prices, or delivery."
            )
            await self._send_and_store(
                wa_client, conversation.id, msg.from_number,
                fallback, ResponseSource.SYSTEM,
            )
            return

        # Layer 2: AI (costs money)
        model = usage_status.model_override or None
        ai_response = await self.ai_engine.generate(
            user_message=msg.text,
            system_prompt=business.ai_system_prompt,
            model=model,
        )

        if ai_response:
            await self._send_and_store(
                wa_client, conversation.id, msg.from_number,
                ai_response.text, ResponseSource.AI_MINI, ai_response.total_tokens,
            )
            await self._log_ai_request(business.id, conversation.id, ai_response)
            await self._update_usage(
                business.id, ResponseSource.AI_MINI, ai_response.total_tokens
            )
            await self.cache.cache_response(business.id, msg.text, ai_response.text)
        else:
            fallback = (
                "I'm sorry, I'm having trouble right now. "
                "A team member will get back to you shortly."
            )
            await self._send_and_store(
                wa_client, conversation.id, msg.from_number,
                fallback, ResponseSource.SYSTEM,
            )

    async def _get_business(self, phone_number_id: str) -> Business | None:
        stmt = select(Business).where(
            Business.whatsapp_phone_number_id == phone_number_id,
            Business.is_active == True,
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def _get_or_create_customer(
        self, business_id: uuid.UUID, wa_id: str, name: str
    ) -> Customer:
        stmt = select(Customer).where(
            Customer.business_id == business_id,
            Customer.wa_id == wa_id,
        )
        result = await self.db.execute(stmt)
        customer = result.scalar_one_or_none()
        if customer:
            return customer

        customer = Customer(
            business_id=business_id,
            wa_id=wa_id,
            phone=wa_id,
            name=name or None,
        )
        self.db.add(customer)
        await self.db.flush()
        return customer

    async def _get_or_create_conversation(
        self, business_id: uuid.UUID, customer_id: uuid.UUID
    ) -> Conversation:
        stmt = select(Conversation).where(
            Conversation.business_id == business_id,
            Conversation.customer_id == customer_id,
            Conversation.is_active == True,
        )
        result = await self.db.execute(stmt)
        conversation = result.scalar_one_or_none()
        if conversation:
            return conversation

        conversation = Conversation(
            business_id=business_id,
            customer_id=customer_id,
        )
        self.db.add(conversation)
        await self.db.flush()
        return conversation

    async def _store_inbound(
        self, conversation_id: uuid.UUID, msg: NormalizedMessage
    ) -> Message:
        message = Message(
            conversation_id=conversation_id,
            wa_message_id=msg.wa_message_id,
            direction=MessageDirection.INBOUND,
            msg_type=MessageType(msg.msg_type) if msg.msg_type in [e.value for e in MessageType] else MessageType.TEXT,
            content=msg.text,
        )
        self.db.add(message)
        await self.db.flush()
        return message

    async def _send_and_store(
        self,
        wa_client: WhatsAppClient,
        conversation_id: uuid.UUID,
        to: str,
        text: str,
        source: ResponseSource,
        tokens: int = 0,
    ) -> None:
        result = await wa_client.send_text(to, text)

        wa_msg_id = None
        if result and "messages" in result:
            wa_msg_id = result["messages"][0].get("id")

        message = Message(
            conversation_id=conversation_id,
            wa_message_id=wa_msg_id,
            direction=MessageDirection.OUTBOUND,
            content=text,
            response_source=source,
            tokens_used=tokens,
        )
        self.db.add(message)

        await self.db.execute(
            update(Conversation)
            .where(Conversation.id == conversation_id)
            .values(last_message_at=datetime.now(timezone.utc))
        )
        await self.db.flush()

    async def _log_ai_request(
        self, business_id, conversation_id, ai_response
    ) -> None:
        log = AIRequest(
            business_id=business_id,
            conversation_id=conversation_id,
            model=ai_response.model,
            prompt_tokens=ai_response.prompt_tokens,
            completion_tokens=ai_response.completion_tokens,
            total_tokens=ai_response.total_tokens,
            cost_usd_cents=int(ai_response.cost_usd * 100),
        )
        self.db.add(log)
        await self.db.flush()

    async def _update_usage(
        self, business_id: uuid.UUID, source: ResponseSource, tokens: int
    ) -> None:
        today = date.today()
        stmt = select(UsageLog).where(
            UsageLog.business_id == business_id,
            UsageLog.log_date == today,
        )
        result = await self.db.execute(stmt)
        usage = result.scalar_one_or_none()

        if not usage:
            usage = UsageLog(business_id=business_id, log_date=today)
            self.db.add(usage)
            await self.db.flush()

        usage.total_messages += 1
        usage.total_tokens += tokens

        if source == ResponseSource.RULE_ENGINE:
            usage.rule_responses += 1
        elif source == ResponseSource.AI_MINI:
            usage.ai_mini_responses += 1
        elif source == ResponseSource.AI_PREMIUM:
            usage.ai_premium_responses += 1
        elif source == ResponseSource.HUMAN:
            usage.human_responses += 1
        elif source == ResponseSource.CACHE:
            usage.cache_hits += 1

        await self.db.flush()
