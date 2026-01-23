# app/services/meeting_analyzer_service.py

from typing import List
import json
import re

from openai import AsyncOpenAI  # ✅ openai>=1.0.0
from app.core.config import settings
from app.core.logging import logger


class MeetingAnalyzerService:
    """모임 제목/설명을 분석하여 장소 키워드 추출"""

    def __init__(self):
        if settings.OPENAI_API_KEY:
            self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            self.gpt_enabled = True
            logger.info("✅ OpenAI GPT 활성화됨")
        else:
            self.client = None
            self.gpt_enabled = False
            logger.warning("⚠️ OPENAI_API_KEY가 설정되지 않아 규칙 기반 키워드 추출을 사용합니다")

    async def extract_place_keywords(
        self,
        meeting_title: str,
        meeting_description: str = "",
        category: str = ""
    ) -> List[str]:

        if not self.gpt_enabled:
            logger.info("📌 규칙 기반 키워드 추출 사용")
            return self._extract_keywords_by_rules(meeting_title, category)

        try:
            prompt = self._build_keyword_extraction_prompt(
                meeting_title,
                meeting_description,
                category
            )

            # ✅ JSON 배열로만 받도록 강제하면 파싱이 훨씬 안정적
            resp = await self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "너는 모임 성격을 분석해 장소 검색용 키워드를 뽑는 전문가야. "
                            "반드시 JSON 배열만 출력해. 예: [\"러닝트랙\",\"한강공원\",\"운동장\"]."
                        ),
                    },
                    {"role": "user", "content": prompt},
                ],
                temperature=0.2,
                max_tokens=120,
            )

            text = (resp.choices[0].message.content or "").strip()
            keywords = self._parse_keywords(text)

            # ✅ 마지막 안전장치: 비었거나 너무 범용이면 규칙 기반과 섞어서 보정
            if not keywords:
                raise ValueError(f"Empty keywords from GPT. raw={text[:200]}")

            keywords = self._post_filter_keywords(keywords, meeting_title, category)

            logger.info(f"✅ GPT 키워드 추출: {keywords}")
            return keywords[:3]

        except Exception as e:
            logger.error(f"❌ GPT 키워드 추출 실패, 규칙 기반 사용: {e}")
            return self._extract_keywords_by_rules(meeting_title, category)

    def _parse_keywords(self, raw: str) -> List[str]:
        """GPT 출력 파싱: JSON 배열 우선, 실패 시 콤마/줄바꿈/불릿 파싱"""
        if not raw:
            return []

        # 1) JSON 배열 시도
        try:
            data = json.loads(raw)
            if isinstance(data, list):
                return [str(x).strip() for x in data if str(x).strip()]
        except Exception:
            pass

        # 2) 코드펜스 제거 (```json ... ``` 같은)
        cleaned = re.sub(r"^```[a-zA-Z]*\s*|\s*```$", "", raw).strip()

        # 3) 불릿/줄바꿈/콤마 분해
        parts = re.split(r"[,/\n\r•\-]+", cleaned)
        kws = []
        for p in parts:
            k = p.strip().strip('"').strip("'")
            if k:
                kws.append(k)

        # 중복 제거
        uniq = []
        for k in kws:
            if k not in uniq:
                uniq.append(k)
        return uniq

    def _post_filter_keywords(self, keywords: List[str], title: str, category: str) -> List[str]:
        """너무 범용 키워드/모임과 안 맞는 키워드를 약간 보정"""
        t = (title or "").lower()
        c = (category or "").lower()

        # 러닝/조깅이면 우선순위를 러닝 계열로 강제
        if any(k in t for k in ["러닝", "런닝", "조깅", "마라톤"]) or "운동" in c:
            prefer = ["러닝트랙", "운동장", "한강공원", "체육공원", "트랙", "러닝코스"]
            # GPT 결과에 없으면 앞에 채워넣기
            merged = []
            for p in prefer:
                if p not in merged:
                    merged.append(p)
            for k in keywords:
                if k not in merged:
                    merged.append(k)

            # “카페/식당”은 러닝에서는 후순위로 밀기
            deprioritized = ["카페", "식당", "맛집"]
            merged_sorted = [k for k in merged if k not in deprioritized] + [k for k in merged if k in deprioritized]
            return merged_sorted

        return keywords

    def _extract_keywords_by_rules(self, title: str, category: str) -> List[str]:
        """규칙 기반 키워드 추출 (GPT 대체)"""
        title_lower = (title or "").lower()
        category_lower = (category or "").lower()

        priority_keywords = []

        # ✅ 러닝/조깅 강화 (지금 너가 원하는 핵심)
        if any(k in title_lower for k in ["러닝", "런닝", "조깅", "마라톤"]):
            priority_keywords += ["러닝트랙", "한강공원", "운동장"]

        if "커피" in title_lower or "카페" in title_lower:
            priority_keywords.append("카페")
        if any(k in title_lower for k in ["공원", "산책", "야외"]):
            priority_keywords.append("공원")
        if any(k in title_lower for k in ["술", "맥주", "소주"]):
            priority_keywords.append("술집")
        if any(k in title_lower for k in ["운동", "헬스", "피트니스"]):
            priority_keywords.append("헬스장")
        if any(k in title_lower for k in ["밥", "식사", "저녁"]):
            priority_keywords.append("맛집")
        if "스터디" in title_lower or "공부" in title_lower:
            priority_keywords.append("스터디룸")

        # 카테고리 기본값
        category_defaults = self._get_default_keywords(category)

        all_keywords = priority_keywords + category_defaults
        unique_keywords = []
        for kw in all_keywords:
            if kw not in unique_keywords:
                unique_keywords.append(kw)

        return unique_keywords[:3]

    def _build_keyword_extraction_prompt(self, title: str, description: str, category: str) -> str:
        # ✅ 출력 형식을 JSON 배열로 바꿈 (파싱 안정)
        return f"""
다음 모임 정보를 분석해서 "장소 검색에 쓸 키워드"를 1~3개 뽑아줘.
반드시 JSON 배열 형식으로만 출력해. 예: ["러닝트랙","한강공원","운동장"]

모임 제목: {title}
모임 설명: {description or "없음"}
카테고리: {category or "없음"}

조건:
- 실제 지도/장소 검색에 쓸 수 있는 단어여야 함
- 너무 추상적이면 안 됨(예: "좋은곳", "재밌는곳" 금지)
""".strip()

    def _get_default_keywords(self, category: str) -> List[str]:
        defaults = {
            "음식": ["맛집", "카페", "식당"],
            "문화": ["전시장", "카페", "공원"],
            "운동": ["운동장", "러닝트랙", "공원"],  # ✅ 러닝트랙 추가
            "스터디": ["스터디룸", "도서관", "카페"],
            "게임": ["PC방", "보드게임카페", "오락실"],
            "음주": ["술집", "포차", "바"],
            "야외": ["한강공원", "공원", "산책로"],  # ✅ 한강공원 우선
        }
        return defaults.get(category, ["카페", "공원", "식당"])
