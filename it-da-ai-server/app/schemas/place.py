"""
Place Recommendation Schemas
"""

from pydantic import BaseModel, Field
from typing import List, Dict, Optional


class ParticipantLocation(BaseModel):
    """참가자 위치"""
    user_id: int
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)


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


class PlaceRecommendRequest(BaseModel):
    """장소 추천 요청"""
    participants: List[ParticipantLocation] = Field(..., min_items=1)
    category: Optional[str] = "카페"
    max_distance: Optional[float] = 3.0  # km
    limit: Optional[int] = 10


class PlaceRecommendResponse(BaseModel):
    """장소 추천 응답"""
    success: bool
    centroid: Centroid
    search_radius: float  # meters
    recommendations: List[PlaceRecommendation]
    filtered_count: Dict[str, int]  # {"total": 50, "within_radius": 20, "returned": 10}
    processing_time_ms: int