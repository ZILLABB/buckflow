import uuid
from dataclasses import dataclass

import openai
import structlog

from app.core.config import get_settings

logger = structlog.get_logger()
settings = get_settings()

COST_PER_1K_TOKENS = {
    "gpt-4o-mini": {"input": 0.00015, "output": 0.0006},
    "gpt-4o": {"input": 0.005, "output": 0.015},
}


@dataclass
class AIResponse:
    text: str
    model: str
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    cost_usd: float


class AIEngine:
    def __init__(self):
        self.client = openai.AsyncOpenAI(api_key=settings.openai_api_key)

    async def generate(
        self,
        user_message: str,
        system_prompt: str | None = None,
        conversation_history: list[dict] | None = None,
        model: str | None = None,
    ) -> AIResponse | None:
        model = model or settings.ai_default_model

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        else:
            messages.append({
                "role": "system",
                "content": (
                    "You are a helpful business assistant on WhatsApp for a Nigerian business. "
                    "Be friendly, concise, and professional. Use simple English. "
                    "If you don't know something, say so honestly. "
                    "Never invent prices, product details, or policies. "
                    "Keep responses under 200 words."
                ),
            })

        if conversation_history:
            messages.extend(conversation_history[-6:])

        messages.append({"role": "user", "content": user_message})

        try:
            response = await self.client.chat.completions.create(
                model=model,
                messages=messages,
                max_tokens=settings.ai_max_tokens,
                temperature=settings.ai_temperature,
            )

            usage = response.usage
            cost = self._calculate_cost(
                model, usage.prompt_tokens, usage.completion_tokens
            )

            return AIResponse(
                text=response.choices[0].message.content.strip(),
                model=model,
                prompt_tokens=usage.prompt_tokens,
                completion_tokens=usage.completion_tokens,
                total_tokens=usage.total_tokens,
                cost_usd=cost,
            )
        except openai.RateLimitError:
            logger.error("openai_rate_limit")
            return AIResponse(
                text="I'm a bit busy right now. Please try again in a moment.",
                model=model,
                prompt_tokens=0,
                completion_tokens=0,
                total_tokens=0,
                cost_usd=0,
            )
        except Exception as e:
            logger.error("ai_engine_error", error=str(e))
            return None

    def _calculate_cost(
        self, model: str, prompt_tokens: int, completion_tokens: int
    ) -> float:
        rates = COST_PER_1K_TOKENS.get(model, COST_PER_1K_TOKENS["gpt-4o-mini"])
        input_cost = (prompt_tokens / 1000) * rates["input"]
        output_cost = (completion_tokens / 1000) * rates["output"]
        return round(input_cost + output_cost, 6)
