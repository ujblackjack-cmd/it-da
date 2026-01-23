# app/core/config.py

from pydantic_settings import BaseSettings
from pydantic import ConfigDict
from typing import List, Optional


class Settings(BaseSettings):
    """
    애플리케이션 설정
    .env 파일에서 환경 변수를 로드합니다
    """

    # =========================
    # Server
    # =========================
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # =========================
    # CORS
    # =========================
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:8080"

    # =========================
    # External APIs
    # =========================
    SPRING_BOOT_URL: str = "http://localhost:8080"

    # Kakao Map API
    KAKAO_REST_API_KEY: str = "your_key_here"
    KAKAO_LOCAL_API_URL: str = "https://dapi.kakao.com/v2/local"

    # OpenAI GPT API (선택사항)
    OPENAI_API_KEY: Optional[str] = None

    # =========================
    # Model Paths
    # =========================
    SVD_MODEL_PATH: str = "./models/svd_model.pkl"
    LIGHTGBM_RANKER_PATH: str = "./models/lightgbm_ranker.pkl"
    LIGHTGBM_REGRESSOR_PATH: str = "./models/lightgbm_regressor.pkl"
    KCELECTRA_MODEL_NAME: str = "beomi/KcELECTRA-base"

    # =========================
    # Recommendation Policy
    # =========================
    DEFAULT_SEARCH_RADIUS: int = 3000
    MAX_SEARCH_RADIUS: int = 5000

    MIN_RECOMMENDED_RATING: float = 3.5
    MIN_MATCH_SCORE: int = 70
    MIN_RATING: float = 4.0  # .env 호환용

    TOP_N_RECOMMENDATIONS: int = 3

    # =========================
    # Database
    # =========================
    DATABASE_URL: str = "postgresql://user:pass@localhost/db"

    # =========================
    # Pydantic 설정
    # =========================
    model_config = ConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="allow"  # ✅ 추가 필드 허용
    )

    @property
    def get_allowed_origins(self) -> List[str]:
        """CORS 허용 출처 리스트 반환"""
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]


# 싱글톤 인스턴스
settings = Settings()