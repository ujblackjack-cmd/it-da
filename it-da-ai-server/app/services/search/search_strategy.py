"""
Search Strategy
Confidence 기반 relaxation plan 생성
"""

from typing import List, Tuple
from app.core.logging import logger


class SearchStrategy:
    """검색 완화 전략"""

    def get_relaxation_plan(
            self,
            base_query: dict,
            user_prompt: str
    ) -> List[Tuple[str, Tuple[str, ...]]]:
        """
        Confidence와 명시성 기반 relaxation plan 생성

        Args:
            base_query: 기본 쿼리
            user_prompt: 유저 입력 원문

        Returns:
            [(label, keys_to_drop), ...] 형태의 plan
        """
        conf = float(base_query.get("confidence", 0) or 0)
        explicit_loc = self._has_explicit_location(user_prompt, base_query)

        logger.info(f"[STRATEGY] conf={conf:.2f}, explicit_loc={explicit_loc}")

        # High confidence (>= 0.90)
        if conf >= 0.90:
            if explicit_loc:
                return [
                    ("L1 vibe 제거", ("vibe",)),
                    ("L2 timeSlot 제거", ("time_slot", "timeSlot")),
                    ("L3 subcategory 제거", ("subcategory",)),
                    ("L4 keywords 제거", ("keywords",)),
                    ("L5 locationQuery 제거", ("location_query", "locationQuery")),
                    ("L6 category 제거", ("category",)),
                ]
            else:
                return [
                    ("L1 locationQuery 제거", ("location_query", "locationQuery")),
                    ("L2 vibe 제거", ("vibe",)),
                    ("L3 timeSlot 제거", ("time_slot", "timeSlot")),
                    ("L4 subcategory 제거", ("subcategory",)),
                    ("L5 keywords 제거", ("keywords",)),
                    ("L6 category 제거", ("category",)),
                ]

        # Medium confidence (0.75 ~ 0.89)
        elif conf >= 0.75:
            if explicit_loc:
                return [
                    ("L1 subcategory 제거", ("subcategory",)),
                    ("L2 keywords 제거", ("keywords", "keyword")),
                    ("L3 locationQuery 제거", ("location_query", "locationQuery")),
                    ("L4 category 제거", ("category",)),
                ]
            else:
                return [
                    ("L1 locationQuery 제거", ("location_query", "locationQuery")),
                    ("L2 subcategory 제거", ("subcategory",)),
                    ("L3 keywords 제거", ("keywords", "keyword")),
                    ("L4 category 제거", ("category",)),
                ]

        # Low confidence (< 0.75)
        else:
            if explicit_loc:
                return [
                    ("L1 keywords 제거", ("keywords", "keyword")),
                    ("L2 subcategory 제거", ("subcategory",)),
                    ("L3 locationQuery 제거", ("location_query", "locationQuery")),
                    ("L4 category 제거", ("category",)),
                ]
            else:
                return [
                    ("L1 locationQuery 제거", ("location_query", "locationQuery")),
                    ("L2 keywords 제거", ("keywords", "keyword")),
                    ("L3 subcategory 제거", ("subcategory",)),
                    ("L4 category 제거", ("category",)),
                ]

    # app/services/search/strategy.py

    def pre_relax_query_by_conf(self, query: dict) -> dict:
        """Confidence 기반 전처리"""

        conf = float(query.get("confidence", 0) or 0)
        cat = query.get("category")
        vibe = query.get("vibe")
        emotion_only = query.get("emotion_only_search", False)

        # ✅ 감정 전용 검색이면 category 강제 제거
        if emotion_only or (not cat and vibe):
            logger.info(
                f"[STRATEGY] 감정 전용 검색 모드: "
                f"vibe='{vibe}', category 제거, 전체 카테고리 검색"
            )

            return {
                **query,
                "category": None,  # ✅ 명시적으로 None
                "subcategory": None,
                "search_mode": "vibe_only",
            }

        # confidence 낮으면 조건 완화
        if conf < 0.6:
            relaxed = query.copy()
            relaxed.pop("subcategory", None)

            if conf < 0.5:
                relaxed.pop("category", None)

            logger.info(f"[STRATEGY] Low conf={conf:.2f} → 조건 완화")
            return relaxed

        return query

    def _has_explicit_location(self, user_prompt: str, q: dict | None = None) -> bool:
        """명시적 지명 표현 감지"""
        import re

        text = (user_prompt or "").strip()
        if not text:
            return False

        # 1) near-me 표현은 explicit_loc로 치지 않음
        if self._is_near_me_phrase(text):
            return False

        # 2) GPT가 location_query를 뽑아줬고, 그 값이 near-me가 아니면 거의 명시 지명
        if q:
            lq = q.get("location_query") or q.get("locationQuery")
            if lq and not self._is_near_me_phrase(str(lq)):
                return True

        # 3) 역/동/구 등 지명 접미사 패턴
        patterns = [
            r"[가-힣]{1,10}역",
            r"[가-힣]{1,10}동",
            r"[가-힣]{1,10}구",
            r"[가-힣]{1,10}(로|길)",
        ]
        return any(re.search(p, text) for p in patterns)

    def _is_near_me_phrase(self, q: str | None) -> bool:
        """근처/주변/집 의도 감지"""
        if not q:
            return False
        s = str(q).strip().lower()
        return ("근처" in s) or ("주변" in s) or ("집" in s) or ("내 근처" in s)