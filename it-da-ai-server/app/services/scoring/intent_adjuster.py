"""
Intent Adjuster
Intent 기반 점수 보정
"""

from typing import Optional
from app.core.logging import logger


class IntentAdjuster:
    """Intent 기반 점수 보정"""

    def __init__(self, normalizer):
        """
        Args:
            normalizer: QueryNormalizer 인스턴스
        """
        self.normalizer = normalizer

    def adjust(
            self,
            intent: str,
            meeting: dict,
            parsed_query: Optional[dict] = None
    ) -> float:
        """
        Intent 기반 점수 보정

        Args:
            intent: 감지된 의도
            meeting: 모임 정보
            parsed_query: 파싱된 쿼리 (location_type 체크용)

        Returns:
            보정 점수 (양수/음수)
        """
        cat = meeting.get("category") or ""
        sub = meeting.get("subcategory") or ""

        adjustment = 0.0

        # ✅ 최우선: VIBE 매칭 체크
        if parsed_query:
            requested_vibe = self.normalizer.normalize_vibe(parsed_query.get("vibe"))
            meeting_vibe = self.normalizer.normalize_vibe(meeting.get("vibe"))

            if requested_vibe and meeting_vibe:
                # 완전 일치 → 큰 보너스
                if requested_vibe == meeting_vibe:
                    adjustment += 18.0
                    logger.info(f"[VIBE_MATCH] 완전일치 {requested_vibe} → +18점")
                else:
                    # 🔥 Vibe 계열 정의
                    vibe_groups = {
                        "healing": {"힐링", "여유로운", "차분한", "조용한", "편안한", "잔잔한"},
                        "fun": {"즐거운", "신나는", "재밌는", "흥미로운", "재미있는"},
                        "active": {"격렬한", "활기찬", "에너지 넘치는", "신나는"}  # 신나는 중복 OK
                    }

                    # 같은 그룹인지 체크
                    def find_group(vibe):
                        for group_name, vibes in vibe_groups.items():
                            if vibe in vibes:
                                return group_name
                        return None

                    req_group = find_group(requested_vibe)
                    meet_group = find_group(meeting_vibe)

                    if req_group and meet_group and req_group == meet_group:
                        adjustment += 10.0
                        logger.info(f"[VIBE_SIMILAR] {req_group}계열 유사 ({requested_vibe}/{meeting_vibe}) → +10점")
                    else:
                        adjustment -= 30.0
                        logger.info(f"[VIBE_MISMATCH] 요청={requested_vibe}, 모임={meeting_vibe} → -30점")

        # NEUTRAL은 가산/감산 없이 location_type만 체크
        if not intent or intent == "NEUTRAL":
            # location_type 약한 반영
            if parsed_query:
                requested_type = parsed_query.get("location_type")
                meeting_type = meeting.get("meeting_location_type") or meeting.get("location_type")
                if requested_type and meeting_type:
                    if requested_type.upper() == meeting_type.upper():
                        adjustment += 3.0
                    else:
                        adjustment -= 3.0

            return adjustment

        # ✅ QUIET intent (힐링/여유/조용)
        if intent == "QUIET":
            # 시끄러운 subcategory → 매우 큰 패널티
            noisy_subs = ["볼링", "당구", "방탈출", "노래방", "클럽", "술집", "와인바", "탁구"]
            if sub in noisy_subs:
                adjustment -= 45.0  # ✅ 강력 패널티
                logger.info(f"[QUIET_MISMATCH] {sub} → -45점")

            # 스포츠도 강력 패널티
            if cat == "스포츠":
                adjustment -= 45.0
                logger.info(f"[QUIET_MISMATCH] 스포츠 → -45점")

            # 힐링과 잘 맞는 카테고리 보너스
            if cat == "카페":
                adjustment += 22.0
            elif cat == "문화예술":
                adjustment += 18.0
            elif cat == "소셜" and sub in ["보드게임", "책", "독서"]:
                adjustment += 12.0  # 조용한 소셜

        # ACTIVE intent
        if intent == "ACTIVE":
            if cat == "스포츠":
                if sub == "축구":
                    adjustment += 18.0
                elif sub in ["러닝", "클라이밍", "배드민턴"]:
                    adjustment += 10.0
                else:
                    adjustment += 8.0
            else:
                adjustment -= 6.0

            # 카페/문화예술 패널티
            if cat in ["카페", "문화예술"]:
                adjustment -= 6.0

            # 소셜도 약간 패널티
            if cat == "소셜":
                if sub in ["볼링", "당구", "탁구"]:
                    adjustment += 3.0
                else:
                    adjustment -= 6.0

        # HANDS_ON intent
        if intent == "HANDS_ON":
            if cat == "취미활동":
                adjustment += 12.0
            if cat == "문화예술":
                adjustment += 6.0
            if cat == "소셜" and sub in ["당구", "볼링", "기타", "노래방", "보드게임"]:
                adjustment -= 18.0

        # BRAIN intent
        if intent == "BRAIN":
            # 보드게임/방탈출 최우선
            if cat == "소셜" and sub in ["보드게임", "방탈출"]:
                adjustment += 22.0
            # 당구/볼링/와인바 하향
            if cat == "소셜" and sub in ["당구", "볼링", "와인바", "노래방"]:
                adjustment -= 18.0
            # 카페/문화예술은 중립
            if cat in ["카페", "문화예술"]:
                adjustment += 0.0

        # 공놀이 키워드 특별 처리
        if parsed_query:
            keywords = parsed_query.get("keywords") or []
            if "공놀이" in keywords:
                if cat == "스포츠" and sub == "러닝":
                    adjustment -= 20.0
                if cat == "스포츠" and sub in ["축구", "배드민턴"]:
                    adjustment += 10.0

        # location_type 보정
        if parsed_query:
            requested_type = parsed_query.get("location_type")
            meeting_type = meeting.get("meeting_location_type") or meeting.get("location_type")

            if requested_type and meeting_type:
                if requested_type.upper() == meeting_type.upper():
                    adjustment += 6.0
                else:
                    adjustment -= 10.0

        return adjustment