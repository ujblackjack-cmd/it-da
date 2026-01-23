# app/services/kakao_map_service.py
"""
카카오맵 API 서비스
"""

import httpx
from typing import List, Dict, Optional
from app.core.config import settings
from app.core.logging import logger


class KakaoMapService:
    """카카오맵 API 서비스"""

    BASE_URL = "https://dapi.kakao.com/v2/local"

    def __init__(self):
        self.api_key = settings.KAKAO_REST_API_KEY
        self.headers = {
            "Authorization": f"KakaoAK {self.api_key}"
        }

    async def search_places_by_keyword(
            self,
            keyword: str,
            latitude: float,
            longitude: float,
            radius: int = 3000,  # 3km
            size: int = 15
    ) -> List[Dict]:
        """
        키워드로 장소 검색

        Args:
            keyword: 검색 키워드 (예: "카페", "식당", "공원")
            latitude: 중심 위도
            longitude: 중심 경도
            radius: 검색 반경 (미터)
            size: 결과 개수 (최대 15)

        Returns:
            장소 목록
        """
        try:
            url = f"{self.BASE_URL}/search/keyword.json"
            params = {
                "query": keyword,
                "x": longitude,
                "y": latitude,
                "radius": radius,
                "size": size,
                "sort": "distance"  # 거리순 정렬
            }

            async with httpx.AsyncClient() as client:
                response = await client.get(
                    url,
                    headers=self.headers,
                    params=params,
                    timeout=10.0
                )
                response.raise_for_status()
                data = response.json()

                return data.get("documents", [])

        except httpx.HTTPError as e:
            logger.error(f"카카오맵 API 호출 실패: {e}")
            return []
        except Exception as e:
            logger.error(f"장소 검색 중 오류: {e}")
            return []

    def parse_place_data(self, raw_place: Dict) -> Dict:
        """
        카카오맵 응답 데이터를 표준 형식으로 변환

        Args:
            raw_place: 카카오맵 API 응답 데이터

        Returns:
            표준화된 장소 정보
        """
        return {
            "place_id": raw_place.get("id"),
            "name": raw_place.get("place_name"),
            "category": raw_place.get("category_name"),
            "address": raw_place.get("address_name"),
            "road_address": raw_place.get("road_address_name"),
            "latitude": float(raw_place.get("y")),
            "longitude": float(raw_place.get("x")),
            "distance": int(raw_place.get("distance", 0)),  # 미터 단위
            "phone": raw_place.get("phone"),
            "url": raw_place.get("place_url")
        }