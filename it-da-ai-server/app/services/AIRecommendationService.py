"""
AI Recommendation Integration Service
GPT 파싱 → DB 검색 → AI 모델 추천 통합
"""

import httpx
from typing import List, Dict, Optional
from app.services.gpt_prompt_service import GPTPromptService
from app.models.model_loader import model_loader
from app.core.logging import logger
import math


class AIRecommendationService:
    """AI 추천 통합 서비스"""

    def __init__(
        self,
        gpt_service: GPTPromptService,
        spring_boot_url: str = "http://localhost:8080"
    ):
        self.gpt_service = gpt_service
        self.spring_boot_url = spring_boot_url

    async def get_ai_recommendations(
        self,
        user_prompt: str,
        user_id: int,
        top_n: int = 5
    ) -> Dict:
        """
        전체 AI 추천 파이프라인

        Args:
            user_prompt: "오늘 저녁 강남에서 러닝할 사람~"
            user_id: 사용자 ID
            top_n: 추천 개수

        Returns:
            {
                "user_prompt": "...",
                "parsed_query": {...},
                "recommendations": [
                    {
                        "meeting_id": 42,
                        "title": "한강 선셋 러닝",
                        "match_score": 96,
                        "predicted_rating": 4.8,
                        "key_points": [...],
                        "reasoning": "..."
                    }
                ]
            }
        """
        try:
            # Step 1: GPT 프롬프트 파싱
            logger.info(f"[Step 1] GPT 프롬프트 파싱: {user_prompt}")
            parsed_query = await self.gpt_service.parse_search_query(user_prompt)

            # Step 2: 사용자 컨텍스트 조회
            logger.info(f"[Step 2] 사용자 컨텍스트 조회: user_id={user_id}")
            user_context = await self._get_user_context(user_id)

            # Step 3: 쿼리 보강
            enriched_query = await self.gpt_service.enrich_with_user_context(
                parsed_query,
                user_context
            )

            # Step 4: 후보 모임 검색 (Spring Boot)
            logger.info(f"[Step 4] 후보 모임 검색")
            candidate_meetings = await self._search_meetings(enriched_query)

            if not candidate_meetings:
                logger.warning("⚠️ 검색 결과 없음 - SVD 기반 추천으로 대체")
                return await self._fallback_svd_recommendation(
                    user_id,
                    user_prompt,
                    parsed_query,
                    top_n
                )

            # Step 5: AI 모델로 점수 계산 (LightGBM + SVD)
            logger.info(f"[Step 5] AI 점수 계산: {len(candidate_meetings)}개 모임")
            scored_meetings = await self._score_meetings(
                user_id,
                user_context,
                candidate_meetings
            )

            # Step 6: 상위 N개 선택
            top_recommendations = sorted(
                scored_meetings,
                key=lambda x: x["match_score"],
                reverse=True
            )[:top_n]

            # Step 7: 추천 이유 생성 (KcELECTRA 감성 분석 활용 가능)
            for rec in top_recommendations:
                rec["reasoning"] = await self._generate_reasoning(
                    user_context,
                    rec,
                    parsed_query
                )

            return {
                "user_prompt": user_prompt,
                "parsed_query": parsed_query,
                "total_candidates": len(candidate_meetings),
                "recommendations": top_recommendations
            }

        except Exception as e:
            logger.error(f"❌ AI 추천 실패: {e}")
            raise

    async def _get_user_context(self, user_id: int) -> Dict:
        """Spring Boot에서 사용자 컨텍스트 조회"""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(
                    f"{self.spring_boot_url}/api/users/{user_id}/context"
                )

                if response.status_code == 200:
                    return response.json()
                else:
                    logger.warning(f"⚠️ 사용자 컨텍스트 조회 실패: {response.status_code}")
                    return {}
        except Exception as e:
            logger.error(f"⚠️ Spring Boot 연결 실패: {e}")
            return {}

    async def _search_meetings(self, enriched_query: Dict) -> List[Dict]:
        """Spring Boot에서 후보 모임 검색"""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    f"{self.spring_boot_url}/api/meetings/search",
                    json=enriched_query
                )

                if response.status_code == 200:
                    result = response.json()
                    return result.get("meetings", [])
                else:
                    logger.warning(f"⚠️ 모임 검색 실패: {response.status_code}")
                    return []
        except Exception as e:
            logger.error(f"⚠️ 모임 검색 API 호출 실패: {e}")
            return []

    async def _score_meetings(
        self,
        user_id: int,
        user_context: Dict,
        meetings: List[Dict]
    ) -> List[Dict]:
        """AI 모델로 모임 점수 계산"""
        scored = []

        for meeting in meetings:
            try:
                # LightGBM으로 만족도 예측
                lightgbm_score = await self._predict_satisfaction(
                    user_context,
                    meeting
                )

                # SVD로 협업 필터링 점수 계산
                svd_score = await self._get_svd_score(user_id, meeting["meeting_id"])

                # 최종 점수 = LightGBM 70% + SVD 30%
                final_score = (lightgbm_score * 0.7) + (svd_score * 0.3)

                # 매치 점수 (0~100)
                match_score = min(100, int(final_score * 20))

                scored.append({
                    **meeting,
                    "match_score": match_score,
                    "predicted_rating": round(lightgbm_score, 1),
                    "svd_score": round(svd_score, 2),
                    "key_points": self._extract_key_points(user_context, meeting)
                })

            except Exception as e:
                logger.error(f"⚠️ 모임 점수 계산 실패 (meeting_id={meeting.get('meeting_id')}): {e}")
                continue

        return scored

    async def _predict_satisfaction(
        self,
        user_context: Dict,
        meeting: Dict
    ) -> float:
        """LightGBM으로 만족도 예측"""
        try:
            if not model_loader.lightgbm or not model_loader.lightgbm.is_loaded():
                return 3.5  # fallback

            # 특징 추출
            features, x = model_loader.feature_builder.build(user_context, meeting)

            # 예측
            pred = model_loader.lightgbm.predict(x)[0]

            # 1~5 평점으로 변환
            s = 1.0 / (1.0 + math.exp(-float(pred)))
            rating = max(1.0, min(5.0, 1.0 + 4.0 * s))

            return rating

        except Exception as e:
            logger.error(f"⚠️ LightGBM 예측 실패: {e}")
            return 3.5

    async def _get_svd_score(self, user_id: int, meeting_id: int) -> float:
        """SVD 협업 필터링 점수"""
        try:
            if not model_loader.svd or not model_loader.svd.is_loaded():
                return 3.5

            # ✅ await 추가
            rating = await model_loader.svd.predict_rating(user_id, meeting_id)
            return rating

        except Exception:
            return 3.5

    def _extract_key_points(self, user_context: Dict, meeting: Dict) -> List[str]:
        """핵심 포인트 추출"""
        points = []

        # 거리
        if meeting.get("distance_km") and meeting["distance_km"] <= 3:
            points.append(f"집에서 {meeting['distance_km']:.1f}km로 가까워요")

        # 시간대 매칭
        if meeting.get("time_slot") == user_context.get("time_preference"):
            points.append("선호하는 시간대와 완벽하게 일치해요")

        # 카테고리 매칭
        user_interests = user_context.get("interests", "").split(",")
        if meeting.get("category") in user_interests:
            points.append(f"{meeting['category']} 카테고리 관심사와 일치해요")

        # 비용
        if meeting.get("expected_cost", 0) == 0:
            points.append("무료 모임으로 부담 없어요")

        # 평점
        if meeting.get("avg_rating") and meeting["avg_rating"] >= 4.5:
            points.append(f"평점 {meeting['avg_rating']}점의 인기 모임이에요")

        return points[:5]

    async def _generate_reasoning(
        self,
        user_context: Dict,
        meeting: Dict,
        parsed_query: Dict
    ) -> str:
        """추천 이유 생성"""
        reasoning_parts = []

        # 쿼리 매칭
        if parsed_query.get("category") == meeting.get("category"):
            reasoning_parts.append(
                f"{parsed_query['category']} 카테고리를 검색하셨고, "
                f"이 모임은 정확히 일치합니다."
            )

        # 거리
        if meeting.get("distance_km"):
            reasoning_parts.append(
                f"현재 위치에서 {meeting['distance_km']:.1f}km 거리에 있어 "
                f"이동이 편리합니다."
            )

        # 시간대
        if meeting.get("time_slot") == user_context.get("time_preference"):
            reasoning_parts.append(
                f"평소 선호하시는 {meeting['time_slot']} 시간대와 일치합니다."
            )

        # 과거 참여 이력 (SVD 기반)
        if user_context.get("user_avg_rating", 0) >= 4.0:
            reasoning_parts.append(
                f"과거 참여하신 모임들의 평균 만족도가 {user_context['user_avg_rating']:.1f}점으로, "
                f"유사한 모임에서 높은 만족도를 보이셨습니다."
            )

        if reasoning_parts:
            return " ".join(reasoning_parts)
        else:
            return "이 모임은 당신의 취향과 잘 맞을 것으로 예상됩니다."

    async def _fallback_svd_recommendation(
        self,
        user_id: int,
        user_prompt: str,
        parsed_query: Dict,
        top_n: int
    ) -> Dict:
        """검색 결과 없을 때 SVD 기반 추천"""
        try:
            if not model_loader.svd or not model_loader.svd.is_loaded():
                raise Exception("SVD 모델 로드되지 않음")

            # SVD 추천
            svd_recommendations = await model_loader.svd.recommend(
                user_id=user_id,
                top_n=top_n * 2  # 여유있게 가져오기
            )

            # Spring Boot에서 모임 정보 조회
            meeting_ids = [int(meeting_id) for meeting_id, _ in svd_recommendations]
            meetings = await self._get_meetings_by_ids(meeting_ids)

            # 점수 매핑
            scored_meetings = []
            for meeting in meetings:
                svd_score = next(
                    (score for mid, score in svd_recommendations if mid == meeting["meeting_id"]),
                    3.5
                )

                scored_meetings.append({
                    **meeting,
                    "match_score": min(100, int(svd_score * 20)),
                    "predicted_rating": round(svd_score, 1),
                    "svd_score": round(svd_score, 2),
                    "key_points": ["SVD 협업 필터링 기반 추천"],
                    "reasoning": "과거 참여 이력을 바탕으로 추천된 모임입니다."
                })

            return {
                "user_prompt": user_prompt,
                "parsed_query": parsed_query,
                "total_candidates": len(scored_meetings),
                "recommendations": scored_meetings[:top_n],
                "fallback": True
            }

        except Exception as e:
            logger.error(f"❌ SVD Fallback 실패: {e}")
            raise

    async def _get_meetings_by_ids(self, meeting_ids: List[int]) -> List[Dict]:
        """Spring Boot에서 모임 정보 조회"""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    f"{self.spring_boot_url}/api/meetings/batch",
                    json={"meeting_ids": meeting_ids}
                )

                if response.status_code == 200:
                    result = response.json()
                    return result.get("meetings", [])
                else:
                    return []
        except Exception as e:
            logger.error(f"⚠️ 모임 정보 조회 실패: {e}")
            return []