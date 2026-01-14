"""
AI Routes for Spring Boot Integration
"""

from fastapi import APIRouter, HTTPException,Depends
from pydantic import BaseModel, Field
from typing import List, Dict, Optional
from app.models.model_loader import model_loader
from app.core.logging import logger
from typing import Dict
from app.schemas.ai_schemas import AISearchRequest, AISearchResponse
from app.services.gpt_prompt_service import GPTPromptService
from app.services.AIRecommendationService import AIRecommendationService
import math
import uuid
import os

router = APIRouter(prefix="/api/ai/recommendations", tags=["AI"])

# ========================================
# Request/Response Models (Spring Boot 호환)
# ========================================

class RecommendRequest(BaseModel):
    user_id: int
    top_n: int = 10

class RecommendResponse(BaseModel):
    user_id: int
    recommended_meetings: List[Dict]  # [{"meeting_id": 1, "predicted_score": 4.5, "rank": 1}]
    total_count: int

class SatisfactionRequest(BaseModel):
    user_id: int
    meeting_id: int
    # Spring Boot에서 전달받을 사용자/모임 정보
    user_lat: float
    user_lng: float
    user_interests: str
    user_time_preference: str
    user_location_pref: str
    user_budget_type: str
    user_avg_rating: float
    user_meeting_count: int
    user_rating_std: float
    meeting_lat: float
    meeting_lng: float
    meeting_category: str
    meeting_subcategory: str
    meeting_time_slot: str
    meeting_location_type: str
    meeting_vibe: str
    meeting_max_participants: int
    meeting_expected_cost: int
    meeting_avg_rating: Optional[float] = 0.0
    meeting_rating_count: int = 0
    meeting_participant_count: int = 0

class SatisfactionResponse(BaseModel):
    user_id: int
    meeting_id: int
    predicted_rating: float
    rating_stars: str
    satisfaction_level: str
    recommended: bool
    reasons: List[Dict]  # [{"icon": "📍", "text": "..."}]

class SentimentRequest(BaseModel):
    text: str

class SentimentResponse(BaseModel):
    text: str
    sentiment: str
    score: float
    probabilities: Dict[str, float]

class CentroidRequest(BaseModel):
    user_locations: List[Dict[str, float]]  # [{"latitude": 37.5, "longitude": 127.0}]

class CentroidResponse(BaseModel):
    centroid: Dict[str, float]
    address: Optional[str] = None

class PlaceRecommendRequest(BaseModel):
    participants: List[Dict]  # [{"user_id": 1, "latitude": 37.5, "longitude": 127.0}]
    category: Optional[str] = "카페"
    max_distance: Optional[float] = 3.0

class PlaceRecommendResponse(BaseModel):
    success: bool
    centroid: Dict[str, float]
    search_radius: float
    recommendations: List[Dict]
    filtered_count: Dict[str, int]
    processing_time_ms: int

# ========================================
# Utility Functions
# ========================================

def clamp(v: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, v))

def score_to_rating(score: float) -> float:
    """Raw score → 1~5 평점 변환"""
    s = 1.0 / (1.0 + math.exp(-score))
    return round(clamp(1.0 + 4.0 * s, 1.0, 5.0), 1)

def rating_to_stars(rating: float) -> str:
    """평점 → 별 문자열"""
    full_stars = int(rating)
    half_star = 1 if (rating - full_stars) >= 0.5 else 0
    return "⭐" * full_stars + ("⭐" if half_star else "")

def get_satisfaction_level(rating: float) -> str:
    """만족도 레벨"""
    if rating >= 4.5:
        return "VERY_HIGH"
    elif rating >= 3.5:
        return "HIGH"
    elif rating >= 2.5:
        return "MEDIUM"
    else:
        return "LOW"

def build_reasons(feat: dict) -> List[Dict]:
    """만족도 예측 이유 생성"""
    reasons = []

    if feat.get("distance_km", 999) <= 3:
        reasons.append({
            "icon": "📍",
            "text": f"집에서 {feat['distance_km']:.1f}km로 가까워요"
        })

    if feat.get("time_match", 0) == 1.0:
        reasons.append({
            "icon": "⏰",
            "text": "선호하는 시간대와 잘 맞아요"
        })

    if feat.get("location_type_match", 0) == 1.0:
        reasons.append({
            "icon": "🏠",
            "text": "실내/야외 선호와 일치해요"
        })

    if feat.get("cost_match_score", 0.5) >= 0.7:
        reasons.append({
            "icon": "💰",
            "text": "예산 성향에 잘 맞는 비용이에요"
        })

    if feat.get("interest_match_score", 0) >= 0.5:
        reasons.append({
            "icon": "✨",
            "text": "관심사와 카테고리가 잘 맞아요"
        })

    return reasons[:3]

# ========================================
# Dependency Injection
# ========================================

def get_gpt_service() -> GPTPromptService:
    """GPT 서비스 의존성"""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY not configured")
    return GPTPromptService(api_key=api_key)

def get_ai_recommendation_service(
    gpt_service: GPTPromptService = Depends(get_gpt_service)
) -> AIRecommendationService:
    """AI 추천 서비스 의존성"""
    spring_boot_url = os.getenv("SPRING_BOOT_URL", "http://localhost:8080")
    return AIRecommendationService(gpt_service, spring_boot_url)


# ========================================
# API Endpoints
# ========================================

@router.get("/health")
async def health_check():
    """
    AI 서버 헬스체크
    GET /api/ai/recommendations/health
    """
    return {
        "status": "ok",
        "message": "ITDA AI Server is running",
        "models": model_loader.get_status()
    }


@router.get("/meetings")
async def recommend_meetings(user_id: int, top_n: int = 10):
    try:
        logger.info(f"🤖 AI 추천 요청: user_id={user_id}, top_n={top_n}")

        if not model_loader.svd or not model_loader.svd.is_loaded():
            logger.error("❌ SVD 모델이 로드되지 않았습니다")
            raise HTTPException(status_code=503, detail="SVD 모델이 로드되지 않았습니다")

        if top_n > 50:
            top_n = 50

        recommendations = await model_loader.svd.recommend(user_id=user_id, top_n=top_n)
        logger.info(f"✅ SVD 추천 완료: {len(recommendations)}개")

        # Spring DTO(RecommendedMeeting.score) 에 맞추기: score 키로!
        rec_list = [
            {
                "meeting_id": int(meeting_id),
                "score": round(float(score), 4),   # ✅ predicted_score -> score
                "rank": idx + 1
            }
            for idx, (meeting_id, score) in enumerate(recommendations)
        ]

        return {
            "success": True,                 # ✅ 추가 (NPE 방지 + 의미 맞음)
            "user_id": user_id,
            "recommendations": rec_list,     # ✅ recommended_meetings -> recommendations
            "model_info": {                  # ✅ 있으면 좋음. 없으면 null로라도
                "rmse": None,
                "mae": None,
                "accuracy": None
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ 추천 실패: {str(e)}", exc_info=True)
        # 실패 응답도 success 넣어주면 Spring이 안정적
        raise HTTPException(status_code=500, detail=f"추천 실패: {str(e)}")

@router.get("/models")
async def get_models_info():
    """
    AI 모델 정보
    GET /api/ai/recommendations/models
    """
    return {
        "models": model_loader.get_status(),
        "svd": {
            "loaded": model_loader.svd.is_loaded() if model_loader.svd else False,
            "user_count": len(model_loader.svd.user_ids) if model_loader.svd and model_loader.svd.user_ids else 0,
            "meeting_count": len(model_loader.svd.meeting_ids) if model_loader.svd and model_loader.svd.meeting_ids else 0
        } if model_loader.svd else {},
        "lightgbm": {
            "loaded": model_loader.lightgbm.is_loaded() if model_loader.lightgbm else False,
            "feature_count": len(model_loader.feature_builder.get_feature_names()) if model_loader.feature_builder else 0
        } if model_loader.lightgbm else {},
        "kcelectra": {
            "loaded": model_loader.kcelectra.is_loaded() if model_loader.kcelectra else False,
            "device": model_loader.kcelectra.device if model_loader.kcelectra else "unknown"
        } if model_loader.kcelectra else {}
    }


@router.get("/meetings")
async def recommend_meetings(user_id: int, top_n: int = 10):
    """
    SVD 협업 필터링 모임 추천 (실시간 DB 연동)
    GET /api/ai/recommendations/meetings?userId=3&topN=10
    """
    try:
        if not model_loader.svd or not model_loader.svd.is_loaded():
            raise HTTPException(status_code=503, detail="SVD 모델이 로드되지 않았습니다")

        # topN 제한
        if top_n > 50:
            top_n = 50

        # SVD 추천 (실시간 DB 조회)
        recommendations = await model_loader.svd.recommend(
            user_id=user_id,
            top_n=top_n
        )

        # 응답 생성
        recommended_meetings = [
            {
                "meeting_id": int(meeting_id),
                "predicted_score": round(float(score), 4),
                "rank": idx + 1
            }
            for idx, (meeting_id, score) in enumerate(recommendations)
        ]

        return {
            "user_id": user_id,
            "recommended_meetings": recommended_meetings,
            "total_count": len(recommended_meetings)
        }

    except Exception as e:
        logger.error(f"추천 실패: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/recommend")
async def recommend_meetings_post(request: RecommendRequest):
    """
    SVD 협업 필터링 모임 추천 (POST)
    POST /api/ai/recommendations/recommend
    """
    try:
        if not model_loader.svd or not model_loader.svd.is_loaded():
            raise HTTPException(status_code=503, detail="SVD 모델이 로드되지 않았습니다")

        # SVD 추천
        recommendations = model_loader.svd.recommend(
            user_id=request.user_id,
            top_n=request.top_n
        )

        # 응답 생성
        recommended_meetings = [
            {
                "meeting_id": int(meeting_id),
                "predicted_score": round(float(score), 4),
                "rank": idx + 1
            }
            for idx, (meeting_id, score) in enumerate(recommendations)
        ]

        return {
            "user_id": request.user_id,
            "recommended_meetings": recommended_meetings,
            "total_count": len(recommended_meetings)
        }

    except Exception as e:
        logger.error(f"추천 실패: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/satisfaction")
async def predict_satisfaction_get(user_id: int, meeting_id: int):
    """
    LightGBM Ranker 만족도 예측 (GET)
    GET /api/ai/recommendations/satisfaction?userId=3&meetingId=15

    Spring Boot에서 사용자/모임 정보를 조회하여 호출해야 함
    """
    # Spring Boot가 이 엔드포인트를 직접 호출하지 않음
    # Spring Boot Service에서 POST로 호출
    raise HTTPException(status_code=501, detail="Use POST /satisfaction with full data")


@router.post("/satisfaction")
async def predict_satisfaction(request: SatisfactionRequest):
    """
    LightGBM Ranker 만족도 예측
    """
    try:
        if not model_loader.lightgbm or not model_loader.lightgbm.is_loaded():
            raise HTTPException(status_code=503, detail="LightGBM 모델이 로드되지 않았습니다")

        if not model_loader.feature_builder:
            raise HTTPException(status_code=503, detail="FeatureBuilder가 로드되지 않았습니다")

        # 사용자 정보 구성
        user = {
            "lat": request.user_lat,
            "lng": request.user_lng,
            "interests": request.user_interests,
            "time_preference": request.user_time_preference,
            "user_location_pref": request.user_location_pref,
            "budget_type": request.user_budget_type,
            "user_avg_rating": request.user_avg_rating,
            "user_meeting_count": request.user_meeting_count,
            "user_rating_std": request.user_rating_std,
        }

        # 모임 정보 구성
        meeting = {
            "lat": request.meeting_lat,
            "lng": request.meeting_lng,
            "category": request.meeting_category,
            "subcategory": request.meeting_subcategory,
            "time_slot": request.meeting_time_slot,
            "meeting_location_type": request.meeting_location_type,
            "vibe": request.meeting_vibe,
            "max_participants": request.meeting_max_participants,
            "expected_cost": request.meeting_expected_cost,
            "meeting_avg_rating": request.meeting_avg_rating or 0.0,
            "meeting_rating_count": request.meeting_rating_count,
            "meeting_participant_count": request.meeting_participant_count,
        }

        # 특징 추출
        feat, x = model_loader.feature_builder.build(user, meeting)

        # 예측
        pred = model_loader.lightgbm.predict(x)[0]
        predicted_rating = score_to_rating(float(pred))

        return {
            "user_id": request.user_id,
            "meeting_id": request.meeting_id,
            "predicted_rating": predicted_rating,
            "rating_stars": rating_to_stars(predicted_rating),
            "satisfaction_level": get_satisfaction_level(predicted_rating),
            "recommended": predicted_rating >= 3.5,
            "reasons": build_reasons(feat)
        }

    except Exception as e:
        logger.error(f"만족도 예측 실패: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sentiment")
async def analyze_sentiment(request: SentimentRequest):
    """
    KcELECTRA 감성 분석
    """
    try:
        if not model_loader.kcelectra or not model_loader.kcelectra.is_loaded():
            raise HTTPException(status_code=503, detail="KcELECTRA 모델이 로드되지 않았습니다")

        # 감성 분석
        result = model_loader.kcelectra.predict(request.text)

        return result

    except Exception as e:
        logger.error(f"감성 분석 실패: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/centroid")
async def calculate_centroid(request: CentroidRequest):
    """
    중간지점 계산
    """
    try:
        locations = request.user_locations

        if not locations:
            raise HTTPException(status_code=400, detail="위치 목록이 비어있습니다")

        # 평균 계산
        avg_lat = sum(loc["latitude"] for loc in locations) / len(locations)
        avg_lng = sum(loc["longitude"] for loc in locations) / len(locations)

        return {
            "centroid": {
                "latitude": round(avg_lat, 6),
                "longitude": round(avg_lng, 6)
            },
            "address": None  # TODO: Kakao Maps API 연동
        }

    except Exception as e:
        logger.error(f"중간지점 계산 실패: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/place")
async def recommend_place_get(meeting_id: int):
    """
    장소 추천 (GET)
    GET /api/ai/recommendations/place?meetingId=15

    Spring Boot가 이 엔드포인트를 직접 호출하지 않음
    Spring Boot Service에서 POST로 호출
    """
    raise HTTPException(status_code=501, detail="Use POST /place with full data")


@router.post("/place")
async def recommend_place(request: PlaceRecommendRequest):
    """
    장소 추천 (Kakao Maps 연동 필요)
    """
    try:
        # 중간지점 계산
        locations = [
            {"latitude": p["latitude"], "longitude": p["longitude"]}
            for p in request.participants
        ]

        avg_lat = sum(loc["latitude"] for loc in locations) / len(locations)
        avg_lng = sum(loc["longitude"] for loc in locations) / len(locations)

        centroid = {"latitude": round(avg_lat, 6), "longitude": round(avg_lng, 6)}

        # TODO: Kakao Maps API로 주변 장소 검색

        return {
            "success": True,
            "centroid": centroid,
            "search_radius": request.max_distance * 1000,  # km → m
            "recommendations": [],  # TODO: Kakao Maps 결과
            "filtered_count": {"total": 0, "within_radius": 0, "returned": 0},
            "processing_time_ms": 0
        }

    except Exception as e:
        logger.error(f"장소 추천 실패: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/search", response_model=AISearchResponse)

async def ai_search(
        request: AISearchRequest,
        ai_service: AIRecommendationService = Depends(get_ai_recommendation_service)
):
    """
    GPT 기반 AI 검색 및 추천

    POST /api/ai/search

    Request Body:
    {
        "user_prompt": "오늘 저녁 강남에서 러닝할 사람~",
        "user_id": 3,
        "top_n": 5
    }

    Response:
    {
        "user_prompt": "...",
        "parsed_query": {
            "category": "스포츠",
            "subcategory": "러닝",
            "time_slot": "evening",
            "location_query": "강남",
            ...
        },
        "total_candidates": 42,
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

    rid = str(uuid.uuid4())[:8]
    logger.info(f"[RID={rid}] 🔍 AI 검색 요청: user_id={request.user_id}, prompt='{request.user_prompt}'")

    try:
        logger.info(f"🔍 AI 검색 요청: user_id={request.user_id}, prompt='{request.user_prompt}'")

        result = await ai_service.get_ai_recommendations(
            user_prompt=request.user_prompt,
            user_id=request.user_id,
            top_n=request.top_n
        )

        logger.info(f"✅ AI 검색 완료: {len(result['recommendations'])}개 추천")

        return result

    except Exception as e:
        logger.error(f"❌ AI 검색 실패: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/parse-prompt")
async def parse_prompt(
        prompt: str,
        gpt_service: GPTPromptService = Depends(get_gpt_service)
):
    """
    GPT 프롬프트 파싱 테스트

    GET /api/ai/parse-prompt?prompt=오늘 저녁 강남에서 러닝할 사람
    """
    try:
        parsed = await gpt_service.parse_search_query(prompt)
        return {
            "prompt": prompt,
            "parsed": parsed
        }
    except Exception as e:
        logger.error(f"❌ 프롬프트 파싱 실패: {e}")
        raise HTTPException(status_code=500, detail=str(e))
