"""
Query Builder
Spring Boot 검색 API용 payload 생성
"""

from typing import Optional
from app.core.logging import logger
from app.core.keyword_utils import clean_keywords  # ✅ 임포트 추가


class QueryBuilder:
    """Spring Boot 검색 요청 payload 생성"""

    def __init__(self, normalizer):
        """
        Args:
            normalizer: QueryNormalizer 인스턴스
        """
        self.normalizer = normalizer

    def build_search_request(
            self,
            enriched_query: dict,
            user_ctx: dict,
            user_prompt: str = ""
    ) -> dict:
        """
        Spring Boot /api/meetings/search 요청 payload 생성

        Args:
            enriched_query: 보강된 쿼리
            user_ctx: 유저 컨텍스트
            user_prompt: 원본 프롬프트 (근처 의도 파악용)

        Returns:
            Spring Boot API 요청 payload
        """
        raw_keywords = enriched_query.get("keywords") or []

        # 1) 키워드 정제
        keywords = clean_keywords(raw_keywords)

        # 2) category와 중복 제거
        category = enriched_query.get("category")
        if category:
            keywords = [k for k in keywords
                        if str(k).strip().lower() != str(category).strip().lower()]

        logger.info("[PAYLOAD_KEYWORDS] raw=%s -> cleaned=%s", raw_keywords, keywords)

        # 3) 유저 좌표
        lat = user_ctx.get("lat") or user_ctx.get("latitude")
        lng = user_ctx.get("lng") or user_ctx.get("longitude")

        # 4) locationQuery
        location_query = enriched_query.get("location_query") or enriched_query.get("locationQuery")

        # 5) "근처/주변/집" 의도 감지
        near_me = self._is_near_me_phrase(location_query) or self._is_near_me_phrase(user_prompt)

        # 6) timeSlot (유저 선호 섞지 않기!)
        conf = float(enriched_query.get("confidence", 0) or 0)
        gpt_ts = enriched_query.get("time_slot")
        explicit_ts = self._has_explicit_timeslot(user_prompt)
        time_slot = self.normalizer.normalize_timeslot(gpt_ts) if (gpt_ts and (conf >= 0.6 or explicit_ts)) else None

        # 7) locationType
        gpt_location_type = enriched_query.get("location_type")
        location_type = self.normalizer.normalize_location_type(gpt_location_type) if gpt_location_type else None

        # ✅ 8) vibe 추가
        vibe = self.normalizer.normalize_vibe(enriched_query.get("vibe"))

        # 9) payload 구성
        payload = {
            "category": enriched_query.get("category"),
            "subcategory": enriched_query.get("subcategory"),
            "timeSlot": time_slot,
            "locationType": location_type,
            "vibe": vibe,  # ✅ vibe 추가
            "keywords": keywords if keywords else None,
            "userLocation": {
                "latitude": lat,
                "longitude": lng
            },
            "locationQuery": location_query,
            "maxCost": enriched_query.get("maxCost") or enriched_query.get("max_cost"),
        }

        logger.info(f"[PAYLOAD_DEBUG] category={payload.get('category')} subcategory={payload.get('subcategory')} vibe={payload.get('vibe')}")

        # 10) radius는 근처 의도일 때만
        if near_me:
            payload["radius"] = float(enriched_query.get("radius") or 10.0)

        # 로그
        logger.info(
            f"[PAYLOAD] near_me={near_me} locationType={location_type} vibe={vibe} "
            f"userLocation={payload.get('userLocation')} "
            f"radius={payload.get('radius', None)} timeSlot={payload.get('timeSlot')}"
        )

        # 11) null/""/[] 제거
        return self._clean_payload(payload)

    def _is_near_me_phrase(self, q: str | None) -> bool:
        """근처/주변/집 의도 감지"""
        if not q:
            return False
        s = str(q).strip().lower()
        return ("근처" in s) or ("주변" in s) or ("집" in s) or ("내 근처" in s)

    def _has_explicit_timeslot(self, text: str) -> bool:
        """명시적 시간대 표현 감지"""
        t = (text or "").lower()
        return any(k in t for k in [
            "아침", "오전", "점심", "오후", "저녁", "밤", "야간",
            "morning", "afternoon", "evening", "night"
        ])

    def _clean_payload(self, payload: dict) -> dict:
        """null/""/[] 값 제거"""

        def clean(o):
            if isinstance(o, dict):
                return {k: clean(v) for k, v in o.items()
                        if v is not None and v != "" and v != []}
            return o

        return clean(payload)