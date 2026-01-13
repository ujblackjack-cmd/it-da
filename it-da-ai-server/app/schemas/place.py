"""
Place Recommendation Schemas
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict


class Participant(BaseModel):
    """참여자 정보"""
    user_id: int
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)


class Centroid(BaseModel):
    """중심점 좌표"""
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)


class PlaceRecommendRequest(BaseModel):
    """장소 추천 요청"""
    participants: List[Participant]
    category: Optional[str] = "카페"
    max_distance: Optional[float] = Field(default=3.0, ge=0.1, le=50.0)


class PlaceRecommendResponse(BaseModel):
    """장소 추천 응답"""
    success: bool
    centroid: Centroid
    search_radius: float
    recommendations: List[Dict]
    filtered_count: Dict[str, int]
    processing_time_ms: int


class CentroidRequest(BaseModel):
    """중간지점 계산 요청"""
    user_locations: List[Dict[str, float]]


class CentroidResponse(BaseModel):
    """중간지점 계산 응답"""
    centroid: Dict[str, float]
    address: Optional[str] = None