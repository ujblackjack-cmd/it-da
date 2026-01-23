# app/api/recommendations.py
from typing import List, Dict

from fastapi import APIRouter, HTTPException, Depends
from app.schemas.place import (
    PlaceRecommendRequest,
    PlaceRecommendResponse
)
from app.services.place_recommendation_service import PlaceRecommendationService
from app.core.logging import logger

router = APIRouter(prefix="/api/ai", tags=["AI Recommendations"])

@router.post("/recommend-place", response_model=PlaceRecommendResponse)
async def recommend_place(req: PlaceRecommendRequest):
    service = PlaceRecommendationService()
    return await service.recommend_places(
        participants=[p.model_dump() for p in req.participants],
        meeting_title=req.meeting_title,
        meeting_description=req.meeting_description or "",
        category=req.meeting_category or "",
        max_distance=req.max_distance,
        top_n=req.top_n
    )

    """
    모임 참가자 위치 기반 장소 추천

    **Flow:**
    1. 참가자들의 중간 지점 계산
    2. 모임 제목/설명을 GPT로 분석하여 키워드 추출
    3. 카카오맵 API로 키워드별 장소 검색
    4. 거리순 정렬 후 상위 3개 반환
    """
    try:
        service = PlaceRecommendationService()

        result = await service.recommend_places(
            participants=participants,
            meeting_title=meeting_title,
            meeting_description=meeting_description,
            category=category,
            max_distance=max_distance,
            top_n=top_n
        )

        return result

    except Exception as e:
        logger.error(f"장소 추천 API 실패: {e}")
        raise HTTPException(status_code=500, detail=str(e))