from typing import Dict, Tuple, List
import numpy as np
import math
import json
import re


class FeatureBuilder:
    """LightGBM 모델을 위한 특징 추출기"""

    def __init__(self):
        self.categories = ["스포츠", "맛집", "카페", "문화예술", "스터디", "취미활동", "소셜"]

        # ✅ 성별 카테고리 (3개)
        self.genders = ["M", "F", "N"]

        # ✅ 모델 학습 시 사용된 8개 vibe (27 features)
        self.vibes = [
            "활기찬", "여유로운", "힐링", "진지한",
            "즐거운", "감성적인", "건강한", "배움"
        ]

        # ✅ 더미 데이터 14개 vibe → 8개로 매핑
        self.vibe_mapping = {
            "활기찬": "활기찬",
            "에너지 넘치는": "활기찬",
            "건강한": "건강한",
            "여유로운": "여유로운",
            "맛있는": "여유로운",
            "힐링": "힐링",
            "감성적인": "감성적인",
            "예술적인": "감성적인",
            "창의적인": "감성적인",
            "진지한": "진지한",
            "집중적인": "진지한",
            "배움": "배움",
            "즐거운": "즐거운",
            "자유로운": "즐거운",
        }

        self.time_slots = ["MORNING", "AFTERNOON", "EVENING", "NIGHT"]
        self.location_types = ["INDOOR", "OUTDOOR"]

        # ✅ 총 피처: 12 + 7(cat) + 8(vibe) + 3(gender) + 5(sentiment) = 35
        base = 12
        self.n_features = (base + len(self.categories) + len(self.vibes) +
                           len(self.genders) + 5)  # 35

        # ✅ 카테고리(상위 관심사) → 서브카테고리(구체 활동) 확장
        self.expand_interest = {
            "문화예술": {"전시회", "공연", "갤러리", "공방체험"},
            "스터디": {"코딩", "영어회화", "독서토론", "재테크"},
            "취미활동": {"그림", "베이킹", "쿠킹", "플라워"},
            "소셜": {"보드게임", "방탈출", "볼링", "당구"},
            "스포츠": {"러닝", "축구", "배드민턴", "요가", "사이클링", "등산", "클라이밍"},
            "맛집": {"한식", "중식", "일식", "양식", "이자카야"},
            "카페": {"브런치", "디저트", "카페투어", "베이커리"},
        }

    def _normalize_vibe(self, vibe: str) -> str:
        """14개 vibe를 8개로 매핑"""
        if not vibe:
            return ""
        return self.vibe_mapping.get(vibe, vibe)

    def one_hot_encode(self, value: str, categories: List[str]) -> List[int]:
        v = "" if value is None else str(value)
        return [1 if v == cat else 0 for cat in categories]

    def haversine_distance(self, lat1: float, lng1: float, lat2: float, lng2: float) -> float:
        R = 6371
        dlat = math.radians(lat2 - lat1)
        dlng = math.radians(lng2 - lng1)
        a = (math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) *
             math.cos(math.radians(lat2)) * math.sin(dlng / 2) ** 2)
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return R * c

    def _parse_user_interests(self, user_interests) -> set:
        """입력 형태: JSON string, 콤마/공백 구분"""
        if not user_interests:
            return set()

        s = str(user_interests).strip()

        # JSON list 문자열 대응
        if s.startswith("[") and s.endswith("]"):
            try:
                arr = json.loads(s)
                return {str(x).strip().lower() for x in arr if str(x).strip()}
            except Exception:
                pass

        # 콤마/공백 혼용 대응
        parts = re.split(r"[,\s]+", s)
        return {p.strip().lower() for p in parts if p.strip()}

    def _calculate_user_sentiment_match(
            self,
            user_mbti: str,
            positive_ratio: float,
            negative_ratio: float,
            sentiment_variance: float
    ) -> float:
        """유저 성향과 모임 감성 매칭 (MBTI 기반)"""
        if not user_mbti or len(user_mbti) < 4:
            return 0.5

        score = 0.5

        # E/I 차원
        if user_mbti[0] == "E":  # 외향
            if positive_ratio > 0.6:
                score += 0.2
            if sentiment_variance > 0.3:
                score += 0.1
        elif user_mbti[0] == "I":  # 내향
            if sentiment_variance < 0.3:
                score += 0.2
            if negative_ratio < 0.2:
                score += 0.1

        # F/T 차원
        if user_mbti[2] == "F":  # 감정형
            if positive_ratio > 0.5:
                score += 0.1
        elif user_mbti[2] == "T":  # 사고형
            if sentiment_variance < 0.4:
                score += 0.1

        return min(1.0, max(0.0, score))

    def calculate_interest_match(self, user_interests: str, meeting_category: str,
                                 meeting_subcategory: str = "") -> float:
        """관심사 매칭 점수 (0~1)"""
        u = self._parse_user_interests(user_interests)
        if not u:
            return 0.0

        m_tokens = set()
        if meeting_category:
            m_tokens.add(str(meeting_category).strip().lower())
        if meeting_subcategory:
            m_tokens.add(str(meeting_subcategory).strip().lower())

        u_expanded = set(u)
        for k, subs in self.expand_interest.items():
            if k.lower() in u:
                u_expanded |= {x.strip().lower() for x in subs}

        hit = len(u_expanded & m_tokens)
        denom = max(1, len(u))
        return hit / denom

    def calculate_cost_match(self, user_budget_type: str, meeting_cost: int) -> float:
        cost_ranges = {
            "low": (0, 10000), "value": (10000, 30000), "medium": (30000, 50000),
            "high": (50000, 100000), "premium": (100000, float('inf'))
        }
        if user_budget_type not in cost_ranges:
            return 0.5

        min_cost, max_cost = cost_ranges[user_budget_type]
        meeting_cost = float(meeting_cost)

        if min_cost <= meeting_cost <= max_cost:
            return 1.0
        if meeting_cost < min_cost:
            denom = max(float(min_cost), 1.0)
            return max(0.0, 1.0 - (min_cost - meeting_cost) / denom)

        denom = max(float(max_cost), 1.0)
        return max(0.0, 1.0 - (meeting_cost - max_cost) / denom)

    def build_vector(self, user: Dict, meeting: Dict) -> Tuple[Dict, List[float]]:
        """특징 dict + 1D feature vector(List[float]) 생성"""

        u_lat = float(user.get("lat", 37.5) or 37.5)
        u_lng = float(user.get("lng", 127.0) or 127.0)
        m_lat = float(meeting.get("lat", 37.5) or 37.5)
        m_lng = float(meeting.get("lng", 127.0) or 127.0)

        distance_km = self.haversine_distance(u_lat, u_lng, m_lat, m_lng)

        time_match = 1.0 if user.get("time_preference") == meeting.get("time_slot") else 0.0
        location_type_match = 1.0 if user.get("user_location_pref") == meeting.get("meeting_location_type") else 0.0

        interest_match_score = self.calculate_interest_match(
            user.get("interests", ""),
            meeting.get("category", ""),
            meeting.get("subcategory", ""),
        )

        cost_match_score = self.calculate_cost_match(
            user.get("budget_type", "value"),
            int(meeting.get("expected_cost", 20000) or 20000),
        )

        user_avg_rating = float(user.get("user_avg_rating", 3.0) or 3.0)
        user_meeting_count = float(user.get("user_meeting_count", 0) or 0)
        user_rating_std = float(user.get("user_rating_std", 0.5) or 0.5)

        meeting_avg_rating = float(meeting.get("meeting_avg_rating", 3.0) or 3.0)
        meeting_rating_count = float(meeting.get("meeting_rating_count", 0) or 0)
        meeting_participant_count = float(meeting.get("meeting_participant_count", 0) or 0)
        meeting_max_participants = float(meeting.get("max_participants", 10) or 10)

        category_onehot = self.one_hot_encode(meeting.get("category", ""), self.categories)

        raw_vibe = meeting.get("vibe", "")
        normalized_vibe = self._normalize_vibe(raw_vibe)
        vibe_onehot = self.one_hot_encode(normalized_vibe, self.vibes)

        # ✅ 성별 원-핫 인코딩
        user_gender = user.get("gender", "N") or "N"
        gender_onehot = self.one_hot_encode(user_gender, self.genders)

        # ✅ 감성 피처
        sentiment_data = meeting.get("sentiment", {})

        avg_sentiment = float(sentiment_data.get("avg_sentiment_score", 0.5))
        positive_ratio = float(sentiment_data.get("positive_review_ratio", 0.5))
        negative_ratio = float(sentiment_data.get("negative_review_ratio", 0.5))
        sentiment_variance = float(sentiment_data.get("review_sentiment_variance", 0.0))

        # ✅ 유저 성향 매칭
        user_sentiment_match = self._calculate_user_sentiment_match(
            user.get("mbti", ""),
            positive_ratio,
            negative_ratio,
            sentiment_variance
        )

        feature_vector = [
            # 기존 12개
            distance_km, time_match, location_type_match,
            interest_match_score, cost_match_score,
            user_avg_rating, user_meeting_count, user_rating_std,
            meeting_avg_rating, meeting_rating_count,
            meeting_participant_count, meeting_max_participants,

            # 카테고리 7개
            *category_onehot,

            # vibe 8개
            *vibe_onehot,

            # ✅ 성별 3개
            *gender_onehot,

            # ✅ 감성 5개
            avg_sentiment,
            positive_ratio,
            negative_ratio,
            sentiment_variance,
            user_sentiment_match,
        ]

        if len(feature_vector) != self.n_features:
            raise ValueError(f"Feature mismatch: {len(feature_vector)} != 35")

        features = {
            "distance_km": distance_km,
            "time_match": time_match,
            "location_type_match": location_type_match,
            "interest_match_score": interest_match_score,
            "cost_match_score": cost_match_score,
        }

        return features, feature_vector

    def build(self, user: Dict, meeting: Dict) -> Tuple[Dict, np.ndarray]:
        """특징 벡터 생성 (호환 유지: (1, n_features) 반환)"""
        features, vec = self.build_vector(user, meeting)
        return features, np.asarray([vec], dtype=float)

    def build_batch(self, user: Dict, meetings: List[Dict]) -> Tuple[List[Dict], np.ndarray]:
        """동일 user + 여러 meeting → (features_list, X[N, n_features])"""
        feats_list: List[Dict] = []
        vectors: List[List[float]] = []

        for m in meetings:
            feats, vec = self.build_vector(user, m)
            feats_list.append(feats)
            vectors.append(vec)

        X = np.asarray(vectors, dtype=float)
        return feats_list, X

    def get_feature_names(self) -> List[str]:
        base_features = [
            "distance_km", "time_match", "location_type_match",
            "interest_match_score", "cost_match_score",
            "user_avg_rating", "user_meeting_count", "user_rating_std",
            "meeting_avg_rating", "meeting_rating_count",
            "meeting_participant_count", "meeting_max_participants",
        ]
        category_features = [f"category_{cat}" for cat in self.categories]
        vibe_features = [f"vibe_{v}" for v in self.vibes]

        # ✅ NEW
        gender_features = [f"gender_{g}" for g in self.genders]
        sentiment_features = [
            "avg_sentiment_score",
            "positive_review_ratio",
            "negative_review_ratio",
            "review_sentiment_variance",
            "user_sentiment_match"
        ]

        return (base_features + category_features + vibe_features +
                gender_features + sentiment_features)