"""
Meeting Scorer
LightGBM 기반 점수 계산 + 보정
"""

import math
from typing import List, Dict, Optional
import numpy as np

from app.core.logging import logger
from app.core.scoring_utils import match_from_percentile
from app.core.keyword_utils import clean_keywords


class MeetingScorer:
    """AI 점수 계산 + 보정"""

    def __init__(self, model_loader, normalizer, intent_adjuster):
        """
        Args:
            model_loader: ModelLoader 인스턴스
            normalizer: QueryNormalizer 인스턴스
            intent_adjuster: IntentAdjuster 인스턴스
        """
        self.model_loader = model_loader
        self.normalizer = normalizer
        self.intent_adjuster = intent_adjuster

    async def score_meetings(
            self,
            user_id: int,
            user_context: dict,
            candidate_meetings: List[dict],
            parsed_query: dict,
            intent: str,
            user_prompt: str = "",
            query_terms: Optional[List[str]] = None
    ) -> List[dict]:
        """AI 점수 계산 - LightGBM + 보정"""

        if not self.model_loader.ranker or not self.model_loader.ranker.is_loaded():
            raise RuntimeError("LightGBM Ranker 모델이 로드되지 않았습니다.")
        if not self.model_loader.feature_builder:
            raise RuntimeError("FeatureBuilder가 로드되지 않았습니다.")

        use_regressor = bool(self.model_loader.regressor and self.model_loader.regressor.is_loaded())

        conf = float(parsed_query.get("confidence", 0) or 0)

        # ✅ 감정 전용 검색 감지
        is_emotion_search = (
                parsed_query.get("emotion_only_search") is True or
                (not parsed_query.get("category") and
                 parsed_query.get("vibe") and
                 conf <= 0.6) or
                (parsed_query.get("category") and
                 parsed_query.get("vibe") and
                 conf <= 0.85)
        )

        if is_emotion_search:
            logger.info(f"🔥 [EMOTION_BOOST] 감정 검색 모드 활성화! (conf={conf:.2f}, vibe={parsed_query.get('vibe')})")

        # ✅ 감정 검색 + 관심사 보완 검색
        if is_emotion_search and user_context.get("interests"):
            candidate_meetings = await self._supplement_missing_categories(
                candidate_meetings,
                user_context,
                parsed_query
            )

        # 1. User 정보 정규화
        user = self._build_user_dict(user_context, parsed_query)

        # 2. Feature 빌드
        rows, feats, valid_candidates = [], [], []
        for raw in candidate_meetings:
            try:
                m = self._normalize_meeting(raw)
                feat, x = self.model_loader.feature_builder.build(user, m)
                rows.append(x[0])
                feats.append(feat)
                valid_candidates.append(m)
            except Exception as e:
                logger.warning(f"⚠️ feature build 실패 meeting_id={raw.get('meeting_id')}: {e}")
                continue

        if not rows:
            return []

        # 3. LightGBM 예측
        X = np.vstack(rows)
        rank_raw = self.model_loader.ranker.predict(X)
        raw_list = [float(v) for v in rank_raw]
        n = len(raw_list)

        # 4. 동적 상한
        ceil = self._dynamic_ceil(n, conf)
        logger.info(f"[SCORE] n={n}, conf={conf:.2f}, ceil={ceil}")

        # 5. Regressor (선택)
        rating_list = None
        if use_regressor:
            try:
                preds = self.model_loader.regressor.predict(X)
                rating_list = [float(v) for v in preds]
            except Exception as e:
                logger.warning(f"⚠️ regressor rating 예측 실패: {e}")

        # 6. Percentile → Match Score
        match_scores = self._compute_match_scores(raw_list, n, conf, ceil, valid_candidates)

        # 7. 보정 적용
        results = []
        for idx, (m, feat, s) in enumerate(zip(valid_candidates, feats, raw_list)):
            ms = int(match_scores[idx])

            # ... 기존 보정 로직 ...
            ms = self._adjust_timeslot(ms, m, parsed_query)
            ms = self._adjust_location_query(ms, m, parsed_query)
            ms = self._adjust_subcategory(ms, m, parsed_query, conf)
            ms += self._query_match_bonus(m, query_terms or [])
            ms = self._adjust_keywords(ms, m, parsed_query)

            if is_emotion_search:
                ms = self._emotion_search_boost(ms, m, parsed_query)

            # ✅ ACTIVE 필터 (None 체크 추가!)
            requested_vibe = (parsed_query.get("vibe") or "").strip()  # ← 수정!
            meeting_category = (m.get("category") or "").strip()  # ← 수정!

            if is_emotion_search and requested_vibe in ["즐거운", "활기찬", "신나는", "격렬한"]:
                if meeting_category in ["맛집", "카페"]:
                    logger.info(f"[ACTIVE_FILTER] {meeting_category} 모임 제외: {m.get('title')}")
                    continue

            # intent 보정
            ms += float(self.intent_adjuster.adjust(intent, m, parsed_query))

            # meeting_id tie-break
            mid = int(m.get("meeting_id") or 0)
            ms += ((mid % 97) - 48) * 0.02

            # 최종 캡
            ms = min(ms, float(ceil))
            ms = max(0.0, min(100.0, ms))
            ms_int = int(round(ms))

            # 매칭 레벨
            if ms_int >= 85:
                lvl = "VERY_HIGH"
            elif ms_int >= 78:
                lvl = "HIGH"
            elif ms_int >= 65:
                lvl = "MEDIUM"
            else:
                lvl = "LOW"

            item = {
                **m,
                "rank_raw": round(float(s), 4),
                "match_score": ms_int,
                "meetingId": m.get("meeting_id"),
                "meeting_id": m.get("meeting_id"),
                "match_level": lvl,
                "key_points": self._build_key_points(feat),
                "score_meta": {
                    "n_candidates": n,
                    "confidence": round(conf, 3),
                    "ceil": int(ceil),
                    "is_emotion_search": is_emotion_search,
                }
            }

            if rating_list is not None:
                item["predicted_rating"] = round(float(rating_list[idx]), 3)

            results.append(item)

        # 점수순 정렬
        results.sort(key=lambda x: x.get("match_score", 0), reverse=True)

        # ✅ 감정 검색 + interests → 다양성 보장
        if is_emotion_search and user_context.get("interests"):
            logger.info(f"🎯 [DIVERSITY_START] 감정 검색 + interests → 다양성 보장 적용!")
            final_results = self._ensure_category_diversity(
                results,
                user_context.get("interests", ""),
                top_n=5
            )
        else:
            final_results = self._apply_diversity_boost(results)

        return final_results

    async def _supplement_missing_categories(
            self,
            candidate_meetings: List[dict],
            user_context: dict,
            parsed_query: dict
    ) -> List[dict]:
        """
        감정 검색에서 관심사 카테고리가 누락된 경우 보완 검색
        ✅ 보완 모임도 점수 계산!
        """

        try:
            # interests 파싱
            interests_str = user_context.get("interests", "")
            if isinstance(interests_str, str):
                import json
                interests = json.loads(interests_str)
            else:
                interests = interests_str

            if not interests:
                return candidate_meetings

            # 현재 후보의 카테고리 분포 확인
            existing_categories = set()
            for m in candidate_meetings:
                cat = m.get("category")
                if cat:
                    existing_categories.add(cat)

            # 누락된 카테고리 찾기
            missing_categories = [cat for cat in interests if cat not in existing_categories]

            if not missing_categories:
                logger.info(f"✅ [SUPPLEMENT] 모든 관심사 카테고리 존재: {interests}")
                return candidate_meetings

            logger.info(f"🔍 [SUPPLEMENT] 누락 카테고리 발견: {missing_categories}")

            # 보완 검색
            supplemented_meetings = list(candidate_meetings)  # 복사

            for missing_cat in missing_categories:
                supplement_results = await self._fetch_category_meetings(
                    missing_cat,
                    user_context,
                    parsed_query,
                    limit=10
                )

                if supplement_results:
                    # ✅ 보완 모임도 점수 계산!
                    for meeting in supplement_results:
                        # 정규화
                        normalized_meeting = self._normalize_meeting(meeting)

                        # Feature 빌드
                        user = self._build_user_dict(user_context, parsed_query)

                        try:
                            feat, x = self.model_loader.feature_builder.build(
                                user,
                                normalized_meeting
                            )

                            # LightGBM 예측
                            X = np.array([x[0]])
                            rank_raw = self.model_loader.ranker.predict(X)
                            raw_score = float(rank_raw[0])

                            # 간단한 점수 계산 (percentile 없이)
                            base_score = 1.0 / (1.0 + math.exp(-raw_score * 0.25))
                            base_score = 50 + base_score * 30  # 50~80 범위

                            # 감정 검색 보정 적용
                            is_emotion_search = parsed_query.get("emotion_only_search") is True
                            if is_emotion_search:
                                base_score = self._emotion_search_boost(
                                    base_score,
                                    normalized_meeting,
                                    parsed_query
                                )

                            # 점수 저장
                            normalized_meeting["ai_score"] = int(round(base_score))
                            normalized_meeting["match_score"] = int(round(base_score))
                            normalized_meeting["rank_raw"] = round(raw_score, 4)

                            supplemented_meetings.append(normalized_meeting)

                        except Exception as e:
                            logger.warning(
                                f"⚠️ [SUPPLEMENT] 보완 모임 점수 계산 실패 "
                                f"(meeting_id={meeting.get('meeting_id')}): {e}"
                            )
                            # 점수 없이라도 추가
                            normalized_meeting["ai_score"] = 0
                            normalized_meeting["match_score"] = 0
                            supplemented_meetings.append(normalized_meeting)

                    logger.info(
                        f"✅ [SUPPLEMENT] {missing_cat} 보완: {len(supplement_results)}개 추가"
                    )
                else:
                    logger.warning(f"⚠️ [SUPPLEMENT] {missing_cat} 보완 실패")

            logger.info(
                f"📊 [SUPPLEMENT] 보완 완료: {len(candidate_meetings)}개 → "
                f"{len(supplemented_meetings)}개"
            )

            return supplemented_meetings

        except Exception as e:
            logger.error(f"❌ [SUPPLEMENT] 보완 검색 실패: {e}")
            import traceback
            logger.error(f"❌ [SUPPLEMENT] traceback: {traceback.format_exc()}")
            return candidate_meetings

    # scorer.py
    async def _fetch_category_meetings(
            self,
            category: str,
            user_context: dict,
            parsed_query: dict,
            limit: int = 10
    ) -> List[dict]:
        """
        특정 카테고리만 검색 (위치 필터 없음, vibe 무시)
        """
        try:
            import httpx

            payload = {
                "category": category,
                "limit": 50
            }

            logger.info(f"🔍 [FETCH_CAT] 요청: {payload}")

            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.post(
                    "http://localhost:8080/api/meetings/search",
                    json=payload
                )

                # ✅ 상세 디버그
                logger.info(f"🔍 [FETCH_CAT_DEBUG] status={response.status_code}")
                logger.info(f"🔍 [FETCH_CAT_DEBUG] response.text={response.text[:500]}")  # 처음 500자

                if response.status_code == 200:
                    data = response.json()
                    logger.info(f"🔍 [FETCH_CAT_DEBUG] response keys={list(data.keys())}")

                    # ✅ 여러 가능한 필드 시도
                    meetings = (
                            data.get("content") or
                            data.get("meetings") or
                            data.get("data") or
                            []
                    )

                    logger.info(
                        f"🔍 [FETCH_CAT] {category} 검색 성공: {len(meetings)}개"
                    )

                    if len(meetings) == 0:
                        logger.warning(f"⚠️ [FETCH_CAT] Spring returned 0 results!")
                        logger.warning(f"⚠️ [FETCH_CAT] Full response: {data}")

                    # 거리 정렬 생략 (테스트용)
                    return meetings[:limit]
                else:
                    logger.warning(f"⚠️ [FETCH_CAT] 실패: {response.status_code}")
                    logger.warning(f"⚠️ [FETCH_CAT] body: {response.text}")
                    return []

        except Exception as e:
            logger.error(f"❌ [FETCH_CAT] 오류: {e}")
            import traceback
            logger.error(f"❌ [FETCH_CAT] traceback: {traceback.format_exc()}")
            return []

    def _sort_by_distance(self, meetings, user_location):
        """거리순 정렬"""
        from math import radians, sin, cos, sqrt, atan2

        def calc_distance(meeting):
            """Haversine distance"""
            try:
                m_lat = meeting.get("latitude") or meeting.get("lat")
                m_lng = meeting.get("longitude") or meeting.get("lng")

                if not m_lat or not m_lng:
                    return float('inf')

                R = 6371  # Earth radius in km

                lat1 = radians(user_location["latitude"])
                lon1 = radians(user_location["longitude"])
                lat2 = radians(float(m_lat))
                lon2 = radians(float(m_lng))

                dlat = lat2 - lat1
                dlon = lon2 - lon1

                a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
                c = 2 * atan2(sqrt(a), sqrt(1 - a))

                return R * c
            except:
                return float('inf')

        return sorted(meetings, key=calc_distance)


    def _ensure_category_diversity(
            self,
            sorted_meetings: List[Dict],
            user_interests: str,
            top_n: int = 5
    ) -> List[Dict]:
        """
        사용자 관심사 카테고리별로 최소 1개씩 보장
        """
        try:
            # interests 파싱
            if isinstance(user_interests, str):
                import json
                interests = json.loads(user_interests)
            else:
                interests = user_interests

        except Exception as e:
            logger.warning(f"⚠️ interests 파싱 실패, 원본 반환: {e}")
            return sorted_meetings[:top_n]

        if not interests:
            return sorted_meetings[:top_n]

        diverse_results = []  # ✅ 로컬 변수! score_meetings의 results와 다름
        used_meeting_ids = set()
        used_categories = set()

        # 1단계: 각 관심 카테고리에서 최고점 1개씩 선택
        logger.info(f"🎯 [DIVERSITY] 관심 카테고리: {interests}")

        for interest in interests:
            for meeting in sorted_meetings:
                meeting_id = meeting.get('meeting_id') or meeting.get('meetingId')
                category = meeting.get('category')

                if (category == interest and
                        interest not in used_categories and
                        meeting_id not in used_meeting_ids):
                    diverse_results.append(meeting)
                    used_meeting_ids.add(meeting_id)
                    used_categories.add(interest)

                    logger.info(
                        f"✅ [DIVERSITY] {interest} 보장: "
                        f"{meeting.get('title')} (점수={meeting.get('match_score', 0)})"
                    )
                    break

        # 2단계: 나머지 슬롯을 점수순으로 채움
        remaining = top_n - len(diverse_results)
        logger.info(f"📊 [DIVERSITY] 1단계 완료: {len(diverse_results)}개, 남은 슬롯: {remaining}개")

        for meeting in sorted_meetings:
            if remaining <= 0:
                break

            meeting_id = meeting.get('meeting_id') or meeting.get('meetingId')
            if meeting_id not in used_meeting_ids:
                diverse_results.append(meeting)
                used_meeting_ids.add(meeting_id)
                remaining -= 1

                logger.info(
                    f"➕ [DIVERSITY] 추가: {meeting.get('title')} "
                    f"({meeting.get('category')}, 점수={meeting.get('match_score', 0)})"
                )

        # 최종 결과 로그
        final_categories = [m.get('category') for m in diverse_results]
        from collections import Counter
        category_dist = Counter(final_categories)
        logger.info(f"🎉 [DIVERSITY] 최종 카테고리 분포: {dict(category_dist)}")

        return diverse_results[:top_n]


    def _apply_diversity_boost(self, scored_meetings: List[Dict], top_n: int = 5) -> List[Dict]:
        """카테고리 다양성 보장: 각 카테고리에서 최소 1개씩"""

        # 카테고리별 그룹화
        by_category = {}
        for m in scored_meetings:
            cat = m.get('category', '기타')
            if cat not in by_category:
                by_category[cat] = []
            by_category[cat].append(m)

        # 각 카테고리에서 top 1 선택
        diverse_results = []
        for cat, meetings in by_category.items():
            if meetings:
                diverse_results.append(meetings[0])  # 이미 정렬되어 있음

        # 점수 순 정렬
        diverse_results.sort(key=lambda x: x.get('ai_score', 0), reverse=True)

        # 남은 자리는 원래 점수 순으로 채우기
        if len(diverse_results) < top_n:
            used_ids = {m['meetingId'] for m in diverse_results}
            for m in scored_meetings:
                if m['meetingId'] not in used_ids:
                    diverse_results.append(m)
                    if len(diverse_results) >= top_n:
                        break

        return diverse_results[:top_n]

    def _emotion_search_boost(self, ms: float, meeting: dict, query: dict) -> float:
        requested_vibe = (query.get("vibe") or "").strip()
        meeting_category = meeting.get("category", "").strip()
        meeting_vibe = (meeting.get("vibe") or "").strip()
        meeting_sub = meeting.get("subcategory", "").strip()

        # ✅ ACTIVE 검색 시 맛집/카페 강력 페널티 (증폭!)
        if requested_vibe in ["즐거운", "활기찬", "신나는", "격렬한"]:
            if meeting_category in ["맛집", "카페"]:
                logger.info(f"[ACTIVE_FOOD_PENALTY] {meeting_category}는 활동성 낮음 → -100점")  # -60 → -100
                return ms - 100  # ✅ 페널티 증폭!

        # ✅ CALM 검색 시 맛집/카페 보너스
        elif requested_vibe in ["힐링", "편안한", "여유로운", "차분한"]:
            if meeting_category in ["맛집", "카페"]:
                logger.info(f"[CALM_FOOD_BONUS] {meeting_category}는 편안함 → +25점")
                ms += 25

        # Subcategory 강제 재분류
        calm_subcategories = [
            "요가", "필라테스", "명상", "스트레칭", "플라워", "뜨개질", "독서",
            "브런치", "카페투어"
        ]

        active_subcategories = [
            "볼링", "노래방", "클럽", "방탈출", "러닝", "축구", "배드민턴",
            "댄스", "케이팝", "힙합"
        ]

        if meeting_sub in calm_subcategories:
            effective_vibe = "힐링"
        elif meeting_sub in active_subcategories:
            effective_vibe = "즐거운"
        else:
            effective_vibe = meeting_vibe

        if not effective_vibe:
            return ms - 25

        # Vibe 그룹 세분화
        vibe_groups = {
            "active": ["즐거운", "활기찬", "신나는", "격렬한", "에너지 넘치는"],
            "calm_healing": ["힐링", "편안한"],
            "calm_relaxed": ["여유로운", "차분한", "감성적인"],
        }

        req_group = None
        meet_group = None

        for group_name, vibes in vibe_groups.items():
            if requested_vibe in vibes:
                req_group = group_name
            if effective_vibe in vibes:
                meet_group = group_name

        # 완전 일치
        if requested_vibe == effective_vibe:
            logger.info(f"[VIBE_MATCH] 완전 일치 ({requested_vibe}) → +60점")
            return ms + 60

        # 같은 그룹 유사
        if req_group and req_group == meet_group:
            logger.info(f"[VIBE_SIMILAR] {req_group} 유사 ({requested_vibe}/{effective_vibe}) → +25점")
            return ms + 25

        # Calm 계열 간 유사
        calm_groups = ["calm_healing", "calm_relaxed"]
        if req_group in calm_groups and meet_group in calm_groups:
            logger.info(f"[VIBE_CALM_SIMILAR] Calm 계열 유사 → +15점")
            return ms + 15

        # Active vs Calm 불일치
        if (req_group == "active" and meet_group in calm_groups) or \
                (req_group in calm_groups and meet_group == "active"):
            logger.info(f"[VIBE_MISMATCH] Active↔Calm 불일치 → -80점")
            return ms - 80

        # 힐링 서브카테고리 보너스
        if requested_vibe in ["힐링", "편안한"] and meeting_sub in calm_subcategories:
            logger.info(f"[HEALING_BOOST] {meeting_sub} 힐링 활동 → 추가 +20점")
            return ms + 20

        # 기타 불일치
        logger.info(f"[VIBE_MISMATCH] 요청={requested_vibe}, 모임={effective_vibe} → -50점")
        return ms - 50

    # app/services/scoring/scorer.py

    def _build_user_dict(self, user_ctx: dict, parsed_query: dict) -> dict:
        """User 정보 딕셔너리 생성"""

        def pick(d: dict, *keys, default=None):
            for k in keys:
                if k in d and d.get(k) is not None:
                    return d.get(k)
            return default

        # ✅ User의 requested vibe 추가
        user_vibe = parsed_query.get("vibe") or user_ctx.get("vibe")

        # ✅ 감정 검색인지 체크
        is_emotion_search = (
                parsed_query.get("emotion_only_search") is True or
                (not parsed_query.get("category") and
                 parsed_query.get("vibe") and
                 float(parsed_query.get("confidence", 0) or 0) <= 0.6)
        )

        # ✅ 디버깅 로그 추가!
        original_interests = pick(user_ctx, "interests", default="")
        final_interests = "" if is_emotion_search else original_interests

        logger.info(f"🔥 [USER_DICT_DEBUG] is_emotion_search={is_emotion_search}")
        logger.info(f"🔥 [USER_DICT_DEBUG] original_interests={original_interests}")
        logger.info(f"🔥 [USER_DICT_DEBUG] final_interests={final_interests}")

        return {
            "lat": pick(user_ctx, "lat", "latitude", default=None),
            "lng": pick(user_ctx, "lng", "longitude", default=None),

            # ✅ 감정 검색 시 관심사 무시!
            "interests": final_interests,

            "time_preference": self.normalizer.normalize_timeslot(
                pick(user_ctx, "time_preference", "timePreference", default=None)
            ),
            "user_location_pref": pick(user_ctx, "user_location_pref", "userLocationPref", default=None),
            "budget_type": self.normalizer.normalize_budget_type(
                pick(user_ctx, "budget_type", "budgetType", default="value")
            ),
            "user_avg_rating": float(pick(user_ctx, "user_avg_rating", "userAvgRating", default=3.0)),
            "user_meeting_count": int(pick(user_ctx, "user_meeting_count", "userMeetingCount", default=0)),
            "user_rating_std": float(pick(user_ctx, "user_rating_std", "userRatingStd", default=0.5)),

            # ✅ NEW: User vibe (감정 전용 검색용)
            "vibe": user_vibe,
            "requested_vibe": user_vibe,
        }

    def _normalize_meeting(self, m: dict) -> dict:
        """모임 정보 정규화"""
        title = (m.get("title") or "").strip()
        sub = (m.get("subcategory") or "").strip()
        cat = (m.get("category") or "").strip()

        # title 기반 스포츠 subcategory 자동 교정
        if cat == "스포츠" and title:
            t = title.lower()
            if "러닝" in t or "달리기" in t:
                sub = "러닝"
            elif "축구" in t or "풋살" in t:
                sub = "축구"
            elif "배드민턴" in t:
                sub = "배드민턴"
            elif "클라이밍" in t:
                sub = "클라이밍"

        return {
            "meeting_id": m.get("meeting_id") or m.get("meetingId"),
            "lat": m.get("latitude") or m.get("lat"),
            "lng": m.get("longitude") or m.get("lng"),
            "category": cat or "",
            "subcategory": sub or "",
            "time_slot": self.normalizer.normalize_timeslot(m.get("time_slot") or m.get("timeSlot")),
            "meeting_location_type": self.normalizer.normalize_location_type(
                m.get("location_type") or m.get("locationType")
            ),
            "vibe": m.get("vibe", "") or "",
            "meeting_participant_count": m.get("current_participants") or m.get("currentParticipants") or 0,
            "expected_cost": m.get("expected_cost") or m.get("expectedCost") or 0,
            "meeting_avg_rating": m.get("avg_rating") or m.get("avgRating") or 0.0,
            "meeting_rating_count": m.get("rating_count") or m.get("ratingCount") or 0,
            "distance_km": m.get("distance_km") or m.get("distanceKm"),
            "title": m.get("title"),
            "image_url": m.get("image_url") or m.get("imageUrl"),
            "location_name": m.get("location_name") or m.get("locationName"),
            "location_address": m.get("location_address") or m.get("locationAddress"),
            "meeting_time": m.get("meeting_time") or m.get("meetingTime"),
            "max_participants": m.get("max_participants") or m.get("maxParticipants") or 10,
            "current_participants": m.get("current_participants") or m.get("currentParticipants") or 0,
        }

    def _dynamic_ceil(self, n: int, conf: float) -> int:
        """동적 상한"""
        if n == 1:
            return 73
        elif n == 2:
            return 76
        elif n == 3:
            return 79
        elif n <= 5:
            return 82
        elif n <= 10:
            return 84
        elif n <= 30:
            return 85
        elif n <= 50:
            return 86
        else:
            return 87

    def _compute_match_scores(
            self,
            raw_list: List[float],
            n: int,
            conf: float,
            ceil: int,
            valid_candidates: List[dict]
    ) -> List[int]:
        """Percentile → Match Score 변환"""
        match_scores = [55] * n

        if n == 1:
            s = raw_list[0]
            base_score = 1.0 / (1.0 + math.exp(-s * 0.25))
            base_score = 58 + base_score * 15
            conf_bonus = conf * 3
            ms = base_score + conf_bonus
            ms = max(60, min(73, ms))
            match_scores[0] = int(round(ms))

        elif n <= 10:
            base = [78, 74, 70, 66, 63, 60, 57, 55, 53, 51]
            order = sorted(range(n), key=lambda i: raw_list[i], reverse=True)

            top = raw_list[order[0]]
            bottom = raw_list[order[-1]]
            span = (top - bottom) if (top - bottom) != 0 else 1.0

            for rank, i in enumerate(order):
                b = base[rank] if rank < len(base) else 52
                t = (raw_list[i] - bottom) / span
                adj = (t - 0.5) * 6.0
                ms = b + adj
                ms = max(50, min(82, ms))
                ms = min(ms, ceil)
                match_scores[i] = int(round(ms))

        else:
            sorted_vals = sorted(raw_list)

            def percentile_midrank(x: float) -> float:
                lt = sum(1 for v in sorted_vals if v < x)
                eq = sum(1 for v in sorted_vals if v == x)
                p = (lt + 0.5 * eq) / n
                eps = 0.5 / n
                if p < eps:
                    p = eps
                if p > 1 - eps:
                    p = 1 - eps
                return p

            for i, s in enumerate(raw_list):
                meeting_id = valid_candidates[i].get("meeting_id", i)

                p = percentile_midrank(float(s))

                # meeting_id 기반 noise
                id_noise = (meeting_id % 1000) * 0.00001
                order_noise = i * 0.0001

                p_adjusted = p + id_noise + order_noise
                p_adjusted = max(0.0, min(1.0, p_adjusted))

                # stretch + gamma
                p_final = max(0.0, min(1.0, 0.5 + (p_adjusted - 0.5) * 1.6))

                ms = match_from_percentile(p_final, floor=46, ceil=ceil, gamma=1.6)
                ms = min(ms, ceil)
                match_scores[i] = int(ms)

        return match_scores

    def _adjust_timeslot(self, ms: float, m: dict, parsed_query: dict) -> float:
        """시간대 매칭 보정"""
        requested_ts = parsed_query.get("time_slot") or parsed_query.get("timeSlot")
        meeting_ts = m.get("time_slot")

        if requested_ts and meeting_ts:
            req_normalized = self.normalizer.normalize_timeslot(requested_ts)
            meet_normalized = self.normalizer.normalize_timeslot(meeting_ts)

            if req_normalized == meet_normalized:
                ms += 10
            elif self._is_adjacent_timeslot(req_normalized, meet_normalized):
                ms += 2
            else:
                ms -= 15

        return ms

    def _adjust_location_query(self, ms: float, m: dict, parsed_query: dict) -> float:
        """location_query 보정"""
        location_query = parsed_query.get("location_query")
        if location_query:
            meeting_loc = str(m.get("location_name", "")).lower()
            query_loc = str(location_query).lower()
            query_keyword = query_loc.replace("근처", "").replace("주변", "").replace("집", "").strip()

            if query_keyword and query_keyword in meeting_loc:
                ms += 20
            elif any(keyword in meeting_loc for keyword in ["구", "역", "동"]):
                ms -= 5

        return ms

    def _adjust_subcategory(self, ms: float, m: dict, parsed_query: dict, conf: float) -> float:
        """subcategory 보정"""
        requested_sub = (parsed_query.get("subcategory") or "").strip()
        if requested_sub and conf >= 0.7:
            meet_sub = (m.get("subcategory") or "").strip()
            if meet_sub == requested_sub:
                ms += 18
            else:
                ms -= 25

        return ms

    def _adjust_keywords(self, ms: float, m: dict, parsed_query: dict) -> float:
        """keywords 보정"""
        keywords = clean_keywords(parsed_query.get("keywords") or [])
        if keywords:
            text = (
                f"{m.get('title', '')} {m.get('location_name', '')} {m.get('location_address', '')} "
                f"{m.get('subcategory', '')} {m.get('vibe', '')}"
            ).lower()

            hit = sum(1 for k in keywords if k in text)
            ms += min(hit * 2, 5)

        return ms

    def _query_match_bonus(self, m: dict, q_terms: List[str]) -> float:
        """query_terms 매칭 보너스"""
        if not q_terms:
            return 0.0

        title = (m.get("title") or "").lower()
        sub = (m.get("subcategory") or "").lower()
        cat = (m.get("category") or "").lower()
        loc = (m.get("location_name") or "").lower()

        hay = f"{title} {sub} {cat} {loc}"

        hit = sum(1 for t in q_terms if t and t.lower() in hay)

        if hit >= 2:
            return 30.0
        if hit == 1:
            return 22.0

        return -12.0

    def _build_key_points(self, feat: dict) -> List[str]:
        """핵심 포인트 생성"""
        points = []
        if feat.get("distance_km", 999) <= 3:
            points.append(f"가까운 거리({feat['distance_km']:.1f}km)")
        if feat.get("time_match") == 1.0:
            points.append("선호 시간대 일치")
        if feat.get("location_type_match") == 1.0:
            points.append("실내/야외 선호 일치")
        if feat.get("cost_match_score", 0) >= 0.7:
            points.append("예산에 잘 맞음")
        if feat.get("interest_match_score", 0) >= 0.5:
            points.append("관심사 매칭")
        return points[:3]

    def _is_adjacent_timeslot(self, slot1: str, slot2: str) -> bool:
        """인접 시간대 체크"""
        if not slot1 or not slot2:
            return False

        adjacency = {
            "MORNING": ["AFTERNOON"],
            "AFTERNOON": ["MORNING", "EVENING"],
            "EVENING": ["AFTERNOON", "NIGHT"],
            "NIGHT": ["EVENING"]
        }

        return slot2 in adjacency.get(slot1, [])