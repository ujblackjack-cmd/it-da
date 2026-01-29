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
        with open(self.model_path, "rb") as f:
            model_data = pickle.load(f)

        self.meeting_similarity = model_data["meeting_similarity"]
        self.meeting_stats = model_data["meeting_stats"]
        self.meeting_ids = [int(x) for x in model_data["meeting_ids"]]

        # dtype 통일
        self.meeting_similarity.index = self.meeting_similarity.index.astype(int)
        self.meeting_similarity.columns = self.meeting_similarity.columns.astype(int)
        self.meeting_stats["meeting_id"] = self.meeting_stats["meeting_id"].astype(int)

        self.global_mean = float(self.meeting_stats["avg_rating"].mean())

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
        if not self.is_loaded():
            raise ValueError("Model not loaded. Call load() first.")

        user_ratings_dict = await self._get_user_ratings(user_id)
        if not user_ratings_dict:
            return self._recommend_popular(top_n)

        # dtype 통일(안전)
        rated_ids = [int(x) for x in user_ratings_dict.keys()]

        scores: Dict[int, float] = {}

        for mid in self.meeting_ids:
            mid = int(mid)
            if mid in user_ratings_dict:
                continue
            if self.meeting_similarity is None or mid not in self.meeting_similarity.index:
                continue

            sims = []
            for rid in rated_ids:
                rid = int(rid)
                if rid in self.meeting_similarity.columns:
                    sim = float(self.meeting_similarity.loc[mid, rid])
                    sims.append((rid, sim))

            if not sims:
                continue

            sims.sort(key=lambda x: x[1], reverse=True)
            top_similar = sims[:10]
            sim_sum = sum(sim for _, sim in top_similar)

            if sim_sum <= 0:
                continue

            weighted_sum = sum(sim * float(user_ratings_dict[rid]) for rid, sim in top_similar)
            pred = weighted_sum / sim_sum

            # meeting 평균 섞기
            avg = self._meeting_avg_or_global(mid)
            pred = 0.7 * pred + 0.3 * avg

            scores[mid] = float(np.clip(pred, 1.0, 5.0))

        if not scores:
            return self._recommend_popular(top_n)

        return sorted(scores.items(), key=lambda x: x[1], reverse=True)[:top_n]

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

    async def predict_for_user_meeting(self, user_id: int, meeting_id: int) -> float:
        """
        특정 user-meeting에 대한 예측 평점(1~5)을 계산한다.
        - 유저가 이미 평가한 모임이면 그 평점을 우선 반환
        - 유저 평점이 없으면 meeting 평균으로 fallback
        - 유사도 기반으로 예측 가능하면 예측값 반환
        """
        if not self.is_loaded():
            raise ValueError("Model not loaded. Call load() first.")

        # 1) 유저 평점 조회
        user_ratings_dict = await self._get_user_ratings(user_id)

        # (핵심) 이미 평가한 모임이면 그 점수를 그대로 사용(혹은 약간 보정)
        if meeting_id in user_ratings_dict:
            return float(np.clip(user_ratings_dict[meeting_id], 1.0, 5.0))

        # 2) 유저 데이터 없으면 모임 평균으로 fallback
        if not user_ratings_dict:
            meeting_avg = self.meeting_stats[self.meeting_stats["meeting_id"] == meeting_id]["avg_rating"].values
            return float(self._meeting_avg_or_global(meeting_id))

        # 3) meeting_id가 모델에 없으면 평균 fallback
        if self.meeting_similarity is None or meeting_id not in self.meeting_similarity.index:
            meeting_avg = self.meeting_stats[self.meeting_stats["meeting_id"] == meeting_id]["avg_rating"].values
            return float(self._meeting_avg_or_global(meeting_id))

        # 4) 유사도 기반 예측
        rated_meeting_ids = list(user_ratings_dict.keys())

        sims = []
        for rated_id in rated_meeting_ids:
            if rated_id in self.meeting_similarity.columns:  # 또는 index/columns 둘 다 맞추기
                sim = float(self.meeting_similarity.loc[meeting_id, rated_id])
                sims.append((rated_id, sim))

        if not sims:
            meeting_avg = self.meeting_stats[self.meeting_stats["meeting_id"] == meeting_id]["avg_rating"].values
            return float(self._meeting_avg_or_global(meeting_id))

        sims.sort(key=lambda x: x[1], reverse=True)
        top_similar = sims[:10]
        sim_sum = sum(sim for _, sim in top_similar)

        if sim_sum <= 0:
            meeting_avg = self.meeting_stats[self.meeting_stats["meeting_id"] == meeting_id]["avg_rating"].values
            return float(self._meeting_avg_or_global(meeting_id))

        weighted_sum = sum(sim * user_ratings_dict[rated_id] for rated_id, sim in top_similar)
        predicted = weighted_sum / sim_sum

        # 모임 평균 반영
        meeting_avg = self.meeting_stats[self.meeting_stats["meeting_id"] == meeting_id]["avg_rating"].values
        if len(meeting_avg) > 0:
            predicted = 0.7 * predicted + 0.3 * float(meeting_avg[0])

        return float(np.clip(predicted, 1.0, 5.0))

    async def predict_for_user_meetings(self, user_id: int, meeting_ids: list[int]) -> dict[int, float]:
        out = {}
        for mid in meeting_ids:
            out[int(mid)] = float(await self.predict_for_user_meeting(user_id, int(mid)))
        return out

    def _meeting_avg_or_global(self, meeting_id: int) -> float:
        if self.meeting_stats is not None:
            v = self.meeting_stats.loc[self.meeting_stats["meeting_id"] == int(meeting_id), "avg_rating"].values
            if len(v) > 0:
                return float(v[0])
        return float(getattr(self, "global_mean", 3.7))


