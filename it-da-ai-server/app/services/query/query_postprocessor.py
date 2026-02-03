"""
Query Post-Processor
GPT 파싱 후 휴리스틱 기반 보정 로직
"""

import re
from typing import Set
from app.core.logging import logger


class QueryPostProcessor:
    """GPT 파싱 후 휴리스틱 보정"""

    # 감정 전용 키워드 (활동 의도 없음)
    EMOTION_ONLY_KEYWORDS = {
        "positive": ["신날", "신나", "즐거", "기분좋", "기분 좋", "행복", "설레"],
        "negative": ["우울", "슬플", "지칠", "힘들"],
        "tired": ["피곤", "졸려", "나른"],
        "stress": ["스트레스", "화나", "짜증"],
    }

    # 구체적 활동 키워드
    ACTIVITY_KEYWORDS = [
        # 스포츠
        "축구", "풋살", "농구", "배드민턴", "러닝", "등산",
        "클라이밍", "테니스", "헬스", "운동",

        # 문화예술
        "전시", "전시회", "공연", "뮤지컬", "영화", "박물관",
        "미술관", "갤러리", "콘서트",

        # 소셜
        "카페", "맛집", "술", "보드게임", "방탈출", "볼링",
        "당구", "노래방", "파티",

        # 스터디
        "스터디", "공부", "독서", "영어", "코딩",

        # 취미
        "요리", "베이킹", "공방", "DIY", "춤", "댄스",
    ]

    # 스터디 증거 키워드
    STUDY_EVIDENCE = [
        "스터디", "공부", "독서", "토익", "오픽", "영어", "자격증",
        "코딩", "개발", "프로그래밍", "세미나", "강의",
        "집중", "집중할", "몰입", "열공", "공부할", "공부하기", "조용히 공부"
    ]

    # 부정 패턴
    NEGATION_PATTERNS = [
        r"(말고|빼고|제외|말곤|아니고|말고는|말고요|말고서)",
        r"(말고\s*다른|빼고\s*다른|제외하고)"
    ]

    # ✅ 감정/상태 매핑 (순서 중요!)
    EMOTION_MAPPINGS = {
        # 피로/졸음 → 카페/휴식
        "tired": {
            "keywords": ["피곤", "졸려", "지쳐", "힘들", "녹초", "나른"],
            "category": "카페",
            "vibe": "여유로운",
            "confidence": 0.7,
            "message": "피로 감지"
        },

        # 분노/스트레스 → 스포츠
        "angry": {
            "keywords": ["열받", "화나", "짜증", "스트레스", "빡쳐", "답답"],
            "category": "스포츠",
            "vibe": "격렬한",
            "confidence": 0.75,
            "message": "분노/스트레스 감지"
        },

        # ✅ 우울/슬픔 → 편안한 (먼저 체크!)
        "sad": {
            "keywords": ["우울", "우울해", "슬퍼", "울적", "심기불편", "기분안좋", "슬프"],
            "category": "카페",  # ✅ None → 카페로 변경!
            "vibe": "여유로운",
            "confidence": 0.7,  # ✅ 0.6 → 0.7로 상향
            "message": "우울/슬픔 감지"
        },

        # ✅ 외로움/심심 → 소셜 (우울 제거!)
        "lonely": {
            "keywords": ["외로", "심심", "쓸쓸", "외롭", "심심해"],  # ✅ "우울" 제거
            "category": None,  # ✅ 강제 변경 방지
            "vibe": "즐거운",
            "confidence": 0.65,
            "message": "외로움 감지"
        },

        # 배고픔 → 맛집
        "hungry": {
            "keywords": ["배고", "배고파", "배고프", "배가고", "허기", "출출"],
            "category": "맛집",
            "vibe": None,
            "confidence": 0.75,
            "message": "배고픔 감지"
        },

        # 갈증 → 카페
        "thirsty": {
            "keywords": ["목마", "목말", "갈증"],
            "category": "카페",
            "vibe": "여유로운",
            "confidence": 0.7,
            "message": "갈증 감지"
        },

        # 지루함 → 문화예술/소셜
        "bored": {
            "keywords": ["지루", "무료", "재미없"],
            "category": None,
            "vibe": "즐거운",
            "confidence": 0.65,
            "message": "지루함 감지"
        },

        # 불안/긴장 → 편안한 활동
        "anxious": {
            "keywords": ["불안", "긴장", "초조"],
            "category": None,
            "vibe": "여유로운",
            "confidence": 0.65,
            "message": "불안 감지"
        },

        # ✅ 힐링/번아웃 → 카페
        "healing": {
            "keywords": ["힐링", "번아웃", "휴식", "쉬고싶", "쉬고", "쉬어"],
            "category": None,  # ✅ 카페 → None
            "vibe": "힐링",
            "confidence": 0.5,  # ✅ 0.75 → 0.5로 낮춤
            "message": "힐링/휴식 감지"
        },
    }

    def __init__(self, normalizer):
        self.normalizer = normalizer

    def post_fix(self, user_prompt: str, parsed: dict) -> dict:
        """GPT 파싱 후 보정 (개선)"""
        text = (user_prompt or "").lower().strip()
        q = dict(parsed or {})

        # 2순위: location_type
        q = self._fix_location_type(text, q)

        # 3순위: 실내 + 즐거움
        q = self._fix_indoor_fun(text, q)

        # 4순위: 감정/상태 처리
        q = self._fix_emotion_state(text, q)

        # 5순위: 기타 우선순위 룰들
        q = self._fix_hunger(text, q)
        q = self._fix_exclusion(text, q)
        q = self._fix_photo(text, q)
        q = self._fix_brain(text, q)
        q = self._fix_ball_sports(text, q)
        q = self._fix_dance(text, q)
        q = self._fix_hands_on(text, q)
        q = self._fix_culture(text, q)
        q = self._fix_go_out(text, q)
        q = self._fix_play_vs_meal(text, q)
        q = self._fix_location_only(text, q)
        q = self._fix_study(text, q)
        q = self._fix_gender_hint(text, q)
        q = self._fix_temperature(text, q)

        # ✅ 최종: 감정 전용 체크 (모든 로직 이후에!)
        q = self._fix_emotion_only_category(user_prompt, q)

        return q

    def _fix_emotion_only_category(self, prompt: str, parsed: dict) -> dict:
        """감정만 있고 활동 없으면 category 제거 (개선)"""

        text = prompt.lower()

        # 1) 감정 키워드 체크
        has_emotion = False
        detected_vibe = None

        for emotion_type, keywords in self.EMOTION_ONLY_KEYWORDS.items():
            if any(kw in text for kw in keywords):
                has_emotion = True

                if emotion_type == "positive":
                    detected_vibe = "즐거운"
                elif emotion_type == "negative":
                    detected_vibe = "힐링"
                elif emotion_type == "tired":
                    detected_vibe = "여유로운"
                elif emotion_type == "stress":
                    detected_vibe = "격렬한"
                break

        # 2) 구체적 활동 키워드 체크
        has_activity = any(kw in text for kw in self.ACTIVITY_KEYWORDS)

        # 3) 감정만 있고 활동 없으면 category 제거
        if has_emotion and not has_activity:
            current_cat = parsed.get("category")

            logger.info(
                f"[POST_FIX] 감정 전용 검색어 감지: '{prompt}' "
                f"→ category '{current_cat}' 제거, vibe='{detected_vibe}' 유지"
            )

            return {
                **parsed,
                "category": None,
                "subcategory": None,
                "vibe": detected_vibe or parsed.get("vibe"),
                "confidence": min(0.55, float(parsed.get("confidence", 0.5))),
                "emotion_only_search": True,  # ✅ 플래그 추가!
            }

        return parsed

    def _fix_temperature(self, text: str, q: dict) -> dict:
        """온도 키워드 처리"""

        # 추울 때 → 실내
        cold_words = ["추워", "춥", "추운", "겨울", "날씨가"]
        if any(w in text for w in cold_words):
            # "추운데 밖에서"같은 예외 체크
            outdoor_explicit = any(w in text for w in ["밖에", "야외", "실외"])
            if not outdoor_explicit:
                q["location_type"] = "INDOOR"
                q["confidence"] = max(float(q.get("confidence", 0) or 0), 0.65)
                logger.info("[POST_FIX] 추위 감지 → location_type=INDOOR")

        # 더울 때 → 실외 선호 (but 카페도 가능)
        hot_words = ["더워", "덥", "더운", "여름", "날씨가"]
        if any(w in text for w in hot_words):
            indoor_explicit = any(w in text for w in ["실내", "안에", "에어컨"])
            if not indoor_explicit and not q.get("category"):
                q["location_type"] = "OUTDOOR"
                q["confidence"] = max(float(q.get("confidence", 0) or 0), 0.6)
                logger.info("[POST_FIX] 더위 감지 → location_type=OUTDOOR")

        return q

    def _fix_location_type(self, text: str, q: dict) -> dict:
        """실내/실외 명시 키워드 처리"""
        outdoor_keywords = ["실외", "야외", "밖", "아웃도어", "outdoor"]
        indoor_keywords = ["실내", "인도어", "indoor"]

        has_outdoor = any(k in text for k in outdoor_keywords)
        has_indoor = any(k in text for k in indoor_keywords)

        if has_outdoor and not has_indoor:
            q["location_type"] = "OUTDOOR"
        elif has_indoor and not has_outdoor:
            q["location_type"] = "INDOOR"
        elif has_outdoor and has_indoor:
            outdoor_pos = min((text.find(k) for k in outdoor_keywords if k in text), default=999)
            indoor_pos = min((text.find(k) for k in indoor_keywords if k in text), default=999)
            q["location_type"] = "OUTDOOR" if outdoor_pos < indoor_pos else "INDOOR"

        return q

    def _fix_indoor_fun(self, text: str, q: dict) -> dict:
        """실내 + 즐거움 → 소셜(보드게임/방탈출)"""
        fun_words = ["즐겁", "재밌", "재미", "신나", "fun"]
        indoor_fun = (q.get("location_type") == "INDOOR") and any(w in text for w in fun_words)

        activity_hints = [
            "보드게임", "방탈출", "체스", "퍼즐", "퀴즈",
            "러닝", "축구", "배드민턴", "클라이밍", "등산", "운동",
            "전시", "공연", "뮤지컬", "연극", "갤러리",
            "카페", "브런치", "디저트", "맛집",
            "스터디", "공부", "독서", "영어", "코딩",
            "댄스", "춤", "공방", "diy", "만들기", "요리",
            "노래방", "볼링", "당구",
        ]
        has_activity_hint = any(h in text for h in activity_hints)
        kws_now = q.get("keywords") or []
        vibe_only = (not has_activity_hint) and (len(kws_now) == 0) and (not q.get("subcategory"))

        if indoor_fun and vibe_only:
            q["category"] = "소셜"
            q.pop("subcategory", None)
            self._add_keywords(q, ["보드게임", "방탈출"], limit=10)
            q["vibe"] = q.get("vibe") or "즐거운"
            q["confidence"] = max(float(q.get("confidence", 0) or 0), 0.65)

        return q

    def _fix_hunger(self, text: str, q: dict) -> dict:
        """배고파 감정 표현 처리 (이미 _fix_emotion_state에서 처리됨)"""
        # 중복 방지를 위해 간소화
        hunger_words = ["배고", "배고파", "배고프", "배가고", "허기", "출출"]
        if any(w in text for w in hunger_words):
            # location_query 오파싱 제거만
            if any(w in str(q.get("location_query", "")) for w in hunger_words):
                q.pop("location_query", None)

        return q

    def _fix_exclusion(self, text: str, q: dict) -> dict:
        """먹는거 말고/제외 처리"""
        if self._excludes_food(text):
            if q.get("category") in ["맛집", "카페"]:
                q.pop("category", None)
                q.pop("subcategory", None)

            if not q.get("location_type"):
                q["location_type"] = "INDOOR"
            if not q.get("category"):
                q["category"] = "문화예술"
            if not q.get("vibe"):
                q["vibe"] = "여유로운"

            q["confidence"] = max(float(q.get("confidence", 0) or 0), 0.65)
            self._drop_food_keywords(q)

            logger.info("[POST_FIX] 먹는거말고 감지 → 음식계열 차단")

        return q

    def _fix_photo(self, text: str, q: dict) -> dict:
        """사진/촬영 의도 강제"""
        photo_words = ["사진", "촬영", "포토", "카메라", "필카", "스냅", "인생샷"]
        if any(w in text for w in photo_words):
            q["category"] = "문화예술"
            q["subcategory"] = "사진촬영"
            if not q.get("vibe"):
                q["vibe"] = "즐거운"
            q["confidence"] = max(float(q.get("confidence", 0) or 0), 0.75)

            logger.info("[POST_FIX] 사진/촬영 감지 → category=문화예술")

        return q

    def _fix_brain(self, text: str, q: dict) -> dict:
        """뇌/추리/보드게임 강제"""
        brain_words = ["머리", "머리쓰", "두뇌", "추리", "전략", "퍼즐", "퀴즈", "방탈출", "보드게임", "체스"]
        if any(w in text for w in brain_words):
            if not q.get("category"):
                q["category"] = "소셜"
            if not q.get("location_type"):
                q["location_type"] = "INDOOR"

            self._add_keywords(q, ["보드게임", "방탈출", "퍼즐", "추리"], limit=10)

            # ✅ emotion vibe 보호
            if not q.get("emotion_vibe_locked") and not q.get("vibe"):
                q["vibe"] = "즐거운"
            q["confidence"] = max(float(q.get("confidence", 0) or 0), 0.75)

            logger.info("[POST_FIX] 머리/두뇌 감지 → keywords 확장")

        return q

    def _fix_ball_sports(self, text: str, q: dict) -> dict:
        """공놀이 처리"""
        if "공놀이" in text:
            q["category"] = "스포츠"
            q.pop("subcategory", None)
            q["keywords"] = ["축구", "풋살", "농구", "배드민턴", "테니스"]
            q["confidence"] = max(float(q.get("confidence", 0) or 0), 0.65)

            logger.info("[POST_FIX] 공놀이 감지 → keywords 확장")

        return q

    def _fix_dance(self, text: str, q: dict) -> dict:
        """춤/댄스 강제"""
        dance_words = ["춤", "댄스", "dance", "kpop", "k-pop", "케이팝", "스트릿", "힙합댄스", "방송댄스"]
        if any(w in text for w in dance_words):
            q["category"] = "취미활동"
            q["subcategory"] = "댄스"
            if not q.get("vibe"):
                q["vibe"] = "즐거운"
            if not q.get("location_type"):
                q["location_type"] = "INDOOR"
            q["confidence"] = max(float(q.get("confidence", 0) or 0), 0.75)

            logger.info("[POST_FIX] 춤/댄스 감지 → category=취미활동")

        return q

    def _fix_hands_on(self, text: str, q: dict) -> dict:
        """손으로/공방/DIY 강제"""
        hands_on_words = ["손으로", "만들", "만들기", "공방", "체험", "diy", "수공예", "핸드메이드"]
        if any(w in text for w in hands_on_words):
            q["category"] = "취미활동"
            if not q.get("vibe"):
                q["vibe"] = "여유로운"
            q["confidence"] = max(float(q.get("confidence", 0) or 0), 0.70)

            if any(w in text for w in ["붓글씨", "캘리", "캘리그라피"]):
                q["subcategory"] = "캘리그라피"

            logger.info("[POST_FIX] 공방/DIY 감지 → category=취미활동")

        return q

    def _fix_culture(self, text: str, q: dict) -> dict:
        """문화생활 강제"""
        culture_words = ["문화생활", "전시", "공연", "뮤지컬", "연극", "갤러리", "박물관", "사진전", "페스티벌"]
        sports_words = ["러닝", "운동", "뛰", "달리", "축구", "배드민턴", "클라이밍", "등산"]

        if any(w in text for w in culture_words) and not any(w in text for w in sports_words):
            q["category"] = "문화예술"
            q.pop("subcategory", None)
            if not q.get("emotion_vibe_locked") and not q.get("vibe"):
                q["vibe"] = "여유로운"
            q["confidence"] = max(float(q.get("confidence", 0) or 0), 0.70)

            logger.info("[POST_FIX] 문화생활 감지 → category=문화예술")

        return q

    def _fix_go_out(self, text: str, q: dict) -> dict:
        """나가고싶다/외출 표현"""
        go_out_keywords = ["나가", "외출", "나갈"]
        if any(k in text for k in go_out_keywords):
            if not q.get("location_type"):
                q["location_type"] = "OUTDOOR"
            q["confidence"] = max(float(q.get("confidence", 0) or 0), 0.55)

        return q

    def _fix_play_vs_meal(self, text: str, q: dict) -> dict:
        """놀다 vs 먹다 우선순위"""
        play_keywords = ["놀", "재밌게", "즐겁게", "신나게", "fun"]
        meal_keywords = ["먹", "식사", "밥", "점심먹", "저녁먹", "아침먹"]

        has_play = any(k in text for k in play_keywords)
        has_meal = any(k in text for k in meal_keywords)

        if not q.get("category"):
            if has_play:
                q["category"] = "소셜"
                if not q.get("vibe"):
                    q["vibe"] = "즐거운"
                q["confidence"] = max(float(q.get("confidence", 0) or 0), 0.65)
            elif has_meal:
                q["category"] = "맛집"
                if not q.get("vibe"):
                    q["vibe"] = "캐주얼"
                q["confidence"] = max(float(q.get("confidence", 0) or 0), 0.60)

        return q

    def _fix_location_only(self, text: str, q: dict) -> dict:
        """위치 전용 쿼리 감지"""
        location_only_keywords = ["근처", "주변"]
        activity_keywords = [
            "카페", "러닝", "운동", "맛집", "전시", "스터디", "놀", "먹",
            "보드게임", "당구", "영화", "클라이밍", "배드민턴", "축구"
        ]

        is_location_only = any(k in text for k in location_only_keywords)
        has_activity = any(k in text for k in activity_keywords)

        if is_location_only and not has_activity:
            q.pop("category", None)
            q.pop("subcategory", None)

            if not q.get("location_query"):
                if "집" in text:
                    q["location_query"] = "집 근처"

            q["confidence"] = max(float(q.get("confidence", 0) or 0), 0.55)

            logger.info("[POST_FIX] 위치 전용 쿼리 감지")

        return q

    def _fix_study(self, text: str, q: dict) -> dict:
        """공부/스터디 보정"""
        study_keywords = ["공부", "스터디", "집중", "독서", "혼자"]
        if any(k in text for k in study_keywords):
            if q.get("category") == "소셜":
                q["category"] = "스터디"

            # ✅ emotion vibe가 잠겨있지 않을 때만 변경
            if not q.get("emotion_vibe_locked") and not q.get("vibe"):
                q["vibe"] = "집중"

            q["confidence"] = max(float(q.get("confidence", 0) or 0), 0.65)

        return q

    def _fix_emotion_state(self, text: str, q: dict) -> dict:
        """✅ 감정/신체상태 키워드 처리 (통합 버전)"""

        # ✅ 감정 전용 검색이면 스킵
        if q.get("emotion_only_search"):
            logger.info("[POST_FIX] 감정 전용 검색 → _fix_emotion_state 스킵")
            return q

        # 이미 category가 확실하면 스킵 (GPT가 잘 파싱한 경우)
        current_conf = float(q.get("confidence", 0) or 0)

        # ✅ 감정 키워드는 confidence가 높아도 우선!
        # if q.get("category") and current_conf >= 0.8:  # ← 이 조건 제거 또는 완화
        #     return q

        # 감정 매핑 우선 체크
        for emotion_type, mapping in self.EMOTION_MAPPINGS.items():
            keywords = mapping["keywords"]

            if any(kw in text for kw in keywords):
                # category 처리 (✅ 항상 덮어쓰기)
                if mapping["category"]:
                    q["category"] = mapping["category"]
                    logger.info(f"[POST_FIX] {mapping['message']} → category={mapping['category']}")

                # vibe 처리 (항상 적용)
                if mapping["vibe"]:
                    q["vibe"] = mapping["vibe"]
                    q["emotion_vibe_locked"] = True
                    logger.info(f"[POST_FIX] {mapping['message']} → vibe={mapping['vibe']}")

                # confidence 상향
                q["confidence"] = max(current_conf, mapping["confidence"])

                # 특수 처리
                if emotion_type == "hungry":
                    q.pop("subcategory", None)

                # 첫 매칭에서 종료
                return q

        return q

    def _fix_gender_hint(self, text: str, q: dict) -> dict:
        """성별 키워드 힌트 (강제 변경 금지)"""
        male_keywords = ["남자", "남성", "남자가", "남성이"]
        female_keywords = ["여자", "여성", "여자가", "여성이"]

        has_male = any(k in text for k in male_keywords)
        has_female = any(k in text for k in female_keywords)

        if has_male and not has_female:
            if q.get("category") in [None, "", "소셜", "스포츠"]:
                self._add_keywords(q, ["축구", "볼링", "당구"], limit=10)
                q["confidence"] = max(float(q.get("confidence", 0) or 0), 0.55)

        if has_female and not has_male:
            if q.get("category") in [None, "", "카페", "문화예술", "취미활동"]:
                self._add_keywords(q, ["카페", "전시", "공방"], limit=10)
                q["confidence"] = max(float(q.get("confidence", 0) or 0), 0.55)

        return q

    def guard_category_by_evidence(self, user_prompt: str, q: dict) -> dict:
        """스터디 증거 기반 category 가드"""
        text = (user_prompt or "").lower()
        cat = (q.get("category") or "").strip()
        lt = (q.get("location_type") or "").upper()

        quiet_evidence = ["조용", "차분", "힐링", "잔잔", "고요", "여유"]

        has_study = any(w in text for w in self.STUDY_EVIDENCE)
        has_quiet = any(w in text for w in quiet_evidence)

        # 스터디 증거가 없는데 GPT가 스터디로 찍으면 제거
        if cat == "스터디" and not has_study:
            q.pop("category", None)
            q.pop("subcategory", None)

            # 야외 + 조용 → 산책 키워드
            if lt == "OUTDOOR" and has_quiet:
                kws = q.get("keywords") or []
                for w in ["산책", "사진", "피크닉", "공원"]:
                    if w not in kws:
                        kws.append(w)
                q["keywords"] = kws[:8]

            # 실내 + 집중 → 스터디 복구
            if lt == "INDOOR" and ("집중" in text or "조용" in text):
                q["category"] = "스터디"
                kws = q.get("keywords") or []
                for w in ["스터디카페", "도서관", "열람실", "코워킹", "독서"]:
                    if w not in kws:
                        kws.append(w)
                q["keywords"] = kws[:8]
                q["vibe"] = q.get("vibe") or "집중"
                q["confidence"] = max(float(q.get("confidence", 0) or 0), 0.65)
            else:
                q["confidence"] = min(float(q.get("confidence", 0) or 0), 0.65)

        # 야외 + 조용 → 문화예술
        if (not q.get("category")) and lt == "OUTDOOR" and has_quiet:
            q["category"] = "문화예술"
            q["confidence"] = max(float(q.get("confidence", 0) or 0), 0.6)

        return q

    # Helper methods
    def _add_keywords(self, q: dict, words: list[str], limit: int = 8):
        """키워드 추가"""
        kws = q.get("keywords") or []
        kws = [str(x).strip() for x in kws if x]
        for w in words:
            w = str(w).strip()
            if w and w not in kws:
                kws.append(w)
        q["keywords"] = kws[:limit]

    def _drop_food_keywords(self, q: dict):
        """음식 관련 키워드 제거"""
        kws = q.get("keywords") or []
        bad = {"먹", "먹기", "식사", "밥", "맛집", "카페", "브런치", "디저트", "음식"}
        q["keywords"] = [k for k in kws if str(k).strip() not in bad]

    def _has_exclusion(self, text: str) -> bool:
        """부정 패턴 감지"""
        if not text:
            return False
        t = text.lower().strip()
        return any(re.search(pat, t) for pat in self.NEGATION_PATTERNS)

    def _excludes_food(self, text: str) -> bool:
        """먹는거말고 패턴 감지"""
        t = (text or "").lower()
        if not self._has_exclusion(t):
            return False
        food_words = ["먹", "식사", "밥", "맛집", "음식", "카페", "브런치", "디저트"]
        return any(w in t for w in food_words)
