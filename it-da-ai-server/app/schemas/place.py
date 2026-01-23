"""
Place Recommendation Schemas
"""

from pydantic import BaseModel, Field
from typing import List, Dict, Optional


class ParticipantLocation(BaseModel):
    user_id: int
    address: Optional[str] = None
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)


# ✅ Participant alias 추가 (geolocation_service에서 사용)
Participant = ParticipantLocation


class Centroid(BaseModel):
    """중간지점 (Centroid)"""
    latitude: float
    longitude: float


class PlaceRecommendation(BaseModel):
    """추천 장소"""
    place_id: str
    name: str
    category: str
    address: str
    latitude: float
    longitude: float
    distance_from_centroid: float  # km
    rating: Optional[float] = None
    review_count: Optional[int] = None
    phone: Optional[str] = None
    url: Optional[str] = None

class Point(BaseModel):
    latitude: float
    longitude: float

class PlaceRecommendRequest(BaseModel):
    meeting_id: int
    meeting_category: str
    meeting_title: str  # ✅ 추가 (키워드 추출에 필요)
    meeting_description: Optional[str] = ""
    participants: List[ParticipantLocation] = Field(..., min_items=2)

    max_distance: float = 3.0  # km
    top_n: int = 3


class PlaceRecommendResponse(BaseModel):
    """장소 추천 응답"""
    success: bool
    centroid: Centroid
    search_radius: float  # meters
    recommendations: List[PlaceRecommendation]
    filtered_count: Dict[str, int]  # {"total": 50, "within_radius": 20, "returned": 10}
    processing_time_ms: int