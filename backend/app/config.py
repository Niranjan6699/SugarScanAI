from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
import json


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


    # JWT
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Ollama AI
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_VISION_MODEL: str = "moondream"
    OLLAMA_LLM_MODEL: str = "phi3:mini"
    OLLAMA_CHAT_MODEL: str = "phi3:mini"
    OLLAMA_MINI_MODEL: str = "qwen2.5:0.5b"

    # Supabase (service-role key — backend only, never expose to client)
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_KEY: str = ""

    # Media / File Storage
    MEDIA_DIR: str = "./media/uploads"
    MAX_IMAGE_SIZE_MB: int = 10

    # CORS
    ALLOWED_ORIGINS: str = '["http://localhost:8081","exp://192.168.1.100:8081"]'

    @property
    def allowed_origins_list(self) -> List[str]:
        try:
            return json.loads(self.ALLOWED_ORIGINS)
        except Exception as e:
            raise ValueError(f"Failed to parse ALLOWED_ORIGINS: {e}")

    @property
    def media_dir_path(self) -> Path:
        p = Path(self.MEDIA_DIR)
        p.mkdir(parents=True, exist_ok=True)
        return p

    @property
    def max_image_bytes(self) -> int:
        return self.MAX_IMAGE_SIZE_MB * 1024 * 1024


settings = Settings()
