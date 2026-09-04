from functools import lru_cache
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    app_name: str = "Takeover Deal Hunter"
    environment: str = "development"
    database_url: str = "sqlite:///./data/deal_hunter.db"
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:8000"]
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @field_validator("cors_origins", mode="before")
    @classmethod
    def split_origins(cls, value: object) -> object:
        if isinstance(value, str) and not value.lstrip().startswith("["):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value

    @field_validator("cors_origins")
    @classmethod
    def safe_production_cors(cls, value: list[str], info):
        if "*" in value:
            raise ValueError("Wildcard CORS origins are not permitted")
        return value

@lru_cache
def get_settings() -> Settings:
    return Settings()
