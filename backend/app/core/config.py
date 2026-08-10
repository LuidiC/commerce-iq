from functools import lru_cache

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # CORS_ORIGINS is intentionally documented as a comma-separated environment
    # variable; let the validator below normalize it instead of requiring JSON.
    model_config = SettingsConfigDict(
        env_file=".env", extra="ignore", enable_decoding=False
    )

    app_name: str = "CommerceIQ Analytics API"
    app_version: str = "0.1.0"
    app_database_url: str = Field(
        default="postgresql://commerceiq_app:change-me-too@localhost:5432/commerceiq"
    )
    cors_origins: list[str] = ["http://localhost:3000"]
    log_level: str = "INFO"
    db_pool_min_size: int = Field(default=1, ge=1, le=10)
    db_pool_max_size: int = Field(default=5, ge=1, le=20)
    db_statement_timeout_ms: int = Field(default=10_000, ge=1_000, le=60_000)

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_origins(cls, value: object) -> object:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    @field_validator("cors_origins")
    @classmethod
    def reject_open_cors(cls, value: list[str]) -> list[str]:
        if not value:
            raise ValueError("cors_origins must contain at least one explicit origin")
        if "*" in value:
            raise ValueError("cors_origins must not contain a wildcard")
        return value

    @field_validator("db_pool_max_size")
    @classmethod
    def validate_pool_sizes(cls, value: int, info: object) -> int:
        data = getattr(info, "data", {})
        minimum = data.get("db_pool_min_size", 1)
        if value < minimum:
            raise ValueError("db_pool_max_size must be greater than or equal to db_pool_min_size")
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()
