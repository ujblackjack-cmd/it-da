"""
Meeting Search Service
모임 검색 + Relaxation 로직
"""

import httpx
import json
from collections import Counter
from typing import List, Dict, Optional
from app.core.logging import logger


class MeetingSearchService:
    """모임 검색 + 점진적 완화"""

    def __init__(
            self,
            spring_boot_url: str,
            query_builder,
            search_strategy,
            normalizer
    ):
        self.spring_boot_url = spring_boot_url
        self.query_builder = query_builder
        self.search_strategy = search_strategy
        self.normalizer = normalizer

    async def search_with_relaxation(
            self,
            base_query: dict,
            user_context: dict,
            trace_steps: list,
            user_prompt: str = ""
    ) -> List[dict]:
        """점진적 완화 검색"""
        conf = float(base_query.get("confidence", 0) or 0)
        explicit_quiet = self._has_explicit_quiet(user_prompt)

        logger.info(f"🔥 [RELAX_START] conf={conf:.2f}, base_query={base_query}")

        base_cat = (base_query.get("category") or "").strip() or None

        # L0: conf 기반 시작 쿼리 정규화
        q0 = self.search_strategy.pre_relax_query_by_conf(base_query)

        # vibe는 explicit_quiet 아닐 때만 제거
        if conf < 0.85:
            if conf < 0.85 and not explicit_quiet:
                q0.pop("vibe", None)

        # L0 시도
        cands = await self._try_search("L0(conf 반영)", q0, 0, user_context, trace_steps, user_prompt)

        if cands:
            # subcategory 우선 필터
            requested_sub = (base_query.get("subcategory") or "").strip()
            if requested_sub:
                before = len(cands)
                cands_sub = [
                    m for m in cands
                    if (m.get("subcategory") or "").strip() == requested_sub
                ]
                if cands_sub:
                    logger.info(f"[RELAX_0] subcategory 우선필터 {before}->{len(cands_sub)} ({requested_sub})")
                    return cands_sub

            # category 가드
            if base_cat and all((m.get("category") or "").strip() != base_cat for m in cands):
                q_fix = self._drop_keys(q0, "location_query", "locationQuery")
                c2 = await self._try_search("L0-guard(locationQuery 제거)", q_fix, 1, user_context, trace_steps,
                                            user_prompt)
                if c2 and any((m.get("category") or "").strip() == base_cat for m in c2):
                    return c2

                q_fix2 = self._drop_keys(q0, "location_type", "locationType", "location_query", "locationQuery")
                c3 = await self._try_search("L0-guard(locationType 제거)", q_fix2, 2, user_context, trace_steps,
                                            user_prompt)
                if c3:
                    return c3

            return cands

        # Relaxation plan 생성
        plans = self.search_strategy.get_relaxation_plan(base_query, user_prompt)

        # 순차 완화
        current = dict(q0)
        level = 1
        for label, keys in plans:
            qn = self._drop_keys(current, *keys)
            cands = await self._try_search(label, qn, level, user_context, trace_steps, user_prompt)

            if cands:
                if base_cat and all((m.get("category") or "").strip() != base_cat for m in cands):
                    q_fix = self._drop_keys(qn, "location_query", "locationQuery")
                    c2 = await self._try_search(f"{label}-guard", q_fix, level + 1, user_context, trace_steps,
                                                user_prompt)
                    if c2:
                        return c2
                return cands

            current = qn
            level += 1

        logger.warning("🔥 [RELAX_END] 모든 단계 실패 - 빈 리스트 반환")
        return []

    async def _try_search(
            self,
            label: str,
            q: dict,
            level: int,
            user_context: dict,
            trace_steps: list,
            user_prompt: str
    ) -> List[dict]:
        """단일 검색 시도"""
        logger.info(f"🔥 [RELAX_{level}] {label} 시작")
        logger.info(f"🔥 [RELAX_{level}] query={q}")

        meetings = await self._search_meetings(q, user_context, user_prompt)
        meetings = meetings or []

        # ✅ VIBE 2차 필터링 (Spring이 안 했으니 여기서 처리)
        requested_vibe = q.get("vibe")
        if requested_vibe and meetings:
            normalized_req_vibe = self.normalizer.normalize_vibe(requested_vibe)
            before_count = len(meetings)

            filtered_meetings = []
            for m in meetings:
                meeting_vibe = self.normalizer.normalize_vibe(m.get("vibe"))

                # 완전 일치
                if meeting_vibe == normalized_req_vibe:
                    filtered_meetings.append(m)
                    continue

                # 힐링 계열 유사 매칭
                healing_vibes = {"힐링", "여유로운", "차분한", "조용한", "편안한", "잔잔한"}
                if normalized_req_vibe in healing_vibes and meeting_vibe in healing_vibes:
                    filtered_meetings.append(m)
                    continue

                # 즐거운 계열 유사 매칭
                fun_vibes = {"즐거운", "신나는", "재밌는", "활기찬", "흥미로운", "재미있는"}
                if normalized_req_vibe in fun_vibes and meeting_vibe in fun_vibes:
                    filtered_meetings.append(m)
                    continue

            # 필터링 결과가 충분하면 적용
            min_threshold = min(30, int(len(meetings) * 0.4))
            if len(filtered_meetings) >= max(5, min_threshold):
                meetings = filtered_meetings
                logger.info(
                    f"🎨 [AI_VIBE_FILTER] {normalized_req_vibe} | "
                    f"{before_count} -> {len(meetings)}"
                )
            else:
                logger.warning(
                    f"⚠️ [AI_VIBE_FILTER] {normalized_req_vibe} 결과 {len(filtered_meetings)}개 → 스킵"
                )

        # locationType 2차 필터
        requested_type = q.get("location_type")
        if requested_type:
            requested_normalized = self.normalizer.normalize_location_type(requested_type)
            before_count = len(meetings)

            meetings = [
                m for m in meetings
                if self.normalizer.normalize_location_type(
                    self._pick_location_type_from_raw(m)
                ) == requested_normalized
            ]

            if len(meetings) < before_count:
                logger.info(
                    f"🔍 [RELAX_{level}] locationType 2차 필터: {requested_normalized} | "
                    f"{before_count} -> {len(meetings)}"
                )

        logger.info(f"🔥 [RELAX_{level}] {label} 완료: {len(meetings)}개 받음")

        # Trace 기록
        trace_steps.append({
            "level": level,
            "label": label,
            "payload": self.query_builder.build_search_request(q, user_context, user_prompt),
            "count": len(meetings),
            "cats": dict(Counter((m.get("category"), m.get("subcategory")) for m in meetings)) if meetings else {},
        })

        return meetings

    async def _search_meetings(
            self,
            enriched_query: dict,
            user_context: dict,
            user_prompt: str = ""
    ) -> List[dict]:
        """Spring Boot API 호출"""
        try:
            payload = self.query_builder.build_search_request(enriched_query, user_context, user_prompt)
            logger.info(f"[PAYLOAD_FULL] {payload}")

            logger.info(f"[SEARCH_REQUEST] URL={self.spring_boot_url}/api/meetings/search")
            logger.info(f"[SEARCH_PAYLOAD] {json.dumps(payload, ensure_ascii=False)}")

            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    f"{self.spring_boot_url}/api/meetings/search",
                    json=payload
                )

            logger.info(f"[SEARCH_RESPONSE] status={response.status_code}")

            if response.status_code == 200:
                result = response.json()
                meetings = result.get("meetings", [])

                logger.info(f"📦 Spring 응답: {len(meetings)}개 모임 받음")
                if meetings:
                    ids = [m.get('meeting_id') or m.get('meetingId') for m in meetings[:5]]
                    logger.info(f"🔝 상위 5개 ID: {ids}")

                return meetings
            else:
                logger.warning(f"⚠️ 모임 검색 실패: {response.status_code} body={response.text}")
                return []
        except Exception as e:
            logger.error(f"⚠️ 모임 검색 API 호출 실패: {e}")
            return []

    def _drop_keys(self, q: dict, *keys):
        """특정 키 제거"""
        qq = dict(q)
        for k in keys:
            qq.pop(k, None)
        return qq

    def _pick_location_type_from_raw(self, m: dict) -> Optional[str]:
        """Spring DTO에서 location_type 추출"""
        return m.get("location_type") or m.get("locationType")

    def _has_explicit_quiet(self, text: str) -> bool:
        """명시적 조용함 표현 감지"""
        t = (text or "").lower()
        return any(w in t for w in ["조용", "차분", "힐링", "잔잔", "고요"])