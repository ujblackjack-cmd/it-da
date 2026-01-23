# app/services/place_recommendation_service.py
"""
장소 추천 통합 서비스
"""

from typing import List, Dict
from app.schemas.place import (
    PlaceRecommendRequest,
    PlaceRecommendResponse,
    PlaceRecommendation,
    Centroid
)
from app.services.geolocation_service import GeolocationService
from app.services.kakao_map_service import KakaoMapService
from app.services.meeting_analyzer_service import MeetingAnalyzerService
from app.core.logging import logger
import time


class PlaceRecommendationService:
    """장소 추천 서비스"""

    def __init__(self):
        self.geo_service = GeolocationService()
        self.kakao_service = KakaoMapService()
        self.analyzer_service = MeetingAnalyzerService()

    async def recommend_places(
            self,
            participants: List[Dict],
            meeting_title: str,
            meeting_description: str = "",
            category: str = "",
            max_distance: float = 3.0,
            top_n: int = 3
    ) -> PlaceRecommendResponse:
        """
        참가자 위치와 모임 정보를 기반으로 장소 추천

        Args:
            participants: 참가자 위치 리스트 [{"user_id": 1, "latitude": 37.5, "longitude": 127.0}, ...]
            meeting_title: 모임 제목
            meeting_description: 모임 설명
            category: 모임 카테고리
            max_distance: 최대 검색 거리 (km)
            top_n: 추천 개수

        Returns:
            PlaceRecommendResponse
        """
        start_time = time.time()

        try:
            # 1. 중간 지점 계산
            centroid = await self.geo_service.calculate_centroid(participants)
            centroid_lat, centroid_lng = centroid
            logger.info(f"중간 지점: ({centroid_lat}, {centroid_lng})")

            # 2. 모임 성격 분석 → 검색 키워드 추출
            keywords = await self.analyzer_service.extract_place_keywords(
                meeting_title,
                meeting_description,
                category
            )
            logger.info(f"추출된 키워드: {keywords}")

            # 3. 각 키워드로 카카오맵 검색
            all_places = []
            for keyword in keywords:
                places = await self.kakao_service.search_places_by_keyword(
                    keyword=keyword,
                    latitude=centroid_lat,
                    longitude=centroid_lng,
                    radius=int(max_distance * 1000),  # km → m
                    size=15
                )
                all_places.extend(places)

            # 4. 중복 제거 (place_id 기준)
            unique_places = list({p["id"]: p for p in all_places}.values())

            # 5. 거리순 정렬 및 상위 N개 선택
            sorted_places = sorted(
                unique_places,
                key=lambda x: int(x.get("distance", 999999))
            )[:top_n]

            # 6. 응답 데이터 변환
            recommendations = [
                PlaceRecommendation(
                    place_id=p["id"],
                    name=p["place_name"],
                    category=p.get("category_name", "기타"),
                    address=p.get("address_name", ""),
                    latitude=float(p["y"]),
                    longitude=float(p["x"]),
                    distance_from_centroid=int(p.get("distance", 0)) / 1000,  # m → km
                    phone=p.get("phone"),
                    url=p.get("place_url")
                )
                for p in sorted_places
            ]

            processing_time = int((time.time() - start_time) * 1000)

            return PlaceRecommendResponse(
                success=True,
                centroid=Centroid(latitude=centroid_lat, longitude=centroid_lng),
                search_radius=max_distance * 1000,
                recommendations=recommendations,
                filtered_count={
                    "total": len(all_places),
                    "unique": len(unique_places),
                    "returned": len(recommendations)
                },
                processing_time_ms=processing_time
            )
        except Exception as e:
            logger.error(f"장소 추천 실패: {e}")
            raise