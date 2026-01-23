# app/services/geolocation_service.py
from app.schemas.place import ParticipantLocation, Centroid  # ✅ 수정
from app.utils.distance_calculator import calculate_centroid, haversine_distance
from typing import List, Any, Tuple

class GeolocationService:
    async def calculate_centroid(self, participants: List[Any]) -> Tuple[float, float]:
        def get_lat_lon(p):
            # pydantic 객체
            if hasattr(p, "latitude") and hasattr(p, "longitude"):
                return p.latitude, p.longitude
            # dict
            if isinstance(p, dict):
                return p.get("latitude"), p.get("longitude")
            raise ValueError(f"Invalid participant type: {type(p)}")

        points = [get_lat_lon(p) for p in participants]

        # None 체크(혹시 좌표 누락되면 여기서 명확히 에러)
        if any(lat is None or lon is None for lat, lon in points):
            raise ValueError(f"Participant missing lat/lon: {participants}")

        avg_lat = sum(lat for lat, _ in points) / len(points)
        avg_lon = sum(lon for _, lon in points) / len(points)
        return avg_lat, avg_lon

    def get_max_distance_from_centroid(
            self,
            participants: List[ParticipantLocation],  # ✅ 수정
            centroid: Centroid
    ) -> float:
        """중간지점에서 가장 먼 참가자까지의 거리"""
        max_dist = 0.0
        for p in participants:
            dist = haversine_distance(
                centroid.latitude, centroid.longitude,
                p.latitude, p.longitude
            )
            max_dist = max(max_dist, dist)

        return max_dist * 1000  # km → m