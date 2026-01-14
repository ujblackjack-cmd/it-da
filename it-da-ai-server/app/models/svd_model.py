"""
Collaborative Filtering Model (Item-based)
실시간 Spring Boot 연동
"""

import pickle
import numpy as np
import pandas as pd
from pathlib import Path
from typing import Optional, List, Tuple, Dict
import httpx


class SVDModel:
    """협업 필터링 모델 (아이템 기반)"""

    def __init__(self,
                 model_path: str = "models/svd_model.pkl",
                 spring_boot_url: str = "http://localhost:8080"):
        self.model_path = Path(model_path)
        self.spring_boot_url = spring_boot_url

        # 학습된 모델 (모임 간 유사도)
        self.meeting_similarity: Optional[pd.DataFrame] = None
        self.meeting_stats: Optional[pd.DataFrame] = None
        self.meeting_ids: Optional[List[int]] = None

    def load(self):
        """모델 로드 (모임 유사도만)"""
        if not self.model_path.exists():
            raise FileNotFoundError(f"Model not found: {self.model_path}")

        with open(self.model_path, "rb") as f:
            model_data = pickle.load(f)

        # 모임 간 유사도만 사용 (학습 시 계산됨)
        self.meeting_similarity = model_data['meeting_similarity']
        self.meeting_stats = model_data['meeting_stats']
        self.meeting_ids = model_data['meeting_ids']

        print(f"✅ 협업 필터링 모델 로드 완료: {self.model_path}")
        print(f"   모임: {len(self.meeting_ids):,}개")
        print(f"   Spring Boot URL: {self.spring_boot_url}")

    async def _get_user_ratings(self, user_id: int) -> Dict[int, float]:
        """
        Spring Boot에서 사용자 평점 데이터 조회

        GET /api/reviews/user/{userId}
        Response: [{"meetingId": 1, "rating": 4.5}, ...]
        """
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(
                    f"{self.spring_boot_url}/api/reviews/user/{user_id}"
                )

                if response.status_code == 200:
                    reviews = response.json()
                    # {meeting_id: rating} 형태로 변환
                    return {
                        review['meetingId']: review['rating']
                        for review in reviews
                    }
                else:
                    print(f"⚠️ Spring Boot API 호출 실패: {response.status_code}")
                    return {}
        except Exception as e:
            print(f"⚠️ Spring Boot 연결 실패: {e}")
            return {}

    async def recommend(self, user_id: int, top_n: int = 10) -> List[Tuple[int, float]]:
        """
        사용자에게 모임 추천 (실시간 DB 연동)

        Args:
            user_id: 사용자 ID
            top_n: 추천할 모임 개수

        Returns:
            [(meeting_id, predicted_score), ...]
        """
        if not self.is_loaded():
            raise ValueError("Model not loaded. Call load() first.")

        # Spring Boot에서 사용자 평점 데이터 조회
        user_ratings_dict = await self._get_user_ratings(user_id)

        # 평점 데이터가 없으면 인기 모임 추천
        if not user_ratings_dict:
            return self._recommend_popular(top_n)

        # 추천 점수 계산
        scores = {}
        rated_meeting_ids = list(user_ratings_dict.keys())

        for meeting_id in self.meeting_ids:
            if meeting_id not in user_ratings_dict:  # 미평가 모임만
                # 유사한 모임들 찾기
                available_similarities = []
                for rated_id in rated_meeting_ids:
                    if rated_id in self.meeting_similarity.index:
                        sim = self.meeting_similarity.loc[meeting_id, rated_id]
                        available_similarities.append((rated_id, sim))

                if not available_similarities:
                    continue

                # 상위 10개 유사 모임
                available_similarities.sort(key=lambda x: x[1], reverse=True)
                top_similar = available_similarities[:10]

                sim_sum = sum(sim for _, sim in top_similar)

                if sim_sum > 0:
                    weighted_sum = sum(
                        sim * user_ratings_dict[rated_id]
                        for rated_id, sim in top_similar
                    )
                    predicted_rating = weighted_sum / sim_sum

                    # 모임 평균 평점 반영
                    meeting_avg = self.meeting_stats[
                        self.meeting_stats['meeting_id'] == meeting_id
                    ]['avg_rating'].values

                    if len(meeting_avg) > 0:
                        predicted_rating = 0.7 * predicted_rating + 0.3 * meeting_avg[0]

                    scores[meeting_id] = predicted_rating

        # 상위 N개 추천
        if not scores:
            return self._recommend_popular(top_n)

        top_recommendations = sorted(scores.items(), key=lambda x: x[1], reverse=True)[:top_n]
        return top_recommendations

    def _recommend_popular(self, top_n: int) -> List[Tuple[int, float]]:
        """인기 모임 추천 (fallback)"""
        popular = self.meeting_stats.nlargest(top_n, 'avg_rating')
        return [(int(row['meeting_id']), float(row['avg_rating']))
                for _, row in popular.iterrows()]

    def predict_rating(self, user_id: int, meeting_id: int) -> float:
        """
        특정 사용자-모임 조합의 예측 평점

        Args:
            user_id: 사용자 ID
            meeting_id: 모임 ID

        Returns:
            예측 평점 (0~5)
        """
        if not self.is_loaded():
            raise ValueError("Model not loaded. Call load() first.")

        # 사용자나 모임이 없으면 평균값 반환
        if user_id not in self.user_ids:
            meeting_avg = self.meeting_stats[
                self.meeting_stats['meeting_id'] == meeting_id
            ]['avg_rating'].values
            return float(meeting_avg[0]) if len(meeting_avg) > 0 else 3.0

        if meeting_id not in self.meeting_ids:
            user_avg = self.user_stats[
                self.user_stats['user_id'] == user_id
            ]['avg_rating'].values
            return float(user_avg[0]) if len(user_avg) > 0 else 3.0

        # 예측
        user_ratings = self.user_meeting_matrix.loc[user_id]
        rated_meetings = user_ratings[user_ratings > 0]

        if len(rated_meetings) == 0:
            meeting_avg = self.meeting_stats[
                self.meeting_stats['meeting_id'] == meeting_id
            ]['avg_rating'].values
            return float(meeting_avg[0]) if len(meeting_avg) > 0 else 3.0

        # 유사도 기반 예측
        similarities = self.meeting_similarity.loc[meeting_id, rated_meetings.index]
        top_similar = similarities.nlargest(10)

        if top_similar.sum() > 0:
            weighted_sum = sum(
                top_similar[sim_meeting] * rated_meetings[sim_meeting]
                for sim_meeting in top_similar.index
            )
            predicted = weighted_sum / top_similar.sum()

            # 모임 평균 반영
            meeting_avg = self.meeting_stats[
                self.meeting_stats['meeting_id'] == meeting_id
            ]['avg_rating'].values

            if len(meeting_avg) > 0:
                predicted = 0.7 * predicted + 0.3 * meeting_avg[0]

            return float(np.clip(predicted, 1.0, 5.0))

        # fallback
        meeting_avg = self.meeting_stats[
            self.meeting_stats['meeting_id'] == meeting_id
        ]['avg_rating'].values
        return float(meeting_avg[0]) if len(meeting_avg) > 0 else 3.0

    def is_loaded(self) -> bool:
        """로드 여부 확인"""
        return self.meeting_similarity is not None