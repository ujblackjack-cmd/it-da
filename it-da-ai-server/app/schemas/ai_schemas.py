"""
AI Search Schemas (GPT 기반 검색용)
"""

from pydantic import BaseModel, Field
from typing import List, Dict, Optional


class AISearchRequest(BaseModel):
    """GPT 기반 AI 검색 요청"""
    user_prompt: str = Field(..., description="사용자 자연어 검색 쿼리", min_length=1)
    user_id: int = Field(..., description="사용자 ID", gt=0)
    top_n: int = Field(default=5, ge=1, le=20, description="추천 개수")


class AISearchResponse(BaseModel):
    """GPT 기반 AI 검색 응답"""
    user_prompt: str
    parsed_query: Dict
    total_candidates: int
    recommendations: List[Dict]
    fallback: Optional[bool] = False