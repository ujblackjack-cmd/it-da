"""
AI Recommendation Service (통합 오케스트레이터)
GPT 파싱 → DB 검색 → AI 모델 추천 통합
"""

import httpx
import uuid
from typing import List, Dict, Optional

from app.core.logging import logger
from app.services.gpt_prompt_service import GPTPromptService
from app.models.model_loader import model_loader

# Query 모듈
from app.services.query import QueryNormalizer, QueryPostProcessor, QueryBuilder

# Search 모듈
from app.services.search import SearchStrategy, MeetingSearchService

# Scoring 모듈
from app.services.scoring import MeetingScorer, IntentAdjuster

# Intent 모듈
from app.services.intent import IntentDetector

# Fallback 모듈
from app.services.fallback import SVDRecommender, ReasoningGenerator

# Utils 모듈
from app.services.utils import QueryTermExtractor


class AIRecommendationService:
    """AI 추천 통합 서비스 - 메인 오케스트레이터"""

    # 개인 감정 표현 키워드 (클래스 변수로 이동)
    PERSONAL_EMOTIONS = {
        "love": ["사랑해", "좋아해", "예뻐", "이뻐", "멋져", "최고"],
        "praise": ["잘했어", "대단해", "훌륭해", "멋있어"],
        "random": ["동원이", "진우", "클로드"],  # 이름
        "body_part": ["발가락", "손가락", "머리카락", "무릎"],  # 신체 부위 (활동 무관)
    }

    def __init__(
        self,
        gpt_service: GPTPromptService,
        spring_boot_url: str = "http://localhost:8080"
    ):
        """
        Args:
            gpt_service: GPT 서비스
            spring_boot_url: Spring Boot API URL
        """
        self.gpt_service = gpt_service
        self.spring_boot_url = spring_boot_url

        # Query 모듈
        self.normalizer = QueryNormalizer()
        self.postprocessor = QueryPostProcessor(self.normalizer)
        self.query_builder = QueryBuilder(self.normalizer)

        # Search 모듈
        self.search_strategy = SearchStrategy()
        self.search_service = MeetingSearchService(
            spring_boot_url=spring_boot_url,
            query_builder=self.query_builder,
            search_strategy=self.search_strategy,
            normalizer=self.normalizer
        )

        # Scoring 모듈
        self.intent_detector = IntentDetector()
        self.intent_adjuster = IntentAdjuster(self.normalizer)
        self.scorer = MeetingScorer(
            model_loader=model_loader,
            normalizer=self.normalizer,
            intent_adjuster=self.intent_adjuster
        )

        # Fallback 모듈
        self.svd_recommender = SVDRecommender(
            model_loader=model_loader,
            spring_boot_url=spring_boot_url
        )
        self.reasoning_generator = ReasoningGenerator(gpt_service)

        # Utils
        self.query_term_extractor = QueryTermExtractor()

    async def get_ai_recommendations(
        self,
        user_prompt: str,
        user_id: int,
        top_n: int = 5
    ) -> Dict:
        """
        AI 기반 모임 추천 (메인 파이프라인)

        Args:
            user_prompt: 유저 입력 프롬프트
            user_id: 유저 ID
            top_n: 추천 개수

        Returns:
            추천 결과
        """
        rid = str(uuid.uuid4())[:8]
        logger.info(f"[RID={rid}] 🔍 AI 검색 요청: user_id={user_id}, prompt='{user_prompt}'")

        try:
            # ==========================================
            # Step 1: GPT 파싱
            # ==========================================
            parsed_query = await self.gpt_service.parse_search_query(user_prompt)

            # ✅ 감정 전용 검색어 후처리
            emotion_keywords = ["힐링", "짜증", "신난", "여유", "편안", "피곤", "우울"]
            is_emotion_only = any(kw in user_prompt for kw in emotion_keywords)

            if is_emotion_only and parsed_query.get("vibe") and parsed_query.get("category"):
                logger.info(f"[POST_FIX] 감정 전용 검색 감지: '{user_prompt}' → category '{parsed_query['category']}' 제거")
                parsed_query["category"] = None
                parsed_query["emotion_only_search"] = True

            # Taxonomy 교정
            parsed_query = self.normalizer.normalize_taxonomy(parsed_query)

            # Post-processing (배고파, 사진, 뇌, 춤, 감정 등)
            parsed_query = self.postprocessor.post_fix(user_prompt, parsed_query)

            # Category 증거 기반 가드
            parsed_query = self.postprocessor.guard_category_by_evidence(user_prompt, parsed_query)

            # Vibe prior 적용
            parsed_query = self.normalizer.apply_vibe_prior(parsed_query)

            # Vibe 정규화
            parsed_query["vibe"] = self.normalizer.normalize_vibe(parsed_query.get("vibe"))

            # ==========================================
            # Step 2: 사용자 컨텍스트 조회
            # ==========================================
            user_context = await self._get_user_context(user_id)
            logger.info(f"[CTX] lat={user_context.get('latitude')} lng={user_context.get('longitude')}")

            # ==========================================
            # Step 2.5: 개인 감정 표현 체크
            # ==========================================
            if self._is_personal_emotion(user_prompt, parsed_query):
                logger.warning(f"⚠️ 개인 감정 표현 감지: '{user_prompt}' → clarification")

                clarification_card = self._make_clarification_card(
                    user_prompt, parsed_query, user_context
                )

                return {
                    "user_prompt": user_prompt,
                    "parsed_query": parsed_query,
                    "total_candidates": 0,
                    "recommendations": [clarification_card],
                    "search_trace": {
                        "steps": [],
                        "final_level": 0,
                        "final_label": "PERSONAL_EMOTION_CLARIFICATION",
                        "fallback": False
                    }
                }

            # ==========================================
            # Step 2.6: 초애매 케이스 체크
            # ==========================================
            kw = parsed_query.get("keywords") or []
            conf = float(parsed_query.get("confidence", 0) or 0)
            cat = parsed_query.get("category")
            sub = parsed_query.get("subcategory")
            vibe = parsed_query.get("vibe")
            ts = parsed_query.get("time_slot")
            loc_q = parsed_query.get("location_query")

            # 초애매 케이스: SVD + Clarification
            if conf < 0.6 and len(kw) == 0 and not cat and not sub and not vibe and not ts and not loc_q:
                logger.warning(f"⚠️ 초애매 검색어 감지 (conf={conf:.2f}): '{user_prompt}' → SVD fallback + clarification")

                svd_data = await self.svd_recommender.recommend(
                    user_id, user_prompt, parsed_query, top_n, user_context
                )

                clarification_card = self._make_clarification_card(user_prompt, parsed_query, user_context)

                recommendations = svd_data.get("recommendations", [])[:top_n]
                recommendations.append(clarification_card)

                return {
                    "user_prompt": user_prompt,
                    "parsed_query": parsed_query,
                    "total_candidates": svd_data.get("total_candidates", 0),
                    "recommendations": recommendations,
                    "search_trace": {
                        "steps": [],
                        "final_level": 0,
                        "final_label": "SVD_FALLBACK_WITH_CLARIFY",
                        "fallback": True
                    }
                }

            # ==========================================
            # Step 3: 쿼리 보강 (GPT)
            # ==========================================
            enriched_query = await self.gpt_service.enrich_with_user_context(parsed_query, user_context)

            # ✅ 🔥 검색 전에 최종 체크!
            emotion_keywords = ["힐링", "짜증", "신난", "여유", "편안", "피곤", "우울"]
            is_emotion_only = any(kw in user_prompt for kw in emotion_keywords)

            if is_emotion_only and enriched_query.get("vibe"):
                activity_keywords = [
                    "카페", "맛집", "축구", "러닝", "전시", "공연",
                    "스터디", "공부", "요가", "명상", "볼링", "방탈출"
                ]
                has_activity = any(kw in user_prompt for kw in activity_keywords)

                if not has_activity:
                    logger.info(f"[FINAL_FIX] 감정 전용 재확정: category 강제 제거!")
                    enriched_query["category"] = None
                    enriched_query["subcategory"] = None
                    enriched_query["emotion_only_search"] = True

            # ==========================================
            # Step 4: 검색 (Relaxation)
            # ==========================================
            trace_steps: list = []
            base_query = self.search_strategy.pre_relax_query_by_conf(enriched_query)

            logger.info(f"🔥🔥🔥 [DEBUG] base_query 확인: {base_query}")
            logger.info(f"🔥🔥🔥 [DEBUG] _search_with_relaxation 호출 직전!")

            candidate_meetings = await self.search_service.search_with_relaxation(
                base_query, user_context, trace_steps, user_prompt
            )

            logger.info(f"🔥🔥🔥 [DEBUG] _search_with_relaxation 완료!")
            logger.info(f"🔥🔥🔥 [DEBUG] candidate_meetings 개수: {len(candidate_meetings) if candidate_meetings else 0}")

            # ==========================================
            # Step 4.5: 검색 결과 없으면 SVD fallback
            # ==========================================
            if not candidate_meetings:
                logger.warning("⚠️ 검색 결과 없음 - SVD 기반 추천으로 대체")
                data = await self.svd_recommender.recommend(
                    user_id, user_prompt, parsed_query, top_n, user_context
                )

                # Intent 보정
                intent = self.intent_detector.detect(user_prompt, enriched_query)

                for rec in data.get("recommendations", []):
                    adjustment = self.intent_adjuster.adjust(intent, rec, enriched_query)
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

            # ==========================================
            # Step 5: 쿼리 키워드 추출
            # ==========================================
            query_terms = self.query_term_extractor.extract(user_prompt, parsed_query)


            # ==========================================
            # Step 6: AI 점수 계산
            # ==========================================
            logger.info(f"[Step 5] AI 점수 계산: {len(candidate_meetings)}개 모임")

            intent = self.intent_detector.detect(user_prompt, enriched_query)

            scored_meetings = await self.scorer.score_meetings(
                user_id,
                user_context,
                candidate_meetings,
                enriched_query,
                intent,
                user_prompt=user_prompt,
                query_terms=query_terms
            )

            # Intent 태깅
            for m in scored_meetings:
                m["intent"] = intent

            # ==========================================
            # Step 7: 상위 N개 선택 (query-hit 우선)
            # ==========================================
            sorted_all = sorted(scored_meetings, key=lambda x: x["match_score"], reverse=True)

            # query-hit 판정
            def is_query_hit(rec: dict) -> bool:
                hay = f"{(rec.get('title') or '')} {(rec.get('subcategory') or '')} {(rec.get('category') or '')}".lower()
                for t in (query_terms or []):
                    if t and t.lower() in hay:
                        return True
                return False

            hits = [r for r in sorted_all if is_query_hit(r)]
            others = [r for r in sorted_all if not is_query_hit(r)]

            # 최소 2개는 hit로 채움
            must = 2 if top_n >= 4 else 1
            picked = []

            picked.extend(hits[:must])
            picked.extend([r for r in others if r not in picked])

            top_recommendations = picked[:top_n]

            # ==========================================
            # Step 8: Reasoning 생성
            # ==========================================
            for rec in top_recommendations:
                if (not parsed_query.get("keywords")) or parsed_query.get("confidence", 0) < 0.6:
                    rec["reasoning"] = self.reasoning_generator.fallback_reasoning(rec, parsed_query)
                else:
                    rec["reasoning"] = await self.reasoning_generator.generate(
                        user_context, rec, parsed_query
                    )

            logger.info("🏁 TOP=%s", [
                (r.get("meeting_id"), r.get("title"), r.get("category"), r.get("subcategory"))
                for r in top_recommendations
            ])

            # ==========================================
            # Step 9: 최종 응답
            # ==========================================
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
            logger.error(f"❌ AI 추천 실패: {e}", exc_info=True)
            raise

    # ==========================================
    # Helper Methods
    # ==========================================

    async def _get_user_context(self, user_id: int) -> Dict:
        """사용자 컨텍스트 조회"""
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

    def _is_personal_emotion(self, user_prompt: str, parsed_query: dict) -> bool:
        """개인 감정 표현 감지"""

        text = user_prompt.lower()
        conf = float(parsed_query.get("confidence", 0) or 0)

        # 1) 개인 감정 키워드 체크
        for category, keywords in self.PERSONAL_EMOTIONS.items():
            if any(kw in text for kw in keywords):
                # 활동 키워드가 함께 있으면 OK
                activity_keywords = [
                    "모임", "만나", "같이", "함께", "할래", "하고싶",
                    "추천", "찾아", "해줘", "있을까"
                ]
                has_activity = any(ak in text for ak in activity_keywords)

                if not has_activity:
                    logger.info(f"[PERSONAL_EMOTION] {category} 감지: '{text}'")
                    return True

        # 2) 신체 부위 + 통증 (활동 무관)
        body_pain = ["아파", "아픈", "통증", "쑤셔", "저려"]
        has_body_part = any(bp in text for bp in self.PERSONAL_EMOTIONS["body_part"])
        has_pain = any(p in text for p in body_pain)

        if has_body_part and has_pain:
            # "등산 후 발가락 아픔" 같은 건 OK
            if "후" not in text and "때문" not in text:
                return True

        # 3) 매우 낮은 confidence + 아무 정보 없음 (이미 Step 2.6에서 처리됨)
        # 중복 체크 방지를 위해 제거

        return False

    def _make_clarification_card(self, user_prompt: str, parsed_query: dict, user_context: dict) -> dict:
        """Clarification 카드 생성 (개선)"""

        # 감정별 맞춤 메시지
        text = user_prompt.lower()

        if any(w in text for w in ["사랑", "좋아", "예뻐", "이뻐"]):
            suggestion = "좋아하는 사람과 함께 할 활동을 말해주세요!"
            examples = [
                "예: 좋아하는 사람이랑 카페 가기",
                "예: 데이트로 전시회 보기",
                "예: 친구랑 맛집 탐방",
            ]
        elif any(w in text for w in ["발가락", "손가락", "무릎"]):
            suggestion = "어떤 활동을 하고 싶으신가요?"
            examples = [
                "예: 가벼운 산책하기",
                "예: 실내 요가하기",
                "예: 카페에서 책 읽기",
            ]
        else:
            suggestion = "어떤 걸 하고 싶은지 한 가지만 더 알려줘요!"
            examples = [
                "예: 집 근처 카페에서 브런치",
                "예: 실내에서 보드게임",
                "예: 밖에서 러닝하기",
            ]

        return {
            "meeting_id": -1,
            "title": f"{suggestion} 🙂",
            "category": "SYSTEM",
            "subcategory": "CLARIFY",
            "location_name": "추천을 위해 좀 더 구체적인 정보가 필요해요",
            "image_url": None,
            "match_score": 0,
            "match_level": "INFO",
            "predicted_rating": None,
            "key_points": examples,
            "reasoning": (
                f"지금 입력하신 '{user_prompt}'만으로는 어떤 모임을 추천해야 할지 "
                f"판단하기 어려워요. {suggestion}"
            ),
            "is_clarification": True,
            "intent": "NEUTRAL",
        }