from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    app_name: str = "BuckFlow AI"
    environment: str = "development"
    debug: bool = False

    database_url: str
    sync_database_url: str = ""

    @property
    def async_database_url(self) -> str:
        """Convert standard postgresql:// URL to asyncpg driver URL."""
        url = self.database_url
        if url.startswith("postgresql://"):
            return url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return url

    @property
    def sync_db_url(self) -> str:
        """Return sync database URL for Alembic migrations."""
        if self.sync_database_url:
            return self.sync_database_url
        # Strip asyncpg driver to get sync URL
        url = self.database_url
        if "+asyncpg" in url:
            return url.replace("+asyncpg", "")
        return url

    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440

    whatsapp_verify_token: str
    whatsapp_api_token: str
    whatsapp_phone_number_id: str
    whatsapp_api_url: str = "https://graph.facebook.com/v21.0"

    openai_api_key: str = ""

    redis_url: str = "redis://localhost:6379/0"

    paystack_secret_key: str = ""
    paystack_public_key: str = ""

    ai_default_model: str = "gpt-4o-mini"
    ai_premium_model: str = "gpt-4o"
    ai_max_tokens: int = 500
    ai_temperature: float = 0.7

    model_config = {"env_file": ".env", "extra": "ignore"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
