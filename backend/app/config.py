import os
from functools import lru_cache

from dotenv import load_dotenv
from pydantic import BaseModel


load_dotenv()


class Settings(BaseModel):
    app_name: str = "CitationX API"
    environment: str = "development"
    port: int = 8000
    allowed_origins: list[str] = ["http://localhost:3000"]
    gemini_api_key: str | None = None

    @classmethod
    def from_env(cls) -> "Settings":
        raw_origins = os.getenv("ALLOWED_ORIGINS", "")
        origins = (
            [origin.strip() for origin in raw_origins.split(",") if origin.strip()]
            if raw_origins
            else ["http://localhost:3000"]
        )
        return cls(
            environment=os.getenv("APP_ENV", "development"),
            port=int(os.getenv("PORT", "8000")),
            allowed_origins=origins,
            gemini_api_key=os.getenv("GEMINI_API_KEY"),
        )


@lru_cache
def get_settings() -> Settings:
    return Settings.from_env()
