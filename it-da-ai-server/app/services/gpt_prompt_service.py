"""
GPT Prompt Parsing Service
사용자 자연어 → 구조화된 검색 파라미터 변환
"""

import openai
import json
from typing import Dict, List, Optional
from app.core.logging import logger


class GPTPromptService:
    """GPT를 활용한 프롬프트 파싱 서비스"""

    def __init__(self, api_key: str):
        self.client = openai.OpenAI(api_key=api_key)
        self.model = "gpt-4o-mini"  # 빠르고 저렴한 모델

    async def parse_search_query(self, user_prompt: str) -> Dict:
        """
        사용자 프롬프트를 구조화된 검색 파라미터로 변환

        Args:
            user_prompt: "오늘 저녁 강남에서 러닝할 사람~"

        Returns:
            {
                "category": "스포츠",
                "subcategory": "러닝",
                "time_slot": "evening",
                "location_query": "강남",
                "vibe": "활기찬",
                "max_cost": null,
                "keywords": ["러닝", "강남", "저녁"]
            }
        """
        try:
            system_prompt = self._build_system_prompt()

            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.3,  # 일관성 있는 응답
                max_tokens=500
            )

            # JSON 파싱
            content = response.choices[0].message.content.strip()

            # ```json ... ``` 제거
            if content.startswith("```json"):
                content = content[7:]
            if content.endswith("```"):
                content = content[:-3]

            parsed_data = json.loads(content.strip())

            logger.info(f"✅ GPT 파싱 성공: {user_prompt} → {parsed_data}")
            return parsed_data

        except json.JSONDecodeError as e:
            logger.error(f"❌ GPT 응답 JSON 파싱 실패: {e}")
            return self._fallback_parse(user_prompt)
        except Exception as e:
            logger.error(f"❌ GPT API 호출 실패: {e}")
            return self._fallback_parse(user_prompt)

    def _build_system_prompt(self) -> str:
        """시스템 프롬프트 구성"""
        return """당신은 모임 검색 쿼리 파서입니다. 사용자의 자연어 입력을 JSON 형태로 변환하세요.

**카테고리 매핑 규칙:**
- 스포츠: 러닝, 등산, 축구, 농구, 배드민턴, 테니스, 요가, 필라테스, 헬스, 사이클링
- 맛집: 한식, 중식, 일식, 양식, 카페, 디저트, 술집, 맛집투어
- 카페: 카페투어, 스터디카페, 북카페, 브런치카페
- 문화예술: 영화, 연극, 전시회, 공연, 박물관, 갤러리
- 스터디: 어학, 자격증, IT, 독서, 토론
- 취미활동: 사진, 그림, 악기, 보드게임, 독서, 요리
- 소셜: 번개, 네트워킹, 친목, 파티

**시간대 매핑:**
- morning: 아침, 오전, 새벽
- afternoon: 오후, 점심, 낮
- evening: 저녁, 밤, 야간

**분위기 매핑:**
- 활기찬: 신나는, 활발한, 에너제틱한
- 여유로운: 편안한, 느긋한, 천천히
- 진지한: 집중하는, 전문적인
- 즐거운: 재미있는, 유쾌한
- 감성적인: 감성, 로맨틱한
- 에너지 넘치는: 강렬한, 역동적인
- 힐링: 치유, 평화로운
- 창의적인: 독특한, 예술적인

**응답 형식 (반드시 JSON만):**
```json
{
  "category": "스포츠",
  "subcategory": "러닝",
  "time_slot": "evening",
  "location_query": "강남",
  "vibe": "활기찬",
  "max_cost": 10000,
  "keywords": ["러닝", "강남", "저녁"],
  "confidence": 0.9
}
```

**중요:**
1. 반드시 JSON만 출력하세요 (설명 금지)
2. 필드가 없으면 null 사용
3. confidence는 0~1 사이 값 (확신도)
4. keywords는 핵심 단어 3~5개 추출"""

    def _fallback_parse(self, user_prompt: str) -> Dict:
        """GPT 실패 시 기본 파싱"""
        logger.warning(f"⚠️ Fallback 파싱 사용: {user_prompt}")

        keywords = [word for word in user_prompt.split() if len(word) > 1]

        return {
            "category": None,
            "subcategory": None,
            "time_slot": None,
            "location_query": None,
            "vibe": None,
            "max_cost": None,
            "keywords": keywords[:5],
            "confidence": 0.3
        }

    async def enrich_with_user_context(
            self,
            parsed_query: Dict,
            user_context: Dict
    ) -> Dict:
        """
        사용자 컨텍스트를 추가해 쿼리 보강

        Args:
            parsed_query: GPT 파싱 결과
            user_context: {
                "user_id": 123,
                "latitude": 37.5,
                "longitude": 127.0,
                "interests": "스포츠,카페",
                "time_preference": "evening",
                "budget_type": "FREE"
            }

        Returns:
            보강된 검색 파라미터
        """
        enriched = parsed_query.copy()

        # 위치 정보 추가
        if user_context.get("latitude") and user_context.get("longitude"):
            enriched["user_location"] = {
                "latitude": user_context["latitude"],
                "longitude": user_context["longitude"]
            }

        # 선호 시간대가 없으면 사용자 기본값 사용
        if not enriched.get("time_slot") and user_context.get("time_preference"):
            enriched["time_slot"] = user_context["time_preference"]

        # 예산 정보
        if user_context.get("budget_type"):
            enriched["user_budget_type"] = user_context["budget_type"]

        # 관심사 정보
        if user_context.get("interests"):
            enriched["user_interests"] = user_context["interests"]

        return enriched