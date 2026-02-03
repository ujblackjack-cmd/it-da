"""
GPT Prompt Parsing Service (FIXED - 실내/실외 구분 강화)
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
            user_prompt: "실내에서 할만한거"

        Returns:
            {
                "category": "소셜",
                "location_type": "INDOOR",  # ✅ 추가됨
                "vibe": "즐거운",
                "keywords": [],
                "confidence": 0.5
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

            # ✅ POST-FIX: '공놀이' 같은 애매 표현은 종목 확정 금지
            parsed_data = self._post_fix_ambiguous_ball_play(user_prompt, parsed_data)

            logger.info(f"✅ GPT 파싱 성공: {user_prompt} → {parsed_data}")
            return parsed_data

        except json.JSONDecodeError as e:
            logger.error(f"❌ GPT 응답 JSON 파싱 실패: {e}")
            return self._fallback_parse(user_prompt)
        except Exception as e:
            logger.error(f"❌ GPT API 호출 실패: {e}")
            return self._fallback_parse(user_prompt)

    def _build_system_prompt(self) -> str:
        return """당신은 모임 검색 쿼리 파서입니다.

    ================================
    🚨 최우선 규칙 (CRITICAL)
    ================================
    **감정 표현만으로 category를 추측하지 마세요!**
    
    ❌ 잘못된 예:
    - "기분이 신날때" → category="소셜" (X)
    - "기분 좋을때" → category="소셜" (X)
    - "즐거울때" → category="소셜" (X)
    
    ✅ 올바른 예:
    - "기분이 신날때" → category=null, vibe="즐거운"
    - "우울할때" → category=null, vibe="힐링"
    - "피곤할때" → category=null, vibe="여유로운"
    
    **감정은 vibe로만 표현하세요. category는 구체적 활동이 있을 때만!**
    
    ================================
    📋 응답 형식
    ================================
    {
      "category": "스포츠|맛집|카페|문화예술|스터디|취미활동|소셜",  // 구체적 활동 없으면 null
      "subcategory": "구체적 활동명",
      "vibe": "즐거운|여유로운|힐링|격렬한|차분한",  // 감정 표현은 여기에만
      "location_query": "지역명",
      "time_slot": "MORNING|AFTERNOON|EVENING|NIGHT",
      "location_type": "INDOOR|OUTDOOR",
      "keywords": [],
      "confidence": 0.0~1.0
    }
    
    ================================
    🎯 Category 설정 규칙
    ================================
    **Category는 명확한 활동 키워드가 있을 때만 설정:**
    
    ✅ Category 설정 OK:
    - "축구하고 싶어" → category="스포츠", subcategory="축구"
    - "카페 가고싶어" → category="카페"
    - "전시회 보러" → category="문화예술"
    - "공부할 곳" → category="스터디"
    
    ❌ Category 설정 금지 (감정만):
    - "신날때 갈만한" → category=null, vibe="즐거운"
    - "편안하게 쉬고싶어" → category=null, vibe="여유로운"
    - "스트레스 풀고싶어" → category=null, vibe="격렬한"
    
    ================================
    🎨 Vibe 전용 매핑
    ================================
    **이런 표현들은 vibe만 설정하고 category는 null:**
    
    긍정/활동적:
    - "신나", "즐겁", "행복", "기분좋", "설레" → vibe="즐거운"
    
    부정/휴식:
    - "우울", "슬픔", "지침", "힘듦" → vibe="힐링"
    - "피곤", "졸림", "나른" → vibe="여유로운"
    - "스트레스", "화남", "짜증" → vibe="격렬한"
    
    차분/집중:
    - "차분", "조용", "평온" → vibe="차분한"
    
   
    감정 표현이 포함된 경우 반드시 vibe 필드를 추출하세요:
    - "외로워" → {"vibe": "외로운", "category": null}
    - "즐거워" → {"vibe": "즐거운", "category": null}
    - "힐링하고 싶어" → {"vibe": "편안한", "category": null}
    - "즐겁게 땀 흘리고 싶어" → {"vibe": "즐거운", "category": "스포츠"}


    ================================
    📊 예시 (CRITICAL - 반드시 따르세요)
    ================================
    
    입력: "기분이 신날때 갈만한 모임"
    ```json{
    "category": null,  // ✅ 활동 명시 없음!
    "vibe": "즐거운",
    "keywords": [],
    "confidence": 0.5
    }
    
    입력: "기분 좋을때 할만한거"
    ```json{
    "category": null,  // ✅
    "vibe": "즐거운",
    "keywords": [],
    "confidence": 0.5
    }
    
    입력: "신나게 축구하고 싶어"
    ```json{
    "category": "스포츠",  // ✅ 축구 명시!
    "subcategory": "축구",
    "vibe": "즐거운",
    "keywords": [],
    "confidence": 0.85
    }
    
    입력: "우울할때 가면 좋은 곳"
    ```json{
    "category": null,
    "vibe": "힐링",
    "keywords": [],
    "confidence": 0.5
    }
    
    ================================
    🔑 Confidence 가이드
    ================================
    - 명확한 활동: 0.75~0.95
    - 감정만: 0.4~0.6  // ✅ 낮게!
    - 위치만: 0.5
    
    **JSON만 반환하세요. 설명 금지.**
    
    입력: "{user_prompt}"
    
    아래 JSON 형식으로 파싱하세요:
    {{
      "category": "스포츠|맛집|카페|문화예술|스터디|취미활동|소셜",
      "subcategory": "구체적 활동명 (예: 러닝, 축구, 전시회 등)",
      "vibe": "활기찬|여유로운|힐링|진지한|즐거운|감성적인|건강한|배움",
      "location_query": "지역명",
      "time_slot": "MORNING|AFTERNOON|EVENING|NIGHT",
      "location_type": "INDOOR|OUTDOOR",
      "keywords": ["키워드1", "키워드2"],
      "gender_hint": "M|F|null",  # ✅ NEW!
      "confidence": 0.0-1.0
    }}
    
    **특별 규칙:**
    1. "남자가/남성이/남자" → gender_hint: "M"
    2. "여자가/여성이/여자" → gender_hint: "F"
    3. 성별 힌트가 있으면:
       - 남자: 스포츠, 소셜(당구/볼링) 우선
       - 여자: 카페, 문화예술, 취미활동 우선
    
    예시:
    - "남자가 할만한 모임" → {{"category": "스포츠", "gender_hint": "M"}}
    - "여자가 할만한 모임" → {{"category": "카페", "gender_hint": "F"}}

    EXAMPLES = 
    예시:
    - "배고파" → category: 맛집, location_query: null
    - "퇴근하고 집 근처에서 뭐하지" → category: null, location_query: "집 근처"
    - "강남역 근처 카페" → category: 카페, location_query: "강남역"
    

    ================================
    🎯 subcategory 매핑 (중요!)
    ================================
    **구체적 활동명이 있으면 반드시 subcategory 설정:**
    ================================
    🏠 위치 타입 파싱 규칙 (최우선)
    ================================
    **실내/실외 명시 단어만 인식:**
    
    ✅ OUTDOOR 키워드:
    - "실외", "야외", "밖", "아웃도어", "outdoor"
    
    ✅ INDOOR 키워드:
    - "실내", "인도어", "indoor"
    
    ❌ 절대 혼동 금지:
    - "편안하게", "안전하게" → location_type 설정 안 함
    - "집 안", "방 안" → "안" 단독은 무시
    
    **예시:**
    입력: "실외에서 편안하게"
    ```json
    {
      "location_type": "OUTDOOR",  // ✅ "실외" 명시
      "vibe": "편안한"
    }
    ```
    
    입력: "편안한 카페"
    ```json
    {
      "location_type": null,  // ✅ 명시 없음
      "vibe": "편안한"
    }
    ```

    ✅ 소셜 subcategory:
    - "방탈출" → subcategory="방탈출"
    - "보드게임" → subcategory="보드게임"
    - "볼링" → subcategory="볼링"
    - "당구" → subcategory="당구"
    - "노래방" → subcategory="노래방"
    
    ✅ 스포츠 subcategory:
    - "러닝" → subcategory="러닝"
    - "축구" → subcategory="축구"
    - "배드민턴" → subcategory="배드민턴"
    - "등산" → subcategory="등산"
    - "클라이밍" → subcategory="클라이밍"
    
    ✅ 카페 subcategory:
    - "브런치" → subcategory="브런치"
    - "디저트" → subcategory="디저트"
    
    ✅ 맛집 subcategory:
    - "한식", "중식", "일식", "양식" → subcategory 설정
    - "이자카야", "오마카세" → subcategory 설정
    
    **예시:**
    입력: "방탈출모임이있나"
    ```json
    {
      "category": "소셜",
      "subcategory": "방탈출",  // ✅ 필수!
      "vibe": "즐거운",
      "keywords": [],
      "confidence": 0.7
    }
    ```
    
    입력: "브런치 맛있는곳"
    ```json
    {
      "category": "카페",
      "subcategory": "브런치",  // ✅
      "keywords": [],
      "confidence": 0.75
    }
    ```
    
    입력: "클라이밍 하고싶어"
    ```json
    {
      "category": "스포츠",
      "subcategory": "클라이밍",  // ✅
      "vibe": "활기찬",
      "keywords": [],
      "confidence": 0.8
    }
    ```

    ================================
    🚨 최우선 규칙 (무조건 따르세요)
    ================================
    1. **위치 전용 쿼리는 category 추측 금지**
       - "근처", "주변", "가까운" → location_query만, category=null

    2. **의미 없는 키워드 절대 금지**
       - ❌ "할거없나", "뭐하지", "추천", "모임"
       - ✅ 실제 활동: "카페", "러닝", "공부"

    3. **confidence 최소 0.5 유지**
       - 정말 모르겠으면 0.5
       - 약간 추측 → 0.6
       - 명확 → 0.8+

    ================================
    📍 위치 전용 쿼리 처리
    ================================
    **아래 패턴은 category 추측하지 마세요:**

    입력: "근처에서 쉬엄쉬엄"
    ```json{
    "category": null,  // ✅ 추측 금지!
    "location_query": "근처",
    "vibe": "여유로운",
    "keywords": [],
    "confidence": 0.5
    }

    입력: "제일 가까운 모임"
    ```json{
    "category": null,
    "location_query": "집 근처",  // ✅ "제일 가까운" 대신 실제 위치
    "keywords": [],
    "confidence": 0.5
    }

    입력: "집 근처에서"
    ```json{
    "category": null,
    "location_query": "집 근처",
    "keywords": [],
    "confidence": 0.5
    }
    
    ================================
    🎯 "편안함" 키워드 처리 규칙 (중요!)
    ================================
    **"편안한/편안히/여유로운" + "실내" 조합:**
    
    ✅ 올바른 category 추론:
    - "실내에서 편안히" → category="카페", vibe="편안한"
    - "실내에서 여유롭게" → category="카페", vibe="여유로운"
    - "실내에서 조용히" → category="카페" or "스터디"
    - "실내에서 가볍게 놀기" → category="소셜"
    
    ❌ 절대 금지:
    - "편안히" → category="스포츠" (X)
    - "실내 + 편안" → category=null (X)
    
    **예시:**
    입력: "실내에서 적당히 편안히 할만한거"
    ```json{
    "category": "카페",  // ✅ 편안 = 카페/문화예술
    "location_type": "INDOOR",
    "vibe": "편안한",
    "confidence": 0.65
    }
    
    입력: "실내에서 조용히 집중"
    ```json{
    "category": "스터디",
    "location_type": "INDOOR",
    "vibe": "조용한",
    "confidence": 0.7
    }
    
    EARCH_SYSTEM_PROMPT = 
    당신은 IT-DA 모임 추천 AI입니다. 사용자의 입력을 분석하여 모임 검색에 필요한 정보를 추출합니다.
    
    **감정/상태 키워드 처리 규칙:**
    - "피곤해요", "졸려요", "지쳐요" → category: "카페", vibe: "여유로운", confidence: 0.7
    - "열받아요", "화나요", "스트레스" → category: "스포츠", vibe: "격렬한", confidence: 0.75
    - "우울해요", "심심해요", "외로워요" → category: "소셜", vibe: "즐거운", confidence: 0.7
    - "추워요", "더워요" → location_type: "INDOOR" (추울때), "OUTDOOR" (더울때), confidence: 0.65
    - "배고파요", "배고프다" → category: "맛집", confidence: 0.75
    - "목마르다" → category: "카페", vibe: "여유로운", confidence: 0.7
    - "건강관리", "다이어트" → category: "스포츠", confidence: 0.75
    
    **개인 감정/일상 표현 처리:**
    - "동원이가 예뻐요", "사랑해요", "기분 좋아요" 같은 개인 감정 표현은 **활동 의도가 아님**
      → confidence: 0.3, category: None 반환
    
    **응답 형식:**
    {
      "category": "스포츠|맛집|카페|문화예술|스터디|취미활동|소셜",
      "subcategory": "구체적 활동",
      "location_query": "지명",
      "location_type": "INDOOR|OUTDOOR",
      "time_slot": "MORNING|AFTERNOON|EVENING|NIGHT",
      "vibe": "즐거운|여유로운|격렬한|집중",
      "keywords": ["키워드1", "키워드2"],
      "confidence": 0.0~1.0
    }
    
    SEARCH_SYSTEM_PROMPT =
    당신은 IT-DA 모임 추천 AI입니다.
    
    **감정/상태 키워드 우선 처리:**
    1. "피곤해요", "졸려요", "지쳐요" → {"category": "카페", "vibe": "여유로운", "confidence": 0.75}
    2. "열받아요", "화나요", "스트레스" → {"category": "스포츠", "vibe": "격렬한", "confidence": 0.8}
    3. "외로워요", "심심해요" → {"category": "소셜", "vibe": "즐거운", "confidence": 0.75}
    4. **"힐링", "번아웃", "휴식", "여유" → {"category": "카페", "vibe": "힐링", "confidence": 0.8}**  ✅ 추가
    5. "배고파요" → {"category": "맛집", "confidence": 0.8}

    SEARCH_SYSTEM_PROMPT =
    당신은 IT-DA 모임 추천 AI입니다. 사용자의 입력을 분석하여 모임 검색에 필요한 정보를 추출합니다.
    
    **감정/상태 키워드 우선 처리:**
    1. "피곤해요", "졸려요" → {"category": "카페", "vibe": "여유로운", "confidence": 0.75}
    2. "열받아요", "화나요", "스트레스받아요" → {"category": "스포츠", "vibe": "격렬한", "confidence": 0.8}
    3. "외로워요", "심심해요" → {"category": "소셜", "vibe": "즐거운", "confidence": 0.75}
    4. "배고파요" → {"category": "맛집", "confidence": 0.8}
    5. "목마르다" → {"category": "카페", "vibe": "여유로운", "confidence": 0.7}
    6. "추워요" → {"location_type": "INDOOR", "confidence": 0.7}
    7. "더워요" → {"location_type": "OUTDOOR", "confidence": 0.65}
    
    **활동 의도가 없는 표현 (낮은 confidence 반환):**
    - "사랑해요", "좋아해요", "예뻐요" 같은 감정 표현만 있는 경우
    - "발가락 아파요", "머리카락 짧아요" 같은 신체 상태만 언급
    → {"category": null, "confidence": 0.3}
    
    **응답 형식:**
    {
      "category": "스포츠|맛집|카페|문화예술|스터디|취미활동|소셜",
      "subcategory": "구체적 활동",
      "location_query": "지명",
      "location_type": "INDOOR|OUTDOOR",
      "time_slot": "MORNING|AFTERNOON|EVENING|NIGHT",
      "vibe": "즐거운|여유로운|격렬한|집중",
      "keywords": ["키워드1", "키워드2"],
      "confidence": 0.0~1.0
    }

    ================================
    🎯 활동 명시 쿼리 처리
    ================================
    **구체적 활동이 있으면 category 설정:**

    입력: "퇴근하고 할거없나"
    ```json{
    "category": "소셜",  // ✅ "퇴근" 시간대 + 놀이 의도
    "time_slot": "evening",
    "vibe": "즐거운",
    "keywords": [],  // ✅ "퇴근", "할거없나" 제외
    "confidence": 0.6
    }

    입력: "친구랑 놀고싶은데"
    ```json{
    "category": "소셜",
    "vibe": "즐거운",
    "keywords": [],  // ✅ "친구", "놀이" 제외 (category로 충분)
    "confidence": 0.6
    }

    입력: "공부할만한 모임"
    ```json{
    "category": "스터디",
    "vibe": "집중",
    "keywords": [],  // ✅ "공부", "스터디" 제외
    "confidence": 0.7
    }

    ================================
    🔑 keywords 규칙 (엄격)
    ================================
    **keywords는 category로 표현 안 되는 것만:**

    ✅ 좋은 예:
    - "잠실 근처 카페" → category="카페", keywords=["잠실"]
    - "저녁 7시 러닝" → category="스포츠", subcategory="러닝", keywords=[]
    - "브런치 맛집" → category="카페", subcategory="브런치", keywords=[]

    ❌ 나쁜 예:
    - keywords=["퇴근", "소셜", "할거없나"]  // 불필요
    - keywords=["공부", "스터디", "모임"]  // category 중복
    - keywords=["친구", "놀이"]  // category="소셜"로 충분

    ================================
    ⏰ 시간대 파싱 규칙
    ================================
    **명확한 시간 표현만 time_slot으로:**

    ✅ 포함:
    - "아침", "점심", "저녁", "밤"
    - "오전", "오후", "저녁시간"
    - "퇴근" → "evening" ✅

    ❌ 제외:
    - "주말", "평일" (시간대 아님)

    입력: "그냥 나른한 오후에 할만한거"
    ```json{
    "category": "카페",
    "time_slot": "afternoon",  // ✅
    "vibe": "나른한",
    "keywords": [],
    "confidence": 0.65
    }

    
    ================================
    🎨 vibe 키워드 매핑 (중요!)
    ================================
    **격렬함/활동성 키워드:**
    - "격정적", "격렬", "열정적", "강렬", "하드" → vibe="격렬한", category="스포츠"
    - "신나는", "에너지", "활발" → vibe="활기찬", category="스포츠"
    - "땀", "운동", "뛰", "달리" → vibe="활기찬", category="스포츠"
    
    **차분함/편안함 키워드:**
    - "편안한", "여유로운", "조용한" → vibe="편안한", category="카페"
    - "힐링", "차분", "평화" → vibe="조용한"
    
    **예시:**
    입력: "실외에서 격정적으로 할만한거"
    ```json{
    "category": "스포츠",  // ✅ 격정적 = 운동!
    "location_type": "OUTDOOR",
    "vibe": "격렬한",
    "confidence": 0.7
    }
    
    입력: "실내에서 편안히"
    ```json{
    "category": "카페",
    "location_type": "INDOOR",
    "vibe": "편안한",
    "confidence": 0.65
    }

    ================================
    📊 Confidence 가이드
    ================================
    - 0.8~0.95: "강남역 저녁 7시 이탈리안"
    - 0.6~0.75: "퇴근하고 할거없나", "공부할만한 모임" ✅
    - 0.5: "근처에서", "제일 가까운"

    ================================
    ✅ 최종 체크리스트
    ================================
    1. [ ] 위치 전용이면 category=null
    2. [ ] keywords에 불필요한 단어 없음
    3. [ ] confidence >= 0.5
    4. [ ] vibe 적절히 매핑
    5. [ ] time_slot은 실제 시간대만

    **JSON만 반환하세요. 설명 금지.**
    """


    def _fallback_parse(self, user_prompt: str) -> Dict:
        """GPT 실패 시 기본 파싱 - 실내/실외 키워드 감지 추가"""
        logger.warning(f"⚠️ Fallback 파싱 사용: {user_prompt}")

        # ✅ 실내/실외 키워드 감지
        location_type = None
        lower_prompt = user_prompt.lower()
        if any(kw in lower_prompt for kw in ["실내", "안", "indoor", "인도어"]):
            location_type = "INDOOR"
        elif any(kw in lower_prompt for kw in ["실외", "야외", "밖", "outdoor", "아웃도어"]):
            location_type = "OUTDOOR"

        keywords = [word for word in user_prompt.split() if len(word) > 1]

        return {
            "category": None,
            "subcategory": None,
            "time_slot": None,
            "location_query": None,
            "location_type": location_type,  # ✅ 추가
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

        # ✅ 대신 별도 필드로만 보관 (랭킹에서만 사용)
        if user_context.get("time_preference"):
            enriched["user_time_preference"] = user_context["time_preference"]

        # 예산 정보
        if user_context.get("budget_type"):
            enriched["user_budget_type"] = user_context["budget_type"]

        # 관심사 정보
        if user_context.get("interests"):
            enriched["user_interests"] = user_context["interests"]

        return enriched

    def _post_fix_ambiguous_ball_play(self, user_prompt: str, parsed: Dict) -> Dict:
        p = (user_prompt or "").lower()
        sub = (parsed.get("subcategory") or "").strip().lower()
        conf = float(parsed.get("confidence") or 0.0)

        # 사용자가 명시적으로 축구/풋살을 말했는지
        explicit_soccer = any(k in p for k in ["축구", "풋살", "풋살장", "soccer", "futsal"])

        # 애매한 "공놀이/공차기" 류
        ambiguous_ball = any(k in p for k in ["공놀이", "공놀이", "공차", "공 차", "볼놀이", "공 가지고", "공으로"])

        if ambiguous_ball and not explicit_soccer:
            # GPT가 축구로 찍었으면 강등
            if sub in ["축구", "soccer", "futsal"] or (parsed.get("category") == "스포츠" and sub == "축구"):
                parsed["subcategory"] = None
                # 너무 확신 높게 찍었으면 낮춰서 downstream이 덜 믿게
                parsed["confidence"] = min(conf, 0.7)

                # 키워드에 힌트(랭킹에서 쓰고 싶으면)
                kws = parsed.get("keywords") or []
                if "공놀이" not in [x.lower() for x in kws]:
                    kws.append("공놀이")
                parsed["keywords"] = kws[:5]

        # 반대로, 사용자가 "풋살" 말했는데 subcategory가 "축구"면 정규화(DB에 풋살만 있을 때 유리)
        if "풋살" in p and parsed.get("subcategory") == "축구":
            parsed["subcategory"] = "풋살"

        return parsed