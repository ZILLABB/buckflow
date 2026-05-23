import re
import uuid
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.rule_response import RuleResponse

BUILTIN_GREETINGS = {
    "hi", "hello", "hey", "good morning", "good afternoon", "good evening",
    "how far", "e kaaro", "bawo ni", "how you dey", "wetin dey", "oga",
    "abeg", "please", "hiya", "sup", "what's up", "gm", "good day",
}


@dataclass
class RuleMatch:
    response: str
    category: str
    rule_id: uuid.UUID | None = None


class RuleEngine:
    def __init__(self, db: AsyncSession, business_id: uuid.UUID):
        self.db = db
        self.business_id = business_id
        self._rules: list[RuleResponse] | None = None

    async def process(self, text: str) -> RuleMatch | None:
        normalized = text.strip().lower()
        normalized = re.sub(r"[^\w\s]", "", normalized)

        # Check business-defined rules first (owner can create a custom greeting rule)
        rule_match = await self._check_business_rules(normalized)
        if rule_match:
            return rule_match

        # No built-in greeting anymore — let the context-aware AI handle
        # greetings with the business name and personality.
        # Business owners who want instant greeting responses can add a
        # rule with keywords like "hello,hi,hey" in their Settings.
        return None

    async def _check_business_rules(self, text: str) -> RuleMatch | None:
        rules = await self._load_rules()
        for rule in rules:
            if not rule.is_active:
                continue
            for keyword in rule.keywords:
                if keyword.lower() in text:
                    return RuleMatch(
                        response=rule.response_text,
                        category=rule.category,
                        rule_id=rule.id,
                    )
        return None

    async def _load_rules(self) -> list[RuleResponse]:
        if self._rules is not None:
            return self._rules
        stmt = (
            select(RuleResponse)
            .where(
                RuleResponse.business_id == self.business_id,
                RuleResponse.is_active == True,
            )
            .order_by(RuleResponse.priority.desc())
        )
        result = await self.db.execute(stmt)
        self._rules = list(result.scalars().all())
        return self._rules
