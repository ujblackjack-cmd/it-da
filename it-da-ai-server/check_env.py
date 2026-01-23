# check_env.py (루트 디렉토리)

from app.core.config import settings
from app.core.logging import logger


def check_environment():
    """환경 변수 설정 확인"""

    logger.info("=" * 60)
    logger.info("🔍 환경 변수 설정 확인")
    logger.info("=" * 60)

    # 필수 항목
    required_settings = {
        "KAKAO_REST_API_KEY": settings.KAKAO_REST_API_KEY,
        "SPRING_BOOT_URL": settings.SPRING_BOOT_URL,
    }

    # 선택 항목
    optional_settings = {
        "OPENAI_API_KEY": settings.OPENAI_API_KEY,
    }

    # 필수 항목 체크
    all_ok = True
    for key, value in required_settings.items():
        if value and value != "your_key_here":
            logger.info(f"✅ {key}: 설정됨")
        else:
            logger.error(f"❌ {key}: 설정 필요!")
            all_ok = False

    # 선택 항목 체크
    for key, value in optional_settings.items():
        if value:
            logger.info(f"✅ {key}: 설정됨 (GPT 활성화)")
        else:
            logger.warning(f"⚠️ {key}: 미설정 (규칙 기반 키워드 사용)")

    logger.info("=" * 60)

    if all_ok:
        logger.info("🎉 모든 필수 설정이 완료되었습니다!")
    else:
        logger.error("⚠️ 일부 필수 설정이 누락되었습니다. .env 파일을 확인하세요.")

    return all_ok


if __name__ == "__main__":
    check_environment()