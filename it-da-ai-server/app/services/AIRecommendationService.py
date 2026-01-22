"""
AI Recommendation Integration Service
GPT 파싱 → DB 검색 → AI 모델 추천 통합
"""

import httpx
import math
import uuid
from collections import Counter
from typing import List, Dict, Optional
import json
import re
import anyio
from typing import Set

import numpy as np

from app.core.scoring_utils import match_from_percentile
from app.services.gpt_prompt_service import GPTPromptService
from app.models.model_loader import model_loader
from app.core.logging import logger
from app.core.keyword_utils import clean_keywords


class AIRecommendationService:
    """AI 추천 통합 서비스"""

    PROMPT_STOP = {"모임", "스터디", "추천", "해줘", "해주세요", "같이", "할만한", "할", "하는", "원해", "싶어"}
    PROMPT_STOP |= {"할수있는", "할수있", "가능한", "가능", "해볼만한", "할만한거", "만한거", "거", "것"}

    SYN_MAP = {
        # 스터디 계열
        "영어회화": ["영어", "회화", "스피킹"],
        "영어": ["영어", "회화", "스피킹"],
        "회화": ["회화", "스피킹"],
        "토익": ["토익"],
        "오픽": ["오픽"],
        "코딩": ["코딩", "개발", "프로그래밍"],
        "개발": ["개발", "코딩", "프로그래밍"],
        "프로그래밍": ["프로그래밍", "코딩", "개발"],
        "춤": ["춤", "댄스", "dance", "kpop", "케이팝", "방송댄스"],
        "댄스": ["댄스", "춤", "kpop", "케이팝", "방송댄스"],

        "붓글씨": ["붓글씨", "캘리", "캘리그라피", "서예"],
        "캘리그라피": ["캘리그라피", "캘리", "붓글씨", "서예"],

        "손으로": ["공방", "만들기", "diy", "캘리그라피", "그림", "도예", "가죽공예"],
        "diy": ["diy", "공방", "만들기", "도예", "가죽공예", "캘리그라피"],
    }

    SYN_MAP.update({
        "공놀이": ["축구", "풋살", "농구", "배구", "배드민턴", "테니스"],
        "머리": ["보드게임", "방탈출", "체스", "퍼즐", "추리"],
        "머리쓰": ["보드게임", "방탈출", "체스", "퍼즐", "추리"],
        "두뇌": ["보드게임", "방탈출", "체스", "퍼즐", "추리"],
        "추리": ["방탈출", "추리", "미스터리", "보드게임"],
        "전략": ["보드게임", "체스", "전략"],
    })

    SYN_MAP.update({
        "사진": ["사진", "촬영", "포토", "카메라", "스냅", "필카"],
        "포토": ["사진", "촬영", "포토", "카메라", "스냅", "필카"],
        "촬영": ["사진", "촬영", "포토", "카메라", "스냅", "필카"],
    })

    def __init__(
        self,
        gpt_service: GPTPromptService,
        spring_boot_url: str = "http://localhost:8080"
    ):
        self.gpt_service = gpt_service
        self.spring_boot_url = spring_boot_url

    # -------------------------
    # Normalizers (Spring Enum/DB 값 호환)
    # -------------------------
    def _normalize_timeslot(self, ts: Optional[str]) -> Optional[str]:
        """Spring Enum: MORNING/AFTERNOON/EVENING/NIGHT"""
        if not ts:
            return None

        raw = str(ts).strip()

        # ✅ "MORNING,FLEXIBLE" 같은 값 들어오면 첫 토큰만 사용
        if "," in raw:
            raw = raw.split(",")[0].strip()

        lower = raw.lower()
        mapping = {
            "morning": "MORNING",
            "afternoon": "AFTERNOON",
            "evening": "EVENING",
            "night": "NIGHT",
            "오전": "MORNING",
            "아침": "MORNING",
            "점심": "AFTERNOON",
            "오후": "AFTERNOON",
            "저녁": "EVENING",
            "밤": "NIGHT",
            "야간": "NIGHT",
        }
        return mapping.get(lower, raw.upper())

    def _normalize_vibe(self, v: Optional[str]) -> Optional[str]:
        if not v:
            return None
        raw = str(v).strip().lower()

        mapping = {
            "신나는": "즐거운",
            "재밌는": "즐거운",
            "즐거운": "즐거운",
            "활기찬": "활기찬",
            "에너지": "활기찬",
            "에너지넘치는": "활기찬",

            "편안한": "여유로운",
            "여유로운": "여유로운",
            "힐링": "힐링",
            "차분한": "여유로운",
            "조용한": "여유로운",
            "감성": "감성적인",
            "감성적인": "감성적인",

            "배움": "배움",
            "진지한": "진지한",
            "건강한": "건강한",
        }

        # 부분 포함도 커버
        for k, vv in mapping.items():
            if k in raw:
                return vv
        return v

    def _normalize_location_type(self, lt: Optional[str]) -> Optional[str]:
        """Spring Enum: INDOOR/OUTDOOR"""
        if not lt:
            return None
        raw = str(lt).strip()
        lower = raw.lower()
        mapping = {
            "indoor": "INDOOR",
            "outdoor": "OUTDOOR",
            "실내": "INDOOR",
            "실외": "OUTDOOR",
            "야외": "OUTDOOR",
        }
        return mapping.get(lower, raw.upper())

    def _normalize_budget_for_model(self, bt: Optional[str]) -> str:
        """모델 입력은 소문자로 통일 (value/quality)"""
        if not bt:
            return "value"
        raw = str(bt).strip()
        mapping = {
            "VALUE": "value", "value": "value", "가성비": "value", "합리": "value",
            "QUALITY": "quality", "quality": "quality", "품질": "quality",
        }
        return mapping.get(raw, mapping.get(raw.upper(), mapping.get(raw.lower(), "value")))

    def _normalize_term(self, t: str) -> str:
        t = t.strip().lower()
        t = re.sub(r"(관련(된|한)?|위주|중심|느낌|같은)$", "", t)  # ✅ 추가
        t = re.sub(r"(에서|으로|로|말고|빼고|제외)$", "", t)
        # ✅ 2) 한 글자 조사(이/가/은/는/을/를)는 '단독 토큰'에서는 제거하지 않음
        # (공놀이 같은 단어가 깨짐 방지)
        # 필요하면 "공 놀이"처럼 띄어쓰기 된 케이스에서만 처리하도록,
        # 상위에서 문장 전체에 대해 공백 기반 처리할 때만 적용하는 게 안전함.

        return t

    # -------------------------
    # Intent (문장 의도)
    # -------------------------
    def _detect_intent(self, user_prompt: str, parsed_query: dict) -> str:
        t = (user_prompt or "").lower()

        # ✅ 1순위: 격렬함 키워드 (최우선!)
        intense_keywords = ["격정", "격렬", "열정", "강렬", "익스트림", "하드"]
        if any(k in t for k in intense_keywords):
            return "ACTIVE"

        brain_words = ["머리", "머리쓰", "두뇌", "추리", "전략", "퍼즐", "퀴즈", "방탈출", "보드게임", "체스"]
        if any(w in t for w in brain_words):
            return "BRAIN"

        vibe = parsed_query.get("vibe", "")
        if vibe in ["격렬한", "활기찬", "에너지", "즐거운"]:
            return "ACTIVE"  # 또는 "FUN" 새로 만들어도 됨

        # ✅ 2순위: vibe 키워드
        quiet_words = ["조용", "쉬", "힐링", "편하게", "여유", "차분", "편안"]
        active_words = ["러닝", "운동", "뛰", "배드민턴", "축구", "클라이밍"]
        hands_words = ["손으로", "공방", "diy", "만들기", "수공예", "캘리", "붓글씨", "그림", "도예"]
        if any(w in t for w in hands_words):
            return "HANDS_ON"

        vibe = parsed_query.get("vibe", "")

        # ✅ vibe="격렬한" 무조건 ACTIVE
        if vibe in ["격렬한", "활기찬", "에너지"]:
            return "ACTIVE"

        if any(w in t for w in quiet_words) or vibe in ["편안한", "여유로운", "조용한"]:
            return "QUIET"

        if any(w in t for w in active_words):
            return "ACTIVE"

        return "NEUTRAL"

    # -------------------------
    # Search payload builder (중요)
    # -------------------------
    def _should_apply_time_slot(self, q: dict) -> bool:
        # time_slot은 추측이 섞이므로 confidence 높을 때만 필터로 사용
        return q.get("time_slot") is not None and q.get("confidence", 0) >= 0.9

    def _should_apply_vibe(self, q: dict) -> bool:
        return q.get("vibe") is not None and q.get("confidence", 0) >= 0.9

    def _infer_location_type(self, q: dict) -> Optional[str]:
        kws = q.get("keywords") or []
        text = " ".join(kws)
        if "실내" in text:
            return "INDOOR"
        if "야외" in text or "실외" in text:
            return "OUTDOOR"
        return None

    def _to_spring_search_request(self, enriched_query: dict, user_ctx: dict, user_prompt: str = "") -> dict:
        raw_keywords = enriched_query.get("keywords") or []

        # ✅ 1) 한 번만 정제 (너가 만든 clean_keywords 사용)
        keywords = clean_keywords(raw_keywords)

        # ✅ 2) category와 중복 제거 (정제된 keywords에서 제거해야 함)
        category = enriched_query.get("category")
        if category:
            keywords = [k for k in keywords if str(k).strip().lower() != str(category).strip().lower()]

        logger.info("[PAYLOAD_KEYWORDS] raw=%s -> cleaned=%s", raw_keywords, keywords)

        # ✅ 유저 좌표
        lat = user_ctx.get("lat") or user_ctx.get("latitude")
        lng = user_ctx.get("lng") or user_ctx.get("longitude")

        # ✅ locationQuery
        location_query = enriched_query.get("location_query") or enriched_query.get("locationQuery")

        # ✅ "근처/주변/집" 의도
        near_me = self._is_near_me_phrase(location_query) or self._is_near_me_phrase(user_prompt)  # ✅ user_prompt도 체크

        # ✅ timeSlot: "유저 선호" 절대 섞이지 않게!
        conf = float(enriched_query.get("confidence", 0) or 0)
        # ✅ 해결: "아침/점심/저녁" 같은 명확한 시간 표현은 conf 낮아도 필터 적용
        gpt_ts = enriched_query.get("time_slot")

        # conf 0.6 이상이고 time_slot이 있으면 무조건 필터링
        explicit_ts = self._has_explicit_timeslot(user_prompt)
        time_slot = self._normalize_timeslot(gpt_ts) if (gpt_ts and (conf >= 0.6 or explicit_ts)) else None

        # ✅ locationType: GPT가 파싱한 것만 사용 (유저 선호 섞지 않기!)
        gpt_location_type = enriched_query.get("location_type")
        location_type = self._normalize_location_type(gpt_location_type) if gpt_location_type else None

        payload = {
            "category": enriched_query.get("category"),
            "subcategory": enriched_query.get("subcategory"),

            # ✅ GPT time_slot만, conf 높을 때만
            "timeSlot": time_slot,

            # ✅ locationType 추가 - Spring에서 필터링
            "locationType": location_type,

            "keywords": keywords if keywords else None,   # ✅ 여기! 없으면 None

            # ✅ userLocation은 항상 보내도 됨 (거리 계산용)
            "userLocation": {
                "latitude": lat,
                "longitude": lng
            },

            "locationQuery": location_query,
            "maxCost": enriched_query.get("maxCost") or enriched_query.get("max_cost"),
        }


        logger.info(f"[PAYLOAD_DEBUG] category={payload.get('category')} subcategory={payload.get('subcategory')}")

        # ✅ radius는 "근처 의도일 때만" 포함
        if near_me:
            payload["radius"] = float(enriched_query.get("radius") or 10.0)

        # 로그
        logger.info(
            f"[PAYLOAD] near_me={near_me} locationType={location_type} "
            f"userLocation={payload.get('userLocation')} "
            f"radius={payload.get('radius', None)} timeSlot={payload.get('timeSlot')}"
        )
        logger.info(f"[PAYLOAD_KEYWORDS] raw={raw_keywords} -> cleaned={keywords}")

        # null/""/[] 제거
        def clean(o):
            if isinstance(o, dict):
                return {k: clean(v) for k, v in o.items() if v is not None and v != "" and v != []}
            return o

        return clean(payload)

    # -------------------------
    # Step 4: candidate search + relaxation
    # -------------------------
    async def _search_meetings(self, enriched_query: dict, user_context: dict, user_prompt: str = "") -> list[dict]:
        try:
            payload = self._to_spring_search_request(enriched_query, user_context, user_prompt)
            logger.info(f"[PAYLOAD_FULL] {payload}")

            logger.info(f"[SEARCH_REQUEST] URL={self.spring_boot_url}/api/meetings/search")
            logger.info(f"[SEARCH_PAYLOAD] {json.dumps(payload, ensure_ascii=False)}")  # ← import json 필요

            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    f"{self.spring_boot_url}/api/meetings/search",
                    json=payload
                )

            logger.info(f"[SEARCH_RESPONSE] status={response.status_code}")

            if response.status_code == 200:
                result = response.json()
                meetings = result.get("meetings", [])

                # ✅ 추가: Spring 응답 확인
                logger.info(f"📦 Spring 응답: {len(meetings)}개 모임 받음")
                if meetings:
                    ids = [m.get('meeting_id') or m.get('meetingId') for m in meetings[:5]]
                    logger.info(f"🔝 상위 5개 ID: {ids}")

                return meetings
            else:
                logger.warning(f"⚠️ 모임 검색 실패: {response.status_code} body={response.text}")
                return []
        except Exception as e:
            logger.error(f"⚠️ 모임 검색 API 호출 실패: {e}")
            return []


    async def _search_with_relaxation(self, base_query: dict, user_context: dict, trace_steps: list,
                                      user_prompt: str = "") -> list[dict]:
        """
        - confidence 기반 초기 필터 강도 조절
        - relax 우선순위: locationQuery -> vibe -> timeSlot -> keywords -> subcategory -> (마지막) category
        - category 가드: category가 있었는데 결과가 전부 다른 category면 locationQuery 제거 후 category 고정 재시도
        - trace_steps 유지
        """

        conf = float(base_query.get("confidence", 0) or 0)
        explicit_quiet = self._has_explicit_quiet(user_prompt)
        explicit_loc = self._has_explicit_location(user_prompt, base_query)
        logger.info(f"[RELAX_FLAGS] explicit_loc={explicit_loc} explicit_quiet={explicit_quiet}")

        # ✅ 시작 로그
        logger.info(f"🔥 [RELAX_START] conf={conf:.2f}, base_query={base_query}")

        def drop_keys(q: dict, *keys):
            qq = dict(q)
            for k in keys:
                qq.pop(k, None)
            return qq

        def norm(q: dict):
            return dict(q)  # 아무것도 바꾸지 않기

        # AIRecommendationService.py의 _search_with_relaxation() 수정

        async def _try(label: str, q: dict, level: int):
            q = norm(q)

            logger.info(f"🔥 [RELAX_{level}] {label} 시작")
            logger.info(f"🔥 [RELAX_{level}] query={q}")

            meetings = await self._search_meetings(q, user_context, user_prompt)
            meetings = meetings or []

            # ✅ locationType 2차 필터 (Spring 통과한 것 재확인)  --- 개선버전
            requested_type = q.get("location_type")
            if requested_type:
                requested_normalized = self._normalize_location_type(requested_type)
                before_count = len(meetings)

                meetings = [
                    m for m in meetings
                    if self._normalize_location_type(self._pick_location_type_from_raw(m)) == requested_normalized
                ]

                if len(meetings) < before_count:
                    logger.info(
                        f"🔍 [RELAX_{level}] locationType 2차 필터(raw): {requested_normalized} | "
                        f"{before_count} -> {len(meetings)}"
                    )

            logger.info(f"🔥 [RELAX_{level}] {label} 완료: {len(meetings)}개 받음")

            trace_steps.append({
                "level": level,
                "label": label,
                "payload": self._to_spring_search_request(q, user_context, user_prompt),
                "count": len(meetings),
                "cats": dict(Counter((m.get("category"), m.get("subcategory")) for m in meetings)) if meetings else {},
            })
            return meetings

        base_cat = (base_query.get("category") or "").strip() or None

        # -----------------------
        # 1) conf 기반 시작 쿼리 정규화
        # -----------------------
        # conf 기반 시작 쿼리 정규화
        q0 = dict(base_query)

        if conf < 0.70:
            q0 = drop_keys(q0, "subcategory")

        # time_slot은 conf 낮으면 제거 (vibe랑 분리!)
        if conf < 0.85:
            q0 = drop_keys(q0, "time_slot", "timeSlot")

        # vibe는 explicit_quiet 아닐 때만 제거
        if conf < 0.85 and not explicit_quiet:
            q0 = drop_keys(q0, "vibe")

        # ✅ L0
        cands = await _try("L0(conf 반영)", q0, 0)

        if cands:
            requested_sub = (base_query.get("subcategory") or "").strip()

            # ✅ subcategory 우선 필터 (실제 동작 버전)
            if requested_sub:
                before = len(cands)
                cands_sub = [
                    m for m in cands
                    if (m.get("subcategory") or "").strip() == requested_sub
                ]
                if cands_sub:
                    logger.info(
                        f"[RELAX_0] subcategory 우선필터 {before}->{len(cands_sub)} ({requested_sub})"
                    )
                    return cands_sub

            if base_cat and all((m.get("category") or "").strip() != base_cat for m in cands):
                # ✅ 1차: location_query 제거 (기존)
                q_fix = drop_keys(q0, "location_query", "locationQuery")
                c2 = await _try("L0-guard(locationQuery 제거)", q_fix, 1)
                if c2 and any((m.get("category") or "").strip() == base_cat for m in c2):
                    return c2

                # ✅ 2차: location_type까지 제거해서 category 살리기
                q_fix2 = drop_keys(q0, "location_type", "locationType", "location_query", "locationQuery")
                c3 = await _try("L0-guard(locationType 제거, category 유지)", q_fix2, 2)
                if c3:
                    return c3

            return cands

        # -----------------------
        # 2) relax plan
        # -----------------------
        if conf >= 0.90:
            if explicit_loc:
                # ✅ 장소가 명시된 경우: locationQuery는 최대한 유지하고 다른 것부터 뺀다
                plans = [
                    ("L1 vibe 제거", ("vibe",)),
                    ("L2 timeSlot 제거", ("time_slot", "timeSlot")),
                    ("L3 subcategory 제거", ("subcategory",)),
                    ("L4 keywords 제거", ("keywords",)),
                    ("L5 locationQuery 제거", ("location_query", "locationQuery")),  # ✅ 뒤로
                    ("L6 category 제거", ("category",)),
                ]
            else:
                plans = [
                    ("L1 locationQuery 제거", ("location_query", "locationQuery")),
                    ("L2 vibe 제거", ("vibe",)),
                    ("L3 timeSlot 제거", ("time_slot", "timeSlot")),
                    ("L4 subcategory 제거", ("subcategory",)),
                    ("L5 keywords 제거", ("keywords",)),
                    ("L6 category 제거", ("category",)),
                ]
        elif conf >= 0.75:
            if explicit_loc:
                plans = [
                    ("L1 subcategory 제거", ("subcategory",)),
                    ("L2 keywords 제거", ("keywords", "keyword")),
                    ("L3 locationQuery 제거", ("location_query", "locationQuery")),  # ✅ 뒤로
                    ("L4 category 제거", ("category",)),
                ]
            else:
                plans = [
                    ("L1 locationQuery 제거", ("location_query", "locationQuery")),
                    ("L2 subcategory 제거", ("subcategory",)),
                    ("L3 keywords 제거", ("keywords", "keyword")),
                    ("L4 category 제거", ("category",)),
                ]
        else:
            if explicit_loc:
                plans = [
                    ("L1 keywords 제거", ("keywords", "keyword")),
                    ("L2 subcategory 제거", ("subcategory",)),
                    ("L3 locationQuery 제거", ("location_query", "locationQuery")),  # ✅ 뒤로
                    ("L4 category 제거", ("category",)),
                ]
            else:
                plans = [
                    ("L1 locationQuery 제거", ("location_query", "locationQuery")),
                    ("L2 keywords 제거", ("keywords", "keyword")),
                    ("L3 subcategory 제거", ("subcategory",)),
                    ("L4 category 제거", ("category",)),
                ]
        # -----------------------
        # 3) relax 순차 수행
        # -----------------------
        current = dict(q0)
        level = 1
        for label, keys in plans:
            qn = drop_keys(current, *keys)
            cands = await _try(label, qn, level)

            if cands:
                # category 가드
                if base_cat and all((m.get("category") or "").strip() != base_cat for m in cands):
                    q_fix = drop_keys(qn, "location_query", "locationQuery")
                    c2 = await _try(f"{label}-guard(location 제거, category 유지)", q_fix, level + 1)
                    if c2:
                        return c2
                return cands

            current = qn
            level += 1

        logger.warning("🔥 [RELAX_END] 모든 단계 실패 - 빈 리스트 반환")
        return []

    def _normalize_query_taxonomy(self, q: dict) -> dict:
        """
        너희 DB 카테고리 체계 기준으로 category/subcategory 교정.
        categories = ['스포츠','맛집','카페','문화예술','스터디','취미활동','소셜']
        """
        VALID_CATS = {"스포츠", "맛집", "카페", "문화예술", "스터디", "취미활동", "소셜"}

        SUB_TO_CAT = {
            # 스포츠
            "러닝": "스포츠", "축구": "스포츠", "배드민턴": "스포츠", "등산": "스포츠",
            "요가": "스포츠", "사이클링": "스포츠", "클라이밍": "스포츠",

            # 맛집
            "한식": "맛집", "중식": "맛집", "일식": "맛집", "양식": "맛집",
            "이자카야": "맛집", "파인다이닝": "맛집",

            # 카페
            "카페투어": "카페", "브런치": "카페", "디저트": "카페", "베이커리": "카페", "티하우스": "카페",

            # 문화예술
            "전시회": "문화예술", "공연": "문화예술", "갤러리": "문화예술", "공방체험": "문화예술",
            "사진촬영": "문화예술", "버스킹": "문화예술",

            # 스터디
            "영어회화": "스터디", "독서토론": "스터디", "코딩": "스터디",
            "재테크": "스터디", "자격증": "스터디", "세미나": "스터디",

            # 취미활동
            "그림": "취미활동", "베이킹": "취미활동", "쿠킹": "취미활동",
            "플라워": "취미활동", "캘리그라피": "취미활동", "댄스": "취미활동",

            # 소셜
            "보드게임": "소셜", "방탈출": "소셜", "볼링": "소셜",
            "당구": "소셜", "노래방": "소셜", "와인바": "소셜",
        }

        qq = dict(q)

        cat = (qq.get("category") or "").strip()
        sub = (qq.get("subcategory") or "").strip()

        # 1) subcategory가 있으면 그걸 최우선으로 category 교정
        if sub:
            mapped = SUB_TO_CAT.get(sub)
            if mapped:
                qq["category"] = mapped
            else:
                qq.pop("subcategory", None)  # category는 유지

        # 2) category 유효성 체크
        cat2 = (qq.get("category") or "").strip()
        if cat2 and cat2 not in VALID_CATS:
            # 이상한 category(예: '소셜'로 잘못 찍힌 '스포츠' 등) 들어오면 제거
            qq.pop("category", None)

        return qq

    def _extract_query_terms(self, user_prompt: str, parsed_query: dict) -> list[str]:
        p = (user_prompt or "").strip().lower()
        if not p:
            return []

        # ✅ query_terms에 넣으면 오히려 랭킹을 망치는 '메타 단어' (hit=0 → -12 패널티 방지)
        QUERY_TERM_STOP: Set[str] = {
            "실내", "실외", "야외", "밖", "인도어", "아웃도어",
            "즐겁게", "즐거운", "재밌게", "재밌는", "신나게", "신나는",
            "편하게", "편안하게", "여유롭게", "조용히", "힐링", "차분하게",
            "가볍게", "적당히", "그냥", "아무거나", "추천",
         }

        terms = []

        # ✅ (추가) 붙어써도 잡히는 트리거
        TRIGGERS = ["사진", "촬영", "포토", "카메라", "필카", "스냅"]
        for t in TRIGGERS:
            if t in p and t not in terms:
                terms.append(t)

        # ✅ 1) SYN_MAP 스캔: key가 문장에 포함되면 terms 확장
        for k, syns in self.SYN_MAP.items():
            if k in p:
                for t in syns:
                    t2 = str(t).strip().lower()
                    if t2 and t2 not in QUERY_TERM_STOP and t2 not in terms:
                        terms.append(t2)

        # ✅ 2) 그래도 비었으면 기존 토크나이징 fallback
        if not terms:
            toks = re.split(r"[\s,./!?()\-]+", p)
            toks = [self._normalize_term(t) for t in toks]
            toks = [t for t in toks if t and t not in self.PROMPT_STOP and len(t) >= 2]
            for t in toks:
                if t in QUERY_TERM_STOP:
                    continue
                if t not in terms:
                    terms.append(t)

        # 마지막 한 번 더 안전하게 필터
        terms = [t for t in terms if t and t not in QUERY_TERM_STOP]
        return terms[:5]

    # -------------------------
    # Main pipeline
    # -------------------------
    """
    get_ai_recommendations() 수정 버전
    NoneType 에러 수정 - fallback 로직 정리
    """

    # AIRecommendationService.py의 get_ai_recommendations() 메서드 수정

    async def get_ai_recommendations(self, user_prompt: str, user_id: int, top_n: int = 5) -> Dict:
        rid = str(uuid.uuid4())[:8]
        logger.info(f"[RID={rid}] 🔍 AI 검색 요청: user_id={user_id}, prompt='{user_prompt}'")

        try:
            # Step 1: GPT 파싱
            logger.info(f"[Step 1] GPT 프롬프트 파싱: {user_prompt}")
            parsed_query = await self.gpt_service.parse_search_query(user_prompt)

            # Taxonomy 교정
            parsed_query = self._normalize_query_taxonomy(parsed_query)
            parsed_query = self._post_fix(user_prompt, parsed_query)
            parsed_query = self._guard_category_by_evidence(user_prompt, parsed_query)
            parsed_query = self._apply_vibe_prior(parsed_query)
            parsed_query["vibe"] = self._normalize_vibe(parsed_query.get("vibe"))

            # Step 2: 사용자 컨텍스트
            logger.info(f"[Step 2] 사용자 컨텍스트 조회: user_id={user_id}")
            user_context = await self._get_user_context(user_id)
            logger.info(f"[CTX] lat={user_context.get('latitude')} lng={user_context.get('longitude')}")

            # ✅ 정보 부족 체크
            kw = parsed_query.get("keywords") or []
            conf = float(parsed_query.get("confidence", 0) or 0)
            cat = parsed_query.get("category")
            sub = parsed_query.get("subcategory")
            vibe = parsed_query.get("vibe")
            ts = parsed_query.get("time_slot")
            loc_q = parsed_query.get("location_query")

            # ✅ 초애매 케이스: SVD + Clarification 함께 제공
            if conf < 0.6 and len(kw) == 0 and not cat and not sub and not vibe and not ts and not loc_q:
                logger.warning(f"⚠️ 초애매 검색어 감지 (conf={conf:.2f}): '{user_prompt}' → SVD fallback + clarification")

                # SVD 기반 추천 5개
                svd_data = await self._fallback_svd_recommendation(
                    user_id, user_prompt, parsed_query, top_n, user_context
                )

                # Clarification 카드 1개 추가
                clarification_card = self._make_clarification_card(user_prompt, parsed_query, user_context)

                # ✅ SVD 추천 5개 + clarification 1개 = 총 6개
                recommendations = svd_data.get("recommendations", [])[:top_n]
                recommendations.append(clarification_card)

                return {
                    "user_prompt": user_prompt,
                    "parsed_query": parsed_query,
                    "total_candidates": svd_data.get("total_candidates", 0),
                    "recommendations": recommendations,  # ✅ 6개
                    "search_trace": {
                        "steps": [],
                        "final_level": 0,
                        "final_label": "SVD_FALLBACK_WITH_CLARIFY",
                        "fallback": True
                    }
                }

            # Step 3: 쿼리 보강
            enriched_query = await self.gpt_service.enrich_with_user_context(parsed_query, user_context)

            # Step 4: 검색
            trace_steps: list = []
            base_query = self._pre_relax_query_by_conf(enriched_query)

            # ✅ 디버깅 로그
            logger.info(f"🔥🔥🔥 [DEBUG] base_query 확인: {base_query}")
            logger.info(f"🔥🔥🔥 [DEBUG] _search_with_relaxation 호출 직전!")

            candidate_meetings = await self._search_with_relaxation(base_query, user_context, trace_steps,
                                                                    user_prompt)  # ✅ 추가

            # ✅ 여기 추가!
            logger.info(f"🔥🔥🔥 [DEBUG] _search_with_relaxation 완료!")
            logger.info(f"🔥🔥🔥 [DEBUG] candidate_meetings 개수: {len(candidate_meetings) if candidate_meetings else 0}")

            # ✅ 검색 결과 없으면 SVD fallback
            if not candidate_meetings:
                logger.warning("⚠️ 검색 결과 없음 - SVD 기반 추천으로 대체")
                data = await self._fallback_svd_recommendation(user_id, user_prompt, parsed_query, top_n, user_context)

                # fallback도 intent 보정
                intent = self._detect_intent(user_prompt, enriched_query)

                for rec in data.get("recommendations", []):
                    adjustment = self._apply_intent_adjustment(intent, rec, enriched_query)
                    new_score = rec.get("match_score", 0) + adjustment
                    rec["match_score"] = int(max(0, min(100, new_score)))
                    rec["intent"] = intent

                data["search_trace"] = {
                    "steps": trace_steps,
                    "final_level": trace_steps[-1]["level"] if trace_steps else 0,
                    "final_label": trace_steps[-1]["label"] if trace_steps else "L0 원본",
                    "fallback": True
                }
                return data

            query_terms = self._extract_query_terms(user_prompt, parsed_query)
            logger.info(f"[QUERY_TERMS] prompt='{user_prompt}' -> terms={query_terms}")

            # Step 5: AI 점수 계산
            logger.info(f"[Step 5] AI 점수 계산: {len(candidate_meetings)}개 모임")

            intent = self._detect_intent(user_prompt, enriched_query)

            scored_meetings = await self._score_meetings(
                user_id, user_context, candidate_meetings, enriched_query, intent,
                user_prompt=user_prompt,
                query_terms=query_terms
            )

            # ✅ intent 보정 적용 + 계층별 상한
            n_total = len(scored_meetings)

            for m in scored_meetings:
                m["intent"] = intent

            # Step 6: 상위 N개 선택
            sorted_all = sorted(scored_meetings, key=lambda x: x["match_score"], reverse=True)

            # query-hit 판정 (query_terms 기준)
            def is_query_hit(rec: dict) -> bool:
                hay = f"{(rec.get('title') or '')} {(rec.get('subcategory') or '')} {(rec.get('category') or '')}".lower()
                for t in (query_terms or []):
                    if t and t.lower() in hay:
                        return True
                return False

            hits = [r for r in sorted_all if is_query_hit(r)]
            others = [r for r in sorted_all if not is_query_hit(r)]

            # ✅ B안: top_n 중 최소 2개는 hit로 채우고, 나머지는 점수순 추천으로 채움
            must = 2 if top_n >= 4 else 1
            picked = []

            picked.extend(hits[:must])
            picked.extend([r for r in others if r not in picked])

            top_recommendations = picked[:top_n]

            # Step 7: Reasoning
            for rec in top_recommendations:
                if (not parsed_query.get("keywords")) or parsed_query.get("confidence", 0) < 0.6:
                    rec["reasoning"] = self._fallback_reasoning(rec, parsed_query)
                else:
                    rec["reasoning"] = await self._generate_reasoning(user_context, rec, parsed_query)

            logger.info("🏁 TOP=%s", [
                (r.get("meeting_id"), r.get("title"), r.get("category"), r.get("subcategory"))
                for r in top_recommendations
            ])

            return {
                "user_prompt": user_prompt,
                "parsed_query": parsed_query,
                "total_candidates": len(candidate_meetings),
                "recommendations": top_recommendations,
                "search_trace": {
                    "steps": trace_steps,
                    "final_level": trace_steps[-1]["level"] if trace_steps else 0,
                    "final_label": trace_steps[-1]["label"] if trace_steps else "L0 원본",
                    "fallback": False
                }
            }

        except Exception as e:
            logger.error(f"❌ AI 추천 실패: {e}", exc_info=True)  # ✅ exc_info 추가로 스택트레이스 출력
            raise

    # -------------------------
    # Scoring (너 코드 거의 그대로)
    # -------------------------
    # AIRecommendationService 안에 있는 _score_meetings()를 이 버전으로 교체하면 됨.
    # - /search 랭킹: ranker로 match_score 만들고 정렬
    # - UI용 predicted_rating: (선택) regressor로 같이 넣어줌
    # - 기존 key_points 유지
    """
    완전한 _score_meetings() 메서드
    1개 후보 절대 상한 78%
    """

    """
    _score_meetings() 최종 수정 버전
    100% 절대 방지 - 동적 상한 대폭 하향
    """

    # AIRecommendationService.py의 _score_meetings() 메서드 수정

    # AIRecommendationService.py의 _score_meetings() 메서드 수정

    async def _score_meetings(
            self,
            user_id: int,
            user_context: dict,
            candidate_meetings: list[dict],
            parsed_query: dict,
            intent: str,
            user_prompt: str = "",
            query_terms: Optional[list[str]] = None
    ) -> list[dict]:
        """AI 점수 계산 - 동점 방지 + 차별성 강화"""

        def pick(d: dict, *keys, default=None):
            for k in keys:
                if k in d and d.get(k) is not None:
                    return d.get(k)
            return default

        if not model_loader.ranker or not model_loader.ranker.is_loaded():
            raise RuntimeError("LightGBM Ranker 모델이 로드되지 않았습니다.")
        if not model_loader.feature_builder:
            raise RuntimeError("FeatureBuilder가 로드되지 않았습니다.")

        use_regressor_for_rating = bool(model_loader.regressor and model_loader.regressor.is_loaded())

        conf = float(parsed_query.get("confidence", 0) or 0)

        def dynamic_ceil(n: int, conf: float) -> int:
            """동적 상한 - 후보가 많을수록 낮춤"""
            if n == 1:
                return 73
            elif n == 2:
                return 76
            elif n == 3:
                return 79
            elif n <= 5:
                return 82
            elif n <= 10:
                return 84
            elif n <= 30:  # ✅ 새로 추가
                return 85
            elif n <= 50:
                return 86
            else:
                return 87

        user_time_pref = (
                parsed_query.get("user_time_preference")
                or pick(user_context, "time_preference", "timePreference", default=None)
        )

        user = {
            "lat": pick(user_context, "lat", "latitude", default=None),
            "lng": pick(user_context, "lng", "longitude", default=None),
            "interests": pick(user_context, "interests", default=""),
            "time_preference": self._normalize_timeslot(user_time_pref),
            "user_location_pref": pick(user_context, "user_location_pref", "userLocationPref", default=None),
            "budget_type": self._normalize_budget_for_model(
                pick(user_context, "budget_type", "budgetType", default="value")
            ),
            "user_avg_rating": float(pick(user_context, "user_avg_rating", "userAvgRating", default=3.0)),
            "user_meeting_count": int(pick(user_context, "user_meeting_count", "userMeetingCount", default=0)),
            "user_rating_std": float(pick(user_context, "user_rating_std", "userRatingStd", default=0.5)),
        }

        rows, feats, valid_candidates = [], [], []
        for raw in candidate_meetings:
            try:
                m = self._normalize_meeting(raw)
                feat, x = model_loader.feature_builder.build(user, m)
                rows.append(x[0])
                feats.append(feat)
                valid_candidates.append(m)
            except Exception as e:
                logger.warning(f"⚠️ feature build 실패 meeting_id={raw.get('meeting_id')}: {e}")
                continue

        if not rows:
            return []

        X = np.vstack(rows)
        rank_raw = model_loader.ranker.predict(X)
        raw_list = [float(v) for v in rank_raw]
        n = len(raw_list)

        ceil = dynamic_ceil(n, conf)
        logger.info(f"[SCORE] n={n}, conf={conf:.2f}, ceil={ceil}")

        rating_list = None
        if use_regressor_for_rating:
            try:
                preds = model_loader.regressor.predict(X)
                rating_list = [float(v) for v in preds]
            except Exception as e:
                logger.warning(f"⚠️ regressor rating 예측 실패: {e}")

        match_scores = [55] * n

        if n == 1:
            s = raw_list[0]
            base_score = 1.0 / (1.0 + math.exp(-s * 0.25))
            base_score = 58 + base_score * 15
            conf_bonus = conf * 3
            ms = base_score + conf_bonus
            ms = max(60, min(73, ms))
            match_scores[0] = int(round(ms))
            logger.info(
                f"[SCORE_1개] raw={s:.3f}, base={base_score:.1f}, conf={conf:.2f}, bonus={conf_bonus:.1f}, final={match_scores[0]}")

        elif n <= 10:
            base = [78, 74, 70, 66, 63, 60, 57, 55, 53, 51]
            order = sorted(range(n), key=lambda i: raw_list[i], reverse=True)

            top = raw_list[order[0]]
            bottom = raw_list[order[-1]]
            span = (top - bottom) if (top - bottom) != 0 else 1.0

            for rank, i in enumerate(order):
                b = base[rank] if rank < len(base) else 52
                t = (raw_list[i] - bottom) / span
                adj = (t - 0.5) * 6.0
                ms = b + adj
                ms = max(50, min(82, ms))
                ms = min(ms, ceil)
                match_scores[i] = int(round(ms))

        else:
            # ✅ 핵심 개선: 동점 방지 로직 강화
            sorted_vals = sorted(raw_list)

            def percentile_midrank(x: float) -> float:
                lt = sum(1 for v in sorted_vals if v < x)
                eq = sum(1 for v in sorted_vals if v == x)
                p = (lt + 0.5 * eq) / n
                eps = 0.5 / n
                if p < eps:
                    p = eps
                if p > 1 - eps:
                    p = 1 - eps
                return p

            # ✅ 1. meeting_id 기반 deterministic noise 추가
            for i, s in enumerate(raw_list):
                meeting_id = valid_candidates[i].get("meeting_id", i)

                p = percentile_midrank(float(s))

                # ✅ 2. meeting_id 기반 고유 noise (deterministic)
                id_noise = (meeting_id % 1000) * 0.00001  # 0.00000 ~ 0.00999

                # ✅ 3. 순서 기반 noise (동일 percentile 구분)
                order_noise = i * 0.0001  # 0.0000, 0.0001, 0.0002...

                p_adjusted = p + id_noise + order_noise
                p_adjusted = max(0.0, min(1.0, p_adjusted))

                # ✅ 4. stretch 강화 (상위권 더 벌림)
                p_final = max(0.0, min(1.0, 0.5 + (p_adjusted - 0.5) * 1.6))

                # ✅ 5. gamma 강화 (상위권 드라마틱하게)
                ms = match_from_percentile(p_final, floor=46, ceil=ceil, gamma=1.6)
                ms = min(ms, ceil)
                match_scores[i] = int(ms)

        # ✅ 6. 보정 로직 (기존 유지)
        results = []
        for idx, (m, feat, s) in enumerate(zip(valid_candidates, feats, raw_list)):
            ms = int(match_scores[idx])

            # 시간대 매칭
            requested_ts = parsed_query.get("time_slot") or parsed_query.get("timeSlot")
            meeting_ts = m.get("time_slot")

            if requested_ts and meeting_ts:
                req_normalized = self._normalize_timeslot(requested_ts)
                meet_normalized = self._normalize_timeslot(meeting_ts)

                if req_normalized == meet_normalized:
                    ms += 10
                elif self._is_adjacent_timeslot(req_normalized, meet_normalized):
                    ms += 2
                else:
                    ms -= 15

            # location_query 보정
            location_query = parsed_query.get("location_query")
            if location_query:
                meeting_loc = str(m.get("location_name", "")).lower()
                query_loc = str(location_query).lower()
                query_keyword = query_loc.replace("근처", "").replace("주변", "").replace("집", "").strip()

                if query_keyword and query_keyword in meeting_loc:
                    ms += 20
                elif any(keyword in meeting_loc for keyword in ["구", "역", "동"]):
                    ms -= 5

            def _query_match_bonus(m: dict, q_terms: list[str]) -> float:
                if not q_terms:
                    return 0.0

                title = (m.get("title") or "").lower()
                sub = (m.get("subcategory") or "").lower()
                cat = (m.get("category") or "").lower()
                loc = (m.get("location_name") or "").lower()

                hay = f"{title} {sub} {cat} {loc}"

                hit = sum(1 for t in q_terms if t and t.lower() in hay)

                # ✅ 핵심: 보너스 더 세게!
                if hit >= 2:
                    return 30.0  # 25 → 30
                if hit == 1:
                    return 22.0  # 18 → 22

                # 완전 무관이면 패널티 강화
                return -12.0  # -6 → -12

            requested_sub = (parsed_query.get("subcategory") or "").strip()
            if requested_sub and conf >= 0.7:
                meet_sub = (m.get("subcategory") or "").strip()
                if meet_sub == requested_sub:
                    ms += 18  # ✅ 축구면 크게 가산
                else:
                    ms -= 25  # ✅ 축구 아니면 크게 감점 (러닝 1위 방지 핵심)

            # keyword 힌트
            # --- query terms bonus (B안 핵심) ---
            q_terms = query_terms or []
            ms += _query_match_bonus(m, q_terms)

            keywords = clean_keywords(parsed_query.get("keywords") or [])
            if keywords:
                text = (
                    f"{m.get('title', '')} {m.get('location_name', '')} {m.get('location_address', '')} "
                    f"{m.get('subcategory', '')} {m.get('vibe', '')}"
                ).lower()

                hit = sum(1 for k in keywords if k in text)
                ms += min(hit * 2, 5)
                # ✅ (추가) intent 보정은 여기서! (get_ai_recommendations에서 제거했으니까)

            ms += float(self._apply_intent_adjustment(intent, m, parsed_query))

            # ✅ (추가) tie-break: meeting_id 기반 deterministic jitter
            # - 같은 점수(또는 같은 라운딩 결과) 몰림을 방지
            mid = int(m.get("meeting_id") or 0)
            ms += ((mid % 97) - 48) * 0.02  # 약 -0.96 ~ +0.98

            # ✅ 최종 캡은 여기서 1번만
            ms = min(ms, float(ceil))
            ms = max(0.0, min(100.0, ms))

            ms_int = int(round(ms))

            # 매칭 레벨
            if ms_int >= 85:
                lvl = "VERY_HIGH"
            elif ms_int >= 78:
                lvl = "HIGH"
            elif ms_int >= 65:
                lvl = "MEDIUM"
            else:
                lvl = "LOW"

            item = {
                **m,
                "rank_raw": round(float(s), 4),
                "match_score": ms_int,
                "meetingId": m.get("meeting_id"),
                "meeting_id": m.get("meeting_id"),
                "match_level": lvl,
                "key_points": self._build_key_points_from_feat(feat),
                "score_meta": {
                    "n_candidates": n,
                    "confidence": round(conf, 3),
                    "ceil": int(ceil),
                }
            }

            if rating_list is not None:
                item["predicted_rating"] = round(float(rating_list[idx]), 3)

            results.append(item)

        results.sort(key=lambda x: x.get("match_score", 0), reverse=True)
        return results

    def _build_key_points_from_feat(self, feat: dict) -> list[str]:
        points = []
        if feat.get("distance_km", 999) <= 3:
            points.append(f"가까운 거리({feat['distance_km']:.1f}km)")
        if feat.get("time_match") == 1.0:
            points.append("선호 시간대 일치")
        if feat.get("location_type_match") == 1.0:
            points.append("실내/야외 선호 일치")
        if feat.get("cost_match_score", 0) >= 0.7:
            points.append("예산에 잘 맞음")
        if feat.get("interest_match_score", 0) >= 0.5:
            points.append("관심사 매칭")
        return points[:3]

    # -------------------------
    # User context / Reasoning / Fallback / Batch
    # -------------------------
    async def _get_user_context(self, user_id: int) -> Dict:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(f"{self.spring_boot_url}/api/users/{user_id}/context")
                response.raise_for_status()
                ctx = response.json()
                logger.info(f"✅ 사용자 컨텍스트 조회 성공: userId={user_id}")
                return ctx
        except Exception as e:
            logger.error(f"❌ 사용자 컨텍스트 조회 실패: {e}")
            return {
                "user_id": user_id,
                "latitude": 37.5665,
                "longitude": 126.9780,
                "interests": "",
                "time_preference": "",
                "budget_type": "VALUE",
                "user_avg_rating": 0.0,
                "user_meeting_count": 0,
                "user_rating_std": 0.0
            }

    async def _generate_reasoning(self, user_context: Dict, meeting: Dict, parsed_query: Dict) -> str:
        """
        GPT를 활용한 동적이고 공감 가능한 추천 이유 생성
        """
        try:
            # ✅ None 체크를 포함한 안전한 값 추출
            user_prompt_keywords = " ".join(parsed_query.get("keywords", []))
            category = meeting.get("category") or ""
            subcategory = meeting.get("subcategory") or ""
            location = meeting.get("location_name") or "미정"
            distance = meeting.get("distance_km") if meeting.get("distance_km") is not None else 0
            cost = meeting.get("expected_cost") if meeting.get("expected_cost") is not None else 0
            participants = meeting.get("current_participants") if meeting.get("current_participants") is not None else 0
            max_participants = meeting.get("max_participants") if meeting.get("max_participants") is not None else 10
            vibe = meeting.get("vibe") or ""

            # ✅ GPT 프롬프트
            prompt = f"""
    당신은 친근하고 공감 능력이 뛰어난 AI 추천 어시스턴트입니다.
    사용자의 상황과 감정을 이해하고, 왜 이 모임이 딱 맞는지 자연스럽게 설명하세요.

    **사용자 키워드:** {user_prompt_keywords}

    **추천 모임:**
    - 제목: {meeting.get('title', '제목 없음')}
    - 카테고리: {category} - {subcategory}
    - 분위기: {vibe}
    - 위치: {location} ({distance:.1f}km)
    - 비용: {cost:,}원
    - 참가자: {participants}/{max_participants}명

    **작성 규칙:**
    1. 사용자의 감정/상황에 공감하는 한 문장으로 시작
    2. 이 모임의 매력 포인트를 2-3문장으로 설명
    3. 친근하고 따뜻한 말투 (존댓말 + 반말 섞어서)
    4. 이모지 1-2개만 사용 (과하지 않게)
    5. 총 3-4문장, 80-120자 이내

    **좋은 예시:**
    - "오늘 힘드셨죠? 😊 조용한 카페에서 브런치 먹으면서 머리 좀 식히는 건 어떨까요? 홍대 카페는 분위기도 아늑하고 2.3km 거리라 부담 없어요!"
    - "딱 적당히 몸 풀고 싶을 때네요! 🏃 한강에서 5km 가볍게 뛰면서 같이 달리는 사람들이랑 수다도 떨면 스트레스가 확 풀려요."
    - "기분전환엔 전시회만 한 게 없죠! 🎨 성수동 갤러리는 무료 입장이고 작품 보면서 감성 충전하기 딱이에요."

    **이제 작성하세요 (추천 이유만, 다른 말 없이):**
    """

            # # ✅ await 제거 - 동기 호출
            # response = self.gpt_service.client.chat.completions.create(
            #     model="gpt-4o-mini",
            #     messages=[
            #
            #     ],
            #     temperature=0.7,
            #     max_tokens=200
            # )
            #
            # reasoning = response.choices[0].message.content.strip()
            # logger.info(f"✅ GPT reasoning 생성: {reasoning[:50]}...")
            # return reasoning

            def _call():
                return self.gpt_service.client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[{"role": "system", "content": "당신은 공감 능력이 뛰어난 AI 추천 어시스턴트입니다."},
                    {"role": "user", "content": prompt}],
                    temperature=0.7,
                    max_tokens=200
                )

            response = await anyio.to_thread.run_sync(_call)
            reasoning = response.choices[0].message.content.strip()
            return reasoning

        except Exception as e:
            logger.error(f"⚠️ GPT reasoning 실패, fallback 사용: {e}")
            return self._fallback_reasoning(meeting, parsed_query)

    def _fallback_reasoning(self, meeting: Dict, parsed_query: Dict) -> str:
        """GPT 실패 시 템플릿 기반 reasoning"""

        # ✅ None 체크를 포함한 안전한 값 추출
        category = meeting.get("category") or ""
        subcategory = meeting.get("subcategory") or ""
        location = meeting.get("location_name") or "미정"
        distance = meeting.get("distance_km") if meeting.get("distance_km") is not None else 0
        cost = meeting.get("expected_cost") if meeting.get("expected_cost") is not None else 0
        participants = meeting.get("current_participants") if meeting.get("current_participants") is not None else 0

        templates = {
            "카페": [
                f"조용한 {location}에서 힐링 타임 어때요? ☕ {distance:.1f}km 거리라 부담 없이 다녀올 수 있어요!",
                f"카페에서 브런치 먹으면서 여유롭게 쉬는 건 어떨까요? 현재 {participants}명이 참여 중이라 편안한 분위기예요.",
            ],
            "스포츠": [
                f"가볍게 몸 풀면서 스트레스 날려버리기 좋아요! 🏃 {location}에서 함께 운동하면 더 재밌어요.",
                f"적당히 땀 흘리면서 기분전환하기 딱! {participants}명이랑 같이 하면 동기부여도 되고요.",
            ],
            "맛집": [
                f"맛있는 거 먹으면서 힐링하는 게 최고죠! 🍽️ {subcategory} 좋아하시면 강추예요.",
                f"{cost:,}원으로 맛있는 음식 먹으면서 스트레스 풀 수 있어요!",
            ],
            "문화예술": [
                f"감성 충전이 필요할 때! 🎨 {location}에서 여유롭게 예술 감상하면 마음이 편안해져요.",
                f"조용히 전시 보면서 머리 비우기 딱 좋은 모임이에요. {distance:.1f}km 거리라 가깝고요.",
            ],
            "소셜": [
                f"가볍게 놀면서 기분전환! 🎮 {subcategory} 하면서 웃다 보면 스트레스가 확 풀려요.",
                f"{participants}명이랑 함께하는 {subcategory} 모임! 부담 없이 즐기기 좋아요.",
            ],
        }

        import random
        options = templates.get(category, [f"이 모임은 당신의 취향과 잘 맞을 것 같아요! 😊 {location}에서 {distance:.1f}km 거리예요."])
        return random.choice(options)

    async def _fallback_svd_recommendation(
            self,
            user_id: int,
            user_prompt: str,
            parsed_query: Dict,
            top_n: int,
            user_context: Dict,  # ✅ 추가
    ) -> Dict:
        if not model_loader.svd or not model_loader.svd.is_loaded():
            raise RuntimeError("SVD 모델 로드되지 않음")

        svd_recommendations = await model_loader.svd.recommend(user_id=user_id, top_n=top_n * 2)
        meeting_ids = [int(mid) for mid, _ in svd_recommendations]
        meetings = await self._get_meetings_by_ids(meeting_ids)

        # ✅ fallback에서도 유저좌표 기반 거리 계산 주입
        meetings = self._inject_distance_km(meetings, user_context)

        scored = []
        for meeting in meetings:
            # meeting_id 키 혼용 대응
            m_id = meeting.get("meeting_id") or meeting.get("meetingId")
            svd_score = next((score for mid, score in svd_recommendations if int(mid) == int(m_id)), 3.5)

            scored.append({
                **meeting,
                "match_score": min(100, int(float(svd_score) * 20)),
                "predicted_rating": round(float(svd_score), 1),
                "svd_score": round(float(svd_score), 2),
                "key_points": ["SVD 협업 필터링 기반 추천"],
                "reasoning": "과거 참여 이력을 바탕으로 추천된 모임입니다."
            })

        return {
            "user_prompt": user_prompt,
            "parsed_query": parsed_query,
            "total_candidates": len(scored),
            "recommendations": scored[:top_n],
            "fallback": True
        }

    async def _get_meetings_by_ids(self, meeting_ids: List[int]) -> List[Dict]:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    f"{self.spring_boot_url}/api/meetings/batch",
                    json={"meetingIds": meeting_ids}
                )
            if response.status_code == 200:
                return response.json().get("meetings", [])
            return []
        except Exception as e:
            logger.error(f"⚠️ 모임 정보 조회 실패: {e}")
            return []

    def _normalize_meeting(self, m: dict) -> dict:
        title = (m.get("title") or "").strip()
        sub = (m.get("subcategory") or "").strip()
        cat = (m.get("category") or "").strip()

        # ✅ title 기반 스포츠 subcategory 자동 교정 (데이터 오염 방어)
        if cat == "스포츠" and title:
            t = title.lower()
            if "러닝" in t or "달리기" in t:
                sub = "러닝"
            elif "축구" in t or "풋살" in t:
                sub = "축구"
            elif "배드민턴" in t:
                sub = "배드민턴"
            elif "클라이밍" in t:
                sub = "클라이밍"

        return {
            "meeting_id": m.get("meeting_id") or m.get("meetingId"),
            "lat": m.get("latitude") or m.get("lat"),
            "lng": m.get("longitude") or m.get("lng"),
            "category": cat or "",
            "subcategory": sub or "",  # ✅ 여기 sub가 교정된 값
            "time_slot": self._normalize_timeslot(m.get("time_slot") or m.get("timeSlot")),
            "meeting_location_type": self._normalize_location_type(m.get("location_type") or m.get("locationType")),
            "vibe": m.get("vibe", "") or "",
            "meeting_participant_count": m.get("current_participants") or m.get("currentParticipants") or 0,
            "expected_cost": m.get("expected_cost") or m.get("expectedCost") or 0,
            "meeting_avg_rating": m.get("avg_rating") or m.get("avgRating") or 0.0,
            "meeting_rating_count": m.get("rating_count") or m.get("ratingCount") or 0,
            "distance_km": m.get("distance_km") or m.get("distanceKm"),
            "title": m.get("title"),
            "image_url": m.get("image_url") or m.get("imageUrl"),
            "location_name": m.get("location_name") or m.get("locationName"),
            "location_address": m.get("location_address") or m.get("locationAddress"),
            "meeting_time": m.get("meeting_time") or m.get("meetingTime"),
            "max_participants": m.get("max_participants") or m.get("maxParticipants") or 10,
            "current_participants": m.get("current_participants") or m.get("currentParticipants") or 0,
        }

    def _make_clarification_card(self, user_prompt: str, parsed_query: dict, user_context: dict) -> dict:
        # 유저 위치가 있으면 “집 근처” 같은 문구도 가능
        # (여기서는 단순 텍스트로만)
        return {
            "meeting_id": -1,
            "title": "어떤 걸 하고 싶은지 한 가지만 더 알려줘요 🙂",
            "category": "SYSTEM",
            "subcategory": "CLARIFY",
            "location_name": "추천을 위해 추가 정보가 필요해요",
            "image_url": None,

            "match_score": 0,
            "match_level": "INFO",
            "predicted_rating": None,

            "key_points": [
                "예: 집에서 요리 같이 하기",
                "예: 집에서 스터디/공부",
                "예: 집 근처 카페에서 브런치",
            ],
            "reasoning": (
                f"지금 입력은 '{user_prompt}'라서 추천 범위를 좁히기 어려워요. "
                "원하는 활동(요리/스터디/영화/운동 등)이나 지역(홍대/성수 등) 중 1개만 더 말해줘요!"
            ),
            "is_clarification": True,
            "intent": "NEUTRAL",
        }

    def _pre_relax_query_by_conf(self, q: dict) -> dict:
        """
        L0 자체를 confidence 기반으로 완화
        ✅ category는 0.5 이상이면 유지하도록 완화
        """
        conf = float(q.get("confidence", 0) or 0)
        qq = dict(q)

        # ✅ 0.5 → 0.5로 하향 (GPT가 0.5~0.6으로 주는 경우 많음)
        if conf < 0.5:  # ← 0.65 → 0.5
            qq.pop("category", None)

        # subcategory는 0.7 미만이면 제거 (기존 유지)
        if conf < 0.7:
            qq.pop("subcategory", None)

        # vibe-only 검색(카테고리/키워드 없음)에서는 vibe를 유지해야 함
        if conf < 0.65:
            if qq.get("category") or (qq.get("keywords") and len(qq.get("keywords")) > 0):
                qq.pop("vibe", None)
            # else: vibe만 있는 케이스는 유지

        # time_slot은 0.9 이상일 때만 (기존 유지)
        # if conf < 0.9:
        #     qq.pop("time_slot", None)
        #     qq.pop("timeSlot", None)

        return qq

    # -------------------------
    # Distance utils (fallback에서도 거리 계산)
    # -------------------------
    def _haversine_km(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """두 좌표 간 거리(km)."""
        R = 6371.0
        p1, p2 = math.radians(lat1), math.radians(lat2)
        d1 = math.radians(lat2 - lat1)
        d2 = math.radians(lon2 - lon1)
        a = (math.sin(d1 / 2) ** 2) + math.cos(p1) * math.cos(p2) * (math.sin(d2 / 2) ** 2)
        return 2 * R * math.asin(math.sqrt(a))

    def _inject_distance_km(self, meetings: List[Dict], user_ctx: Dict) -> List[Dict]:
        """meetings에 distance_km이 없으면 유저좌표로 계산해서 넣어줌."""

        u_lat = user_ctx.get("latitude") or user_ctx.get("lat")
        u_lng = user_ctx.get("longitude") or user_ctx.get("lng")

        if u_lat is None or u_lng is None:
            return meetings

        out = []
        for m in meetings or []:
            # 이미 spring에서 내려준 distance가 있으면 유지
            if m.get("distance_km") is not None or m.get("distanceKm") is not None:
                out.append(m)
                continue

            m_lat = m.get("latitude") or m.get("lat")
            m_lng = m.get("longitude") or m.get("lng")

            if m_lat is None or m_lng is None:
                out.append(m)
                continue

            try:
                d = self._haversine_km(float(u_lat), float(u_lng), float(m_lat), float(m_lng))
                mm = dict(m)
                mm["distance_km"] = round(float(d), 3)  # UI는 0.1단위로 잘라서 보여주면 됨
                out.append(mm)
            except Exception:
                out.append(m)

        return out

    # def _clean_keywords(self, keywords: Optional[list[str]]) -> list[str]:
    #     if not keywords:
    #         return []
    #
    #     stop = {
    #         # 요청/추임새
    #         "추천", "추천해줘", "추천해주세요", "해줘", "해주세요",
    #         "그냥", "좀", "한번", "같이", "요즘",
    #
    #         # 애매 프롬프트 전용
    #         "갈만한곳", "갈만한", "갈곳", "가볼만한", "어디", "뭐하지", "뭐할까", "심심해",
    #         "회사", "퇴근", "끝나고", "퇴근후", "퇴근하고", "끝나면",
    #
    #         # ✅ 새로 추가: "나가다" 관련 불필요 키워드
    #         "나가고싶다", "나가다", "외출", "싶다", "하고싶다",
    #
    #         # 범용 위치
    #         "근처", "주변", "집", "집근처", "내근처",
    #
    #         # ✅ 카테고리명 (중복 방지)
    #         "소셜", "스포츠", "카페", "맛집", "문화예술", "스터디", "취미활동",
    #     }
    #
    #     cleaned = []
    #     for k in keywords:
    #         if not k:
    #             continue
    #         w = str(k).strip()
    #         w = w.replace(" ", "")
    #         if len(w) < 2:
    #             continue
    #         if w in stop:
    #             continue
    #         cleaned.append(w)
    #
    #     # 중복 제거(순서 유지)
    #     seen = set()
    #     out = []
    #     for w in cleaned:
    #         if w not in seen:
    #             out.append(w)
    #             seen.add(w)
    #     return out

    def _is_ambiguous_prompt(self, user_prompt: str, parsed_query: dict) -> bool:
        text = (user_prompt or "").lower()
        conf = float(parsed_query.get("confidence", 0) or 0)

        ambiguous_phrases = [
            "갈만한곳", "가볼만한", "뭐하지", "뭐할까", "심심", "추천", "아무거나",
            "퇴근", "회사끝", "끝나고", "퇴근후"
        ]

        # 1) confidence 낮고
        if conf <= 0.45:
            # 2) 활동 명사(카페/러닝/전시/보드게임 등)가 없다면 애매로 본다
            has_category = bool(parsed_query.get("category"))
            kws = parsed_query.get("keywords") or []
            # keyword도 의미 없는 것만이면 애매
            if (not has_category) and (len(kws) <= 2 or any(p in text for p in ambiguous_phrases)):
                return True

        # phrase로도 애매 판정
        if any(p in text for p in ambiguous_phrases) and not parsed_query.get("category"):
            return True

        return False


    def _is_near_me_phrase(self, q: str | None) -> bool:
        if not q:
            return False
        s = str(q).strip().lower()
        return ("근처" in s) or ("주변" in s) or ("집" in s) or ("내 근처" in s)

    NEGATION_PATTERNS = [
        r"(말고|빼고|제외|말곤|아니고|말고는|말고요|말고서)",
        r"(말고\s*다른|빼고\s*다른|제외하고)"
    ]

    def _has_exclusion(self, text: str) -> bool:
        if not text:
            return False
        t = text.lower().strip()
        return any(re.search(pat, t) for pat in self.NEGATION_PATTERNS)

    def _excludes_food(self, text: str) -> bool:
        """'먹/식사/밥'이 등장하지만 '말고/제외/빼고'로 부정되는 케이스."""
        t = (text or "").lower()
        if not self._has_exclusion(t):
            return False
        food_words = ["먹", "식사", "밥", "맛집", "음식", "카페", "브런치", "디저트"]
        return any(w in t for w in food_words)

    # def _post_fix(self, user_prompt: str, parsed: dict) -> dict:
    #     """GPT 파싱 후 보정"""
    #     text = user_prompt.lower().strip()
    #
    #     # ✅ 성별 키워드 감지
    #     male_keywords = ["남자", "남성", "남자가", "남성이"]
    #     female_keywords = ["여자", "여성", "여자가", "여성이"]
    #
    #     has_male = any(k in text for k in male_keywords)
    #     has_female = any(k in text for k in female_keywords)
    #
    #     # ✅ 남자 → 스포츠/소셜(당구/볼링) 우선
    #     if has_male and not has_female:
    #         if parsed.get("category") == "소셜":
    #             # 소셜 유지하되, subcategory 힌트
    #             parsed["keywords"] = ["당구", "볼링", "탁구", "축구"]
    #             parsed["confidence"] = max(float(parsed.get("confidence", 0)), 0.7)
    #         elif not parsed.get("category"):
    #             parsed["category"] = "스포츠"
    #             parsed["confidence"] = 0.6
    #
    #         logger.info(f"[POST_FIX] 남자 키워드 감지 → category={parsed.get('category')}, keywords={parsed.get('keywords')}")
    #
    #     # ✅ 여자 → 카페/문화예술/취미활동 우선
    #     elif has_female and not has_male:
    #         if parsed.get("category") == "소셜":
    #             parsed["category"] = "카페"  # 소셜 → 카페로 변경
    #             parsed["vibe"] = "여유로운"
    #             parsed["confidence"] = max(float(parsed.get("confidence", 0)), 0.65)
    #         elif not parsed.get("category"):
    #             parsed["category"] = "카페"
    #             parsed["confidence"] = 0.6
    #
    #         logger.info(f"[POST_FIX] 여자 키워드 감지 → category={parsed.get('category')}")
    #
    #         return parsed
    #
    #     # ✅ [NEW] 사진/촬영 의도 강제
    #     photo_words = ["사진", "촬영", "포토", "카메라", "필카", "스냅", "인생샷"]
    #     if any(w in text for w in photo_words):
    #         parsed["category"] = "문화예술"
    #         parsed["subcategory"] = "사진촬영"  # ← 이게 DB에 있으면 설정
    #         parsed["vibe"] = parsed.get("vibe") or "즐거운"
    #         parsed["confidence"] = max(float(parsed.get("confidence", 0) or 0), 0.75)
    #
    #         logger.info("[POST_FIX] 사진/촬영 감지 → category=문화예술, subcategory=사진촬영")
    #         return parsed
    #
    #     brain_words = ["머리", "머리쓰", "두뇌", "추리", "전략", "퍼즐", "퀴즈", "방탈출", "보드게임"]
    #
    #     if any(w in text for w in brain_words):
    #         parsed["category"] = parsed.get("category") or "소셜"
    #         parsed.setdefault("location_type", "INDOOR")
    #         # subcategory는 확정하지 말고, 키워드로 유도
    #         kws = parsed.get("keywords") or []
    #         kws += ["보드게임", "방탈출", "퍼즐", "추리"]
    #         parsed["keywords"] = list(dict.fromkeys(kws))  # 중복 제거
    #         parsed["vibe"] = parsed.get("vibe") or "즐거운"
    #         parsed["confidence"] = max(float(parsed.get("confidence", 0) or 0), 0.75)
    #         logger.info("[POST_FIX] 머리/두뇌 의도 감지 → keywords 확장(보드게임/방탈출/퍼즐/추리)")
    #         return parsed
    #
    #     # 공놀이: 구체 종목이 아니라서 subcategory 강제 금지
    #     if "공놀이" in text:
    #         parsed["category"] = "스포츠"
    #         parsed.pop("subcategory", None)
    #         # 핵심: 공놀이 -> 종목 키워드로 치환
    #         parsed["keywords"] = ["축구", "풋살", "농구", "배드민턴", "테니스"]
    #         parsed["confidence"] = min(float(parsed.get("confidence", 0) or 0), 0.65)
    #         logger.info("[POST_FIX] 공놀이 감지 → keywords를 구체 종목으로 확장(러닝 눌러주기)")
    #         return parsed
    #
    #     # ✅ [NEW] 댄스/춤 의도 강제
    #     dance_words = ["춤", "댄스", "dance", "kpop", "k-pop", "케이팝", "스트릿", "힙합댄스", "방송댄스"]
    #     if any(w in text for w in dance_words):
    #         parsed["category"] = "취미활동"
    #         parsed["subcategory"] = "댄스"
    #         parsed["vibe"] = parsed.get("vibe") or "즐거운"
    #         parsed["confidence"] = max(float(parsed.get("confidence", 0) or 0), 0.75)
    #
    #         # 보통 댄스는 실내가 많으니 기본값만 살짝
    #         parsed.setdefault("location_type", "INDOOR")
    #
    #         logger.info("[POST_FIX] 춤/댄스 감지 → category=취미활동, subcategory=댄스")
    #         return parsed
    #
    #     hands_on_words = ["손으로", "만들", "만들기", "공방", "체험", "diy", "수공예", "핸드메이드"]
    #     if any(w in text for w in hands_on_words):
    #         parsed["category"] = "취미활동"
    #         parsed["vibe"] = parsed.get("vibe") or "여유로운"
    #         parsed["confidence"] = max(float(parsed.get("confidence", 0) or 0), 0.7)
    #
    #         # subcategory를 확정할 단서가 있으면 지정
    #         if any(w in text for w in ["붓글씨", "캘리"]):
    #             parsed["subcategory"] = "캘리그라피"
    #
    #         logger.info("[POST_FIX] 손으로/공방/DIY 감지 → category=취미활동")
    #         return parsed
    #
    #     # ✅ 0) "먹는거말고" 같은 제외 의도 먼저 처리 (맛집 강제 차단)
    #     if self._excludes_food(text):
    #         # 먹는 건 제외니까, 음식/카페 계열로 가지 않게 막기
    #         if parsed.get("category") in ["맛집", "카페"]:
    #             parsed.pop("category", None)
    #             parsed.pop("subcategory", None)
    #
    #         # 실내를 원하면: 문화예술/취미활동/소셜 쪽으로 유도
    #         # (구체 활동 없으면 문화예술 default가 무난)
    #         parsed.setdefault("location_type", "INDOOR")
    #         if not parsed.get("category"):
    #             parsed["category"] = "문화예술"
    #             parsed["vibe"] = parsed.get("vibe") or "여유로운"
    #
    #         parsed["confidence"] = max(float(parsed.get("confidence", 0) or 0), 0.65)
    #
    #         # keywords에서 음식 관련 제거 (있다면)
    #         kws = parsed.get("keywords") or []
    #         bad = {"먹", "먹기", "식사", "밥", "맛집", "카페", "브런치", "디저트", "음식"}
    #         parsed["keywords"] = [k for k in kws if str(k).strip() not in bad]
    #
    #         logger.info("[POST_FIX] '먹는거말고' 제외 의도 감지 → 음식계열 차단, category=%s", parsed.get("category"))
    #         return parsed
    #
    #     # ✅ [최우선] "문화생활"은 무조건 문화예술로 본다 (러닝/운동 방지)
    #     culture_words = ["문화생활", "전시", "공연", "뮤지컬", "연극", "갤러리", "박물관", "사진전", "페스티벌"]
    #     sports_words = ["러닝", "운동", "뛰", "달리", "축구", "배드민턴", "클라이밍", "등산"]
    #
    #     if any(w in text for w in culture_words) and not any(w in text for w in sports_words):
    #         parsed["category"] = "문화예술"
    #         parsed.pop("subcategory", None)  # 필요하면 "전시회" 같은걸로 넣어도 됨
    #         parsed["vibe"] = parsed.get("vibe") or "여유로운"
    #         parsed["confidence"] = max(float(parsed.get("confidence", 0) or 0), 0.7)
    #         # location_type은 실외/실내 키워드가 있으면 아래 로직이 잡아줌
    #         logger.info("[POST_FIX] 문화생활 감지 → category=문화예술 강제")
    #         return parsed
    #
    #     # ✅ 1. "놀다" 키워드 우선 체크 (식사보다 우선!)
    #     play_keywords = ["놀", "재밌게", "즐겁게", "신나게", "fun"]
    #     has_play = any(k in text for k in play_keywords)
    #
    #     # ✅ 2. 식사 키워드는 "먹다" 관련만
    #     meal_keywords = ["먹", "식사", "밥", "점심먹", "저녁먹", "아침먹"]  # "점심", "저녁", "아침" 제거!
    #     has_meal = any(k in text for k in meal_keywords)
    #
    #     # ✅ 3. "놀다"가 있으면 소셜 우선
    #     if has_play and not parsed.get("category"):
    #         parsed["category"] = "소셜"
    #         parsed["vibe"] = "즐거운"
    #         parsed["confidence"] = max(float(parsed.get("confidence", 0)), 0.65)
    #         logger.info(f"[POST_FIX] 놀이 키워드 감지 → category=소셜")
    #         return parsed  # ✅ 여기서 바로 리턴 (식사 체크 스킵)
    #
    #     # 식사 키워드 체크 (놀이 키워드 없을 때만)
    #     if has_meal and not parsed.get("category"):
    #         parsed["category"] = "맛집"
    #         parsed["vibe"] = "캐주얼"
    #         parsed["confidence"] = max(float(parsed.get("confidence", 0)), 0.6)
    #         logger.info(f"[POST_FIX] 식사 키워드 → category=맛집")
    #
    #     # ✅ 시간 키워드만 있을 때 category 추론
    #     time_only_keywords = ["주말", "토요일", "일요일", "평일", "주중"]
    #     has_time_keyword = any(k in text for k in time_only_keywords)
    #
    #     meal_keywords = ["점심", "저녁", "아침", "식사", "먹"]
    #     has_meal = any(k in text for k in meal_keywords)
    #
    #     # ✅ 새로 추가: "나가다" 표현 감지
    #     go_out_keywords = ["나가", "외출", "나갈"]
    #     has_go_out = any(k in text for k in go_out_keywords)
    #
    #     if has_go_out and not parsed.get("location_type"):
    #         parsed["location_type"] = "OUTDOOR"
    #
    #         # category 보정 (소셜 → 스포츠 or 문화예술)
    #         if parsed.get("category") == "소셜":
    #             # vibe로 구분
    #             vibe = parsed.get("vibe", "")
    #             if vibe in ["조용한", "여유로운", "힐링"]:
    #                 parsed["category"] = "문화예술"
    #                 parsed["subcategory"] = "산책"
    #             else:
    #                 parsed["category"] = "스포츠"
    #                 parsed["subcategory"] = "러닝"
    #
    #         # keywords 정리
    #         kws = parsed.get("keywords") or []
    #         # "나가고싶다", "소셜" 같은 불필요한 키워드 제거
    #         bad = {"나가고싶다", "외출", parsed.get("category")}
    #         bad |= set(go_out_keywords)  # 리스트 합치기
    #         parsed["keywords"] = [k for k in kws if k not in bad]
    #
    #         parsed["confidence"] = max(float(parsed.get("confidence", 0)), 0.6)
    #         logger.info(f"[POST_FIX] '나가다' 표현 감지 → location_type=OUTDOOR, category={parsed.get('category')}")
    #
    #     # ✅ "실외 + 조용함" 조합 감지
    #     quiet_keywords = ["조용", "잔잔", "여유", "평화", "차분"]
    #     has_quiet = any(k in text for k in quiet_keywords)
    #
    #     intense_keywords = ["격정", "격렬", "열정", "강렬", "하드코어", "익스트림"]
    #     has_intense = any(k in text for k in intense_keywords)
    #
    #     if has_intense:
    #         # ✅ 무조건 스포츠로 변경
    #         parsed["category"] = "스포츠"
    #         parsed["vibe"] = "격렬한"
    #
    #         # ✅ 실외면 subcategory 추론
    #         if parsed.get("location_type") == "OUTDOOR":
    #             # 러닝/클라이밍/축구 등 실외 스포츠
    #             if "뛰" in text or "달리" in text:
    #                 parsed["subcategory"] = "러닝"
    #             elif "올라" in text or "등반" in text:
    #                 parsed["subcategory"] = "클라이밍"
    #             else:
    #                 parsed["subcategory"] = None  # 일반 스포츠
    #
    #         parsed["confidence"] = max(float(parsed.get("confidence", 0)), 0.7)
    #         logger.info(f"[POST_FIX] 격정적 감지 → category=스포츠, vibe=격렬한")
    #
    #     # ✅ 새로 추가: "실내 + 편안함" 조합 처리
    #     indoor = parsed.get("location_type") == "INDOOR"
    #     quiet_keywords = ["편안", "여유", "조용", "차분", "힐링", "편하게"]
    #     has_quiet = any(k in text for k in quiet_keywords)
    #
    #     if indoor and has_quiet and not parsed.get("category"):
    #         # ✅ 실내에서 편안하게 → 카페/문화예술
    #         if "공부" in text or "스터디" in text or "집중" in text:
    #             parsed["category"] = "스터디"
    #             parsed["vibe"] = "집중"
    #         else:
    #             parsed["category"] = "카페"  # 기본값
    #             parsed["vibe"] = "여유로운"
    #
    #         parsed["confidence"] = max(float(parsed.get("confidence", 0)), 0.6)
    #         logger.info(f"[POST_FIX] 실내+편안 → category={parsed['category']}")
    #
    #     if parsed.get("location_type") == "OUTDOOR" and has_quiet:
    #         # 소셜 → 문화예술 변경
    #         if parsed.get("category") == "소셜":
    #             parsed["category"] = "문화예술"
    #             parsed["subcategory"] = "사진촬영"
    #             parsed["vibe"] = "조용한"
    #             parsed["confidence"] = max(float(parsed.get("confidence", 0)), 0.65)
    #             logger.info(f"[POST_FIX] 실외+조용 → category=문화예술")
    #
    #     # category가 없는데 시간 키워드만 있으면
    #     if has_time_keyword and not parsed.get("category"):
    #         # ✅ 유저 관심사 기반 추론
    #         user_interests = parsed.get("user_interests", "").lower()
    #
    #         if "아웃도어" in user_interests or "스포츠" in user_interests:
    #             parsed["category"] = "스포츠"
    #             parsed["vibe"] = "활기찬"
    #             parsed["confidence"] = max(float(parsed.get("confidence", 0)), 0.55)
    #             logger.info(f"[POST_FIX] 주말+스포츠 관심사 → category=스포츠")
    #
    #         elif "소셜" in user_interests or "게임" in user_interests:
    #             parsed["category"] = "소셜"
    #             parsed["vibe"] = "즐거운"
    #             parsed["confidence"] = max(float(parsed.get("confidence", 0)), 0.55)
    #             logger.info(f"[POST_FIX] 주말+소셜 관심사 → category=소셜")
    #
    #         elif "카페" in user_interests or "문화" in user_interests:
    #             parsed["category"] = "카페"
    #             parsed["vibe"] = "여유로운"
    #             parsed["confidence"] = max(float(parsed.get("confidence", 0)), 0.55)
    #             logger.info(f"[POST_FIX] 주말+카페 관심사 → category=카페")
    #
    #         else:
    #             # ✅ 기본값: 소셜 (주말은 보통 사람 만나는 활동)
    #             parsed["category"] = "소셜"
    #             parsed["vibe"] = "즐거운"
    #             parsed["confidence"] = max(float(parsed.get("confidence", 0)), 0.5)
    #             logger.info(f"[POST_FIX] 주말 기본값 → category=소셜")
    #
    #     # ✅ 식사 키워드가 있으면 무조건 맛집
    #     if has_meal and not parsed.get("category"):
    #         parsed["category"] = "맛집"
    #         parsed["vibe"] = "캐주얼"
    #         parsed["confidence"] = max(float(parsed.get("confidence", 0)), 0.6)
    #         logger.info(f"[POST_FIX] 식사 키워드 → category=맛집")
    #
    #     # ✅ 1. 위치 전용 쿼리 감지 ("집 근처에서", "주변", "강남 근처")
    #     location_only_keywords = ["근처", "주변"]
    #     is_location_only = any(k in text for k in location_only_keywords)
    #
    #     # ✅ 구체적 활동이 없으면 위치 전용으로 판단
    #     activity_keywords = [
    #         "카페", "러닝", "운동", "맛집", "전시", "스터디", "놀", "먹",
    #         "보드게임", "당구", "영화", "클라이밍", "배드민턴", "축구"
    #     ]
    #     has_activity = any(k in text for k in activity_keywords)
    #
    #     if is_location_only and not has_activity:
    #         # GPT가 멋대로 붙인 category 제거
    #         parsed.pop("category", None)
    #         parsed.pop("subcategory", None)
    #
    #         # location_query 명시적 설정
    #         if not parsed.get("location_query"):
    #             # "집 근처에서" → "집 근처"
    #             if "집" in text:
    #                 parsed["location_query"] = "집 근처"
    #             else:
    #                 # "강남 근처" 같은 경우 추출
    #                 words = text.split()
    #                 for i, word in enumerate(words):
    #                     if any(loc in word for loc in location_only_keywords):
    #                         if i > 0:
    #                             parsed["location_query"] = words[i - 1]
    #                             break
    #
    #         # keywords도 정리 (location 관련만 남기기)
    #         kws = parsed.get("keywords") or []
    #         parsed["keywords"] = [k for k in kws if k in ["집", "강남", "홍대", "성수", "압구정"]]
    #
    #         logger.info(f"[POST_FIX] 위치 전용 쿼리 감지 → location_query={parsed.get('location_query')}, category 제거")
    #
    #     # ✅ 2. location_type 강화 (명시적 키워드만)
    #     outdoor_keywords = ["실외", "야외", "밖", "아웃도어", "outdoor"]
    #     indoor_keywords = ["실내", "인도어", "indoor"]  # ❌ "안" 제거!
    #
    #     has_outdoor = any(k in text for k in outdoor_keywords)
    #     has_indoor = any(k in text for k in indoor_keywords)
    #
    #     # 우선순위: 실외/실내 명시 > GPT 파싱값
    #     if has_outdoor and not has_indoor:
    #         parsed["location_type"] = "OUTDOOR"
    #         logger.info(f"[POST_FIX] OUTDOOR 감지")
    #     elif has_indoor and not has_outdoor:
    #         parsed["location_type"] = "INDOOR"
    #         logger.info(f"[POST_FIX] INDOOR 감지")
    #     elif has_outdoor and has_indoor:
    #         # 둘 다 있으면 먼저 나온 키워드 우선
    #         outdoor_pos = min((text.find(k) for k in outdoor_keywords if k in text), default=999)
    #         indoor_pos = min((text.find(k) for k in indoor_keywords if k in text), default=999)
    #
    #         if outdoor_pos < indoor_pos:
    #             parsed["location_type"] = "OUTDOOR"
    #             logger.info(f"[POST_FIX] OUTDOOR 우선")
    #         else:
    #             parsed["location_type"] = "INDOOR"
    #             logger.info(f"[POST_FIX] INDOOR 우선")
    #
    #     # ✅ 3. 기존 empty 보정 (유지)
    #     empty = (not parsed.get("category")) and (not parsed.get("keywords"))
    #     if empty:
    #         play_intent = any(k in text for k in ["놀", "뭐하지", "할거없", "심심", "기분전환"])
    #
    #         if play_intent and parsed.get("location_type") == "INDOOR":
    #             parsed["category"] = "소셜"
    #             parsed["vibe"] = "즐거운"
    #             parsed["confidence"] = max(float(parsed.get("confidence", 0) or 0), 0.5)
    #             logger.info(f"[POST_FIX] 실내 놀이 의도 감지 → category=소셜")
    #
    #         elif play_intent and parsed.get("location_type") == "OUTDOOR":
    #             parsed["category"] = "스포츠"
    #             parsed["vibe"] = "활기찬"
    #             parsed["confidence"] = max(float(parsed.get("confidence", 0) or 0), 0.5)
    #             logger.info(f"[POST_FIX] 실외 활동 의도 감지 → category=스포츠")
    #
    #     morning_keywords = ["아침", "조식", "브런치", "morning"]
    #     has_morning = any(k in text for k in morning_keywords)
    #
    #     # category를 새로 만들어낼 때는 confidence 가드
    #     if parsed.get("category") and float(parsed.get("confidence", 0)) < 0.6:
    #         parsed.pop("category", None)
    #         parsed.pop("subcategory", None)
    #
    #     if has_morning and parsed.get("category") == "맛집":
    #         # 맛집 → 카페(브런치)로 변경
    #         parsed["category"] = "카페"
    #         parsed["subcategory"] = "브런치"
    #         parsed["vibe"] = "여유로운"
    #         parsed["confidence"] = max(float(parsed.get("confidence", 0)), 0.65)
    #         logger.info(f"[POST_FIX] 아침 키워드 감지 → category=카페, subcategory=브런치")
    #
    #     # 공부 키워드 보정
    #     study_keywords = ["공부", "스터디", "집중", "독서", "혼자"]
    #     has_study = any(k in text for k in study_keywords)
    #
    #     if has_study and parsed.get("category") == "소셜":
    #         # 소셜 → 스터디로 변경
    #         parsed["category"] = "스터디"
    #         parsed["vibe"] = "집중"
    #         parsed["confidence"] = max(float(parsed.get("confidence", 0)), 0.65)
    #         logger.info(f"[POST_FIX] 공부 키워드 감지 → category=스터디")
    #
    #     return parsed

    def _post_fix(self, user_prompt: str, parsed: dict) -> dict:
        """
        GPT 파싱 후 보정 (리팩터)
        - 조기 return 제거
        - 우선순위 룰을 위→아래로 적용
        - 강제 룰 / 소프트 룰 분리
        """
        text = (user_prompt or "").lower().strip()
        q = dict(parsed or {})

        # -------------------------
        # helpers
        # -------------------------
        def set_if_empty(key: str, value):
            if not q.get(key):
                q[key] = value

        def bump_conf(min_conf: float):
            q["confidence"] = max(float(q.get("confidence", 0) or 0), float(min_conf))

        def add_keywords(words: list[str], limit: int = 8):
            kws = q.get("keywords") or []
            kws = [str(x).strip() for x in kws if x]
            for w in words:
                w = str(w).strip()
                if w and w not in kws:
                    kws.append(w)
            q["keywords"] = kws[:limit]

        def drop_food_keywords():
            kws = q.get("keywords") or []
            bad = {"먹", "먹기", "식사", "밥", "맛집", "카페", "브런치", "디저트", "음식"}
            q["keywords"] = [k for k in kws if str(k).strip() not in bad]

        # -------------------------
        # 0) location_type 명시 키워드만 먼저 확정 (실내/실외)
        # -------------------------
        outdoor_keywords = ["실외", "야외", "밖", "아웃도어", "outdoor"]
        indoor_keywords = ["실내", "인도어", "indoor"]

        has_outdoor = any(k in text for k in outdoor_keywords)
        has_indoor = any(k in text for k in indoor_keywords)

        if has_outdoor and not has_indoor:
            q["location_type"] = "OUTDOOR"
        elif has_indoor and not has_outdoor:
            q["location_type"] = "INDOOR"
        elif has_outdoor and has_indoor:
            # 둘 다 있으면 먼저 나온 키워드 우선
            outdoor_pos = min((text.find(k) for k in outdoor_keywords if k in text), default=999)
            indoor_pos = min((text.find(k) for k in indoor_keywords if k in text), default=999)
            q["location_type"] = "OUTDOOR" if outdoor_pos < indoor_pos else "INDOOR"

        # -------------------------
        # ✅ 0.5) "실내에서 즐겁게/재밌게/신나게" 같은 vibe-only 요청은
        # 카페로 쏠리기 쉬우니 기본을 '소셜(보드게임/방탈출)'로 교정
        # - 활동 단서가 없을 때만 발동 (덮어쓰기 방지)
        # - GPT가 카페로 찍어도 여기서 잡아줌
        # -------------------------
        fun_words = ["즐겁", "재밌", "재미", "신나", "fun"]
        indoor_fun = (q.get("location_type") == "INDOOR") and any(w in text for w in fun_words)

        # 활동 단서(명사)가 거의 없으면: vibe-only로 판정
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
            add_keywords(["보드게임", "방탈출"], limit=10)
            # vibe는 유지하되 conf 살짝 올림
            q["vibe"] = q.get("vibe") or "즐거운"
            q["confidence"] = max(float(q.get("confidence", 0) or 0), 0.65)

        # -------------------------
        # 1) "먹는거 말고/제외" 최우선 (맛집/카페 강제 차단)
        # -------------------------
        if self._excludes_food(text):
            if q.get("category") in ["맛집", "카페"]:
                q.pop("category", None)
                q.pop("subcategory", None)
            set_if_empty("location_type", "INDOOR")
            set_if_empty("category", "문화예술")
            set_if_empty("vibe", "여유로운")
            bump_conf(0.65)
            drop_food_keywords()

        # -------------------------
        # 2) 사진/촬영 의도 강제
        # -------------------------
        photo_words = ["사진", "촬영", "포토", "카메라", "필카", "스냅", "인생샷"]
        if any(w in text for w in photo_words):
            q["category"] = "문화예술"
            q["subcategory"] = "사진촬영"
            set_if_empty("vibe", "즐거운")
            bump_conf(0.75)

        # -------------------------
        # 3) 뇌/추리/보드게임 강제
        # -------------------------
        brain_words = ["머리", "머리쓰", "두뇌", "추리", "전략", "퍼즐", "퀴즈", "방탈출", "보드게임", "체스"]
        if any(w in text for w in brain_words):
            set_if_empty("category", "소셜")
            set_if_empty("location_type", "INDOOR")
            add_keywords(["보드게임", "방탈출", "퍼즐", "추리"], limit=10)
            set_if_empty("vibe", "즐거운")
            bump_conf(0.75)

        # -------------------------
        # 4) 공놀이 처리: subcategory 강제 금지 + 종목 키워드 확장
        # -------------------------
        if "공놀이" in text:
            q["category"] = "스포츠"
            q.pop("subcategory", None)
            q["keywords"] = ["축구", "풋살", "농구", "배드민턴", "테니스"]
            bump_conf(0.65)

        # -------------------------
        # 5) 춤/댄스 강제
        # -------------------------
        dance_words = ["춤", "댄스", "dance", "kpop", "k-pop", "케이팝", "스트릿", "힙합댄스", "방송댄스"]
        if any(w in text for w in dance_words):
            q["category"] = "취미활동"
            q["subcategory"] = "댄스"
            set_if_empty("vibe", "즐거운")
            set_if_empty("location_type", "INDOOR")
            bump_conf(0.75)

        # -------------------------
        # 6) 손으로/공방/DIY 강제
        # -------------------------
        hands_on_words = ["손으로", "만들", "만들기", "공방", "체험", "diy", "수공예", "핸드메이드"]
        if any(w in text for w in hands_on_words):
            q["category"] = "취미활동"
            set_if_empty("vibe", "여유로운")
            bump_conf(0.70)
            if any(w in text for w in ["붓글씨", "캘리", "캘리그라피"]):
                q["subcategory"] = "캘리그라피"

        # -------------------------
        # 7) 문화생활(운동/스포츠 단서 없으면) → 문화예술 강제
        # -------------------------
        culture_words = ["문화생활", "전시", "공연", "뮤지컬", "연극", "갤러리", "박물관", "사진전", "페스티벌"]
        sports_words = ["러닝", "운동", "뛰", "달리", "축구", "배드민턴", "클라이밍", "등산"]
        if any(w in text for w in culture_words) and not any(w in text for w in sports_words):
            q["category"] = "문화예술"
            q.pop("subcategory", None)
            set_if_empty("vibe", "여유로운")
            bump_conf(0.70)

        # -------------------------
        # 8) "나가고싶다/외출" 같은 표현: location_type만 OUTDOOR로, 카테고리는 강제하지 않음(덮어쓰기 방지)
        # -------------------------
        go_out_keywords = ["나가", "외출", "나갈"]
        if any(k in text for k in go_out_keywords):
            set_if_empty("location_type", "OUTDOOR")
            bump_conf(0.55)

        # -------------------------
        # 9) "놀다" vs "먹다" 우선순위 (카테고리 비어있을 때만)
        # -------------------------
        play_keywords = ["놀", "재밌게", "즐겁게", "신나게", "fun"]
        meal_keywords = ["먹", "식사", "밥", "점심먹", "저녁먹", "아침먹"]

        has_play = any(k in text for k in play_keywords)
        has_meal = any(k in text for k in meal_keywords)

        if not q.get("category"):
            if has_play:
                q["category"] = "소셜"
                set_if_empty("vibe", "즐거운")
                bump_conf(0.65)
            elif has_meal:
                q["category"] = "맛집"
                set_if_empty("vibe", "캐주얼")
                bump_conf(0.60)

        # -------------------------
        # 10) 위치-only 쿼리 감지: 활동 단서 없으면 category/subcategory 제거
        # -------------------------
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
            bump_conf(0.55)

        # -------------------------
        # 11) 공부/스터디: 소셜로 잘못 찍히면 스터디로 교정
        # -------------------------
        study_keywords = ["공부", "스터디", "집중", "독서", "혼자"]
        if any(k in text for k in study_keywords):
            if q.get("category") == "소셜":
                q["category"] = "스터디"
            set_if_empty("vibe", "집중")
            bump_conf(0.65)

        # -------------------------
        # 12) 성별 키워드: "강제 카테고리 변경" 금지(편향/덮어쓰기 방지) → 키워드 힌트만 약하게
        # -------------------------
        male_keywords = ["남자", "남성", "남자가", "남성이"]
        female_keywords = ["여자", "여성", "여자가", "여성이"]
        has_male = any(k in text for k in male_keywords)
        has_female = any(k in text for k in female_keywords)

        if has_male and not has_female:
            # 카테고리가 비어있거나, 소셜/스포츠일 때만 힌트
            if q.get("category") in [None, "", "소셜", "스포츠"]:
                add_keywords(["축구", "볼링", "당구"], limit=10)
                bump_conf(0.55)

        if has_female and not has_male:
            if q.get("category") in [None, "", "카페", "문화예술", "취미활동"]:
                add_keywords(["카페", "전시", "공방"], limit=10)
                bump_conf(0.55)

        # -------------------------
        # 13) 마지막 safety: conf 낮은데 "새로 만든 category"면 제거 (기존 너 로직 유지하지만 더 안전하게)
        # -------------------------
        conf = float(q.get("confidence", 0) or 0)
        if q.get("category") and conf < 0.55:
            # 단, 위의 강제 룰(사진/뇌/댄스/공방/문화생활/제외처리 등)로 만들어진 경우는 남기고 싶으면 플래그를 둘 수 있음
            # 여기서는 안전 우선으로 유지하지 않고 제거하지 않음 (너 기존은 0.6 미만 제거였는데 너무 공격적일 수 있음)
            pass

        return q

    """
    _apply_intent_adjustment() 최종 약화 버전
    Location 보정 +12 → +6
    """

    def _apply_intent_adjustment(self, intent: str, meeting: dict, parsed_query: dict = None) -> float:
        cat = meeting.get("category") or ""
        sub = meeting.get("subcategory") or ""

        adjustment = 0.0

        # ✅ NEUTRAL은 가산/감산 없이 0이 기본 (튜닝 난이도 급감)

        if not intent or intent == "NEUTRAL":
            # 단, location_type 명시 요청만은 약하게 반영하고 싶으면 여기서 처리
            if parsed_query:
                requested_type = parsed_query.get("location_type")
                meeting_type = meeting.get("meeting_location_type") or meeting.get("location_type")
                if requested_type and meeting_type:
                    if requested_type.upper() == meeting_type.upper():
                        adjustment += 3.0
                    else:
                        adjustment -= 3.0

            return adjustment

        # ✅ ACTIVE intent 강화
        if intent == "ACTIVE":
            if cat == "스포츠":
                if sub == "축구":
                    adjustment += 18.0
                elif sub in ["러닝", "클라이밍", "배드민턴"]:
                    adjustment += 10.0
                else:
                    adjustment += 8.0
            else:
                # ✅ 스포츠가 없을 때는 과도한 패널티 금지
                adjustment -= 6.0

        if intent == "HANDS_ON":
            if cat == "취미활동":
                adjustment += 12.0
            if cat == "문화예술":
                adjustment += 6.0
            if cat == "소셜" and sub in ["당구", "볼링", " 기억", "노래방", "보드게임"]:
                adjustment -= 18.0

        # ✅ 카페/문화예술 강하게 패널티
        if intent == "ACTIVE" and cat in ["카페", "문화예술"]:
            adjustment -= 6.0

        if intent == "BRAIN":
            # 보드게임/방탈출을 최우선으로 끌어올림
            if cat == "소셜" and sub in ["보드게임", "방탈출"]:
                adjustment += 22.0
            # 머리쓰는 요청에 당구/볼링/와인바는 과감히 내림
            if cat == "소셜" and sub in ["당구", "볼링", "와인바", "노래방"]:
                adjustment -= 18.0
            # 카페/문화예술은 중립 정도
            if cat in ["카페", "문화예술"]:
                adjustment += 0.0

        # ✅ 소셜도 약간 패널티 (버스킹 투어 차단)
        if intent == "ACTIVE" and cat == "소셜":
            if sub in ["볼링", "당구", "탁구"]:
                adjustment += 3.0  # 6 → 3으로 약화
            else:
                adjustment -= 6.0

        # ✅ QUIET intent (기존 코드 유지)
        if intent == "QUIET":
            if cat == "스포츠":
                adjustment += -30.0
            elif cat == "카페":
                adjustment += 15.0
            elif cat == "문화예술":
                adjustment += 12.0

        keywords = (parsed_query.get("keywords") or []) if parsed_query else []
        if "공놀이" in keywords:
            if cat == "스포츠" and sub == "러닝":
                adjustment -= 20.0
            if cat == "스포츠" and sub in ["축구", "배드민턴"]:
                adjustment += 10.0

        # ✅ location_type 보정
        if parsed_query:
            requested_type = parsed_query.get("location_type")
            meeting_type = meeting.get("meeting_location_type") or meeting.get("location_type")

            if requested_type and meeting_type:
                if requested_type.upper() == meeting_type.upper():
                    adjustment += 6.0
                else:
                    adjustment -= 10.0

        return adjustment

    def _is_adjacent_timeslot(self, slot1: str, slot2: str) -> bool:
        """인접 시간대 체크 (아침↔점심, 점심↔저녁 등)"""
        if not slot1 or not slot2:
            return False

        adjacency = {
            "MORNING": ["AFTERNOON"],
            "AFTERNOON": ["MORNING", "EVENING"],
            "EVENING": ["AFTERNOON", "NIGHT"],
            "NIGHT": ["EVENING"]
        }

        return slot2 in adjacency.get(slot1, [])

    def _apply_vibe_prior(self, q: dict) -> dict:
        cat = q.get("category")
        sub = q.get("subcategory")
        kws = q.get("keywords") or []
        vibe = self._normalize_vibe(q.get("vibe"))
        lt = (q.get("location_type") or "").upper()
        conf = float(q.get("confidence", 0) or 0)

        if (not cat) and (not sub) and (len(kws) == 0) and vibe:
            if vibe in ["즐거운", "활기찬"]:
                q["category"] = "소셜"
                q["confidence"] = max(conf, 0.6)

            elif vibe in ["건강한"]:
                q["category"] = "스포츠"
                q["confidence"] = max(conf, 0.6)

            elif vibe in ["여유로운", "힐링", "감성적인"]:
                # ✅ 핵심: 야외 + 조용/힐링이면 카페보다 산책/전시/사진이 더 자연스러움
                if lt == "OUTDOOR":
                    q["category"] = "문화예술"
                    # 있으면 DB에 맞춰: "산책" / "사진촬영"
                    q.pop("subcategory", None)
                else:
                    q["category"] = "카페"
                q["confidence"] = max(conf, 0.6)

        q["vibe"] = vibe
        return q

    def _pick_location_type_from_raw(self, m: dict) -> Optional[str]:
        # Spring AIMeetingDTO는 @JsonProperty("location_type")라서 location_type이 주력
        return m.get("location_type") or m.get("locationType")

    def _pick_location_type_from_normalized(self, m: dict) -> Optional[str]:
        return m.get("meeting_location_type")

    def _has_explicit_timeslot(self, text: str) -> bool:
        t = (text or "").lower()
        return any(k in t for k in ["아침", "오전", "점심", "오후", "저녁", "밤", "야간", "morning", "afternoon", "evening", "night"])

    def _has_explicit_quiet(self, text: str) -> bool:
        t = (text or "").lower()
        return any(w in t for w in ["조용", "차분", "힐링", "잔잔", "고요"])

    def _has_explicit_location(self, user_prompt: str, q: dict | None = None) -> bool:
        text = (user_prompt or "").strip()
        if not text:
            return False

        # 1) near-me 표현은 explicit_loc로 치지 않음 (그건 radius 로직으로 처리)
        if self._is_near_me_phrase(text):
            return False

        # 2) GPT가 location_query를 뽑아줬고, 그 값이 near-me가 아니면 거의 명시 지명
        if q:
            lq = q.get("location_query") or q.get("locationQuery")
            if lq and not self._is_near_me_phrase(str(lq)):
                # "강남", "성수", "잠실", "홍대입구" 등
                return True

        # 3) 휴리스틱: 역/동/구/시/군/읍/면/리/로/길 등 지명 접미
        # (너희 서비스가 서울 위주면 '역/동/구'만으로도 충분)
        patterns = [
            r"[가-힣]{1,10}역",  # 강남역, 성수역
            r"[가-힣]{1,10}동",  # 길동, 성수동
            r"[가-힣]{1,10}구",  # 송파구
            r"[가-힣]{1,10}(로|길)",  # 테헤란로, 연무장길 등
        ]
        return any(re.search(p, text) for p in patterns)

    def _guard_category_by_evidence(self, user_prompt: str, q: dict) -> dict:

        def _has_any(text: str, words: list[str]) -> bool:
            t = (text or "").lower()
            return any(w in t for w in words)

        text = (user_prompt or "").lower()

        cat = (q.get("category") or "").strip()
        lt  = (q.get("location_type") or "").upper()

        # "스터디"라고 부를만한 증거 단어들
        STUDY_EVIDENCE = ["스터디", "공부", "독서", "토익", "오픽", "영어", "자격증", "코딩", "개발", "프로그래밍", "세미나", "강의"]

        # "조용/힐링"만 말한 케이스
        QUIET_EVIDENCE = ["조용", "차분", "힐링", "잔잔", "고요", "여유"]

        has_study = _has_any(text, STUDY_EVIDENCE)
        has_quiet = _has_any(text, QUIET_EVIDENCE)

        # ✅ 핵심: 스터디 증거가 없는데 GPT가 스터디로 찍으면 제거/교정
        if cat == "스터디" and not has_study:
            # 선택지 A) category를 제거해서 "야외 + 조용"만으로 넓게 찾기
            q.pop("category", None)
            q.pop("subcategory", None)

            # 선택지 B) 너 DB에 맞춰 '문화예술'로 교정 (야외 조용이면 산책/사진 쪽이 자연스러움)
            # q["category"] = "문화예술"
            # q.pop("subcategory", None)

            # 키워드 힌트 조금 주면 GPT/랭킹에도 도움 됨 (DB에 없어도 query_terms 보강용)
            kws = q.get("keywords") or []
            for w in ["산책", "사진", "피크닉", "공원"]:
                if w not in kws:
                    kws.append(w)
            q["keywords"] = kws[:8]

            # confidence 너무 높게 믿지 말자
            q["confidence"] = min(float(q.get("confidence", 0) or 0), 0.65)

        # ✅ 야외 + 조용인데 카테고리가 비어있으면 문화예술로 기본값 주는 것도 가능
        if (not q.get("category")) and lt == "OUTDOOR" and has_quiet:
            q["category"] = "문화예술"
            q["confidence"] = max(float(q.get("confidence", 0) or 0), 0.6)

        return q




