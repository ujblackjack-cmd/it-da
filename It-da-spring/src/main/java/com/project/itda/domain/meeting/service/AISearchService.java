package com.project.itda.domain.meeting.service;

import com.project.itda.domain.meeting.dto.request.AISearchRequest;
import com.project.itda.domain.meeting.dto.response.AISearchResponse;
import com.project.itda.domain.meeting.dto.response.AIMeetingDTO;
import com.project.itda.domain.meeting.dto.response.AIMeetingDTO.OrganizerInfo;
import com.project.itda.domain.meeting.entity.Meeting;
import com.project.itda.domain.meeting.enums.MeetingStatus;
import com.project.itda.domain.meeting.repository.MeetingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.function.Predicate;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AISearchService {

    private final MeetingRepository meetingRepository;

    private static final int MIN_CANDIDATES = 30;
    private static final int MIN_CATEGORY_CANDIDATES = 5;

    public AISearchResponse searchForAI(AISearchRequest request) {
        log.info("🤖 AI 검색: category={}, subcategory={}, timeSlot={}, locationQuery={}, locationType={}, vibe={}, maxCost={}, keywords={}",
                request.getCategory(), request.getSubcategory(), request.getTimeSlot(),
                request.getLocationQuery(), request.getLocationType(), request.getVibe(),
                request.getMaxCost(), request.getKeywords());

        // 0) 기본 후보군: RECRUITING 전체
        List<Meeting> base = meetingRepository.findByStatus(
                MeetingStatus.RECRUITING, Pageable.unpaged()
        ).getContent();

        List<Meeting> meetings = base;

        // ✅ 1) locationType 필터 (최우선 하드 필터)
        if (hasText(request.getLocationType())) {
            String lt = request.getLocationType().trim().toUpperCase();

            meetings = meetings.stream()
                    .filter(m -> m.getLocationType() != null &&
                            m.getLocationType().name().equalsIgnoreCase(lt))
                    .toList();

            log.info("✅ [locationType={}] 하드 필터: {} -> {}",
                    lt, base.size(), meetings.size());

            if (meetings.isEmpty()) {
                log.warn("⚠️ locationType={} 결과 0개", lt);
                return AISearchResponse.builder()
                        .meetings(List.of())
                        .totalCount(0)
                        .build();
            }
        }

        // 2) category (소프트)
        if (hasText(request.getCategory())) {
            String cat = request.getCategory().trim();

            meetings = applySoftFilter(
                    meetings,
                    m -> m.getCategory() != null && m.getCategory().trim().equalsIgnoreCase(cat),
                    "category=" + cat,
                    MIN_CATEGORY_CANDIDATES
            );
        }

        // 3) subcategory (세미-하드: 결과가 있으면 적용)
        if (hasText(request.getSubcategory())) {
            String sub = request.getSubcategory().trim();
            List<Meeting> filtered = meetings.stream()
                    .filter(m -> m.getSubcategory() != null && m.getSubcategory().trim().equalsIgnoreCase(sub))
                    .toList();

            if (!filtered.isEmpty()) {
                log.info("✅ [subcategory={}] 적용: {} -> {}", sub, meetings.size(), filtered.size());
                meetings = filtered;
            } else {
                log.info("⚠️ [subcategory={}] 결과 0개 → 스킵", sub);
            }
        }

        // ✅ 4) vibe 필터 추가 (소프트)
        if (hasText(request.getVibe())) {
            String vibeReq = request.getVibe().trim();

            meetings = applySoftFilter(
                    meetings,
                    m -> {
                        if (m.getVibe() == null) return false;
                        String mVibe = m.getVibe().trim();

                        // 완전 일치
                        if (mVibe.equalsIgnoreCase(vibeReq)) return true;

                        // ✅ 유사 vibe 매칭 (힐링 계열)
                        if (isHealingVibe(vibeReq) && isHealingVibe(mVibe)) return true;

                        // ✅ 유사 vibe 매칭 (즐거운 계열)
                        if (isFunVibe(vibeReq) && isFunVibe(mVibe)) return true;

                        return false;
                    },
                    "vibe=" + vibeReq
            );
        }

        log.info("🧪 [REQ] category='{}', subcategory='{}', locationType='{}', vibe='{}'",
                request.getCategory(), request.getSubcategory(), request.getLocationType(), request.getVibe());

        log.info("🧪 [CAND_BEFORE_SUB] size={}, subcats={}",
                meetings.size(),
                meetings.stream().map(Meeting::getSubcategory).filter(Objects::nonNull)
                        .map(String::trim).distinct().limit(20).toList());

        log.info("🧪 [CAND_AFTER_SUB] size={}, subcats={}",
                meetings.size(),
                meetings.stream().map(Meeting::getSubcategory).filter(Objects::nonNull)
                        .map(String::trim).distinct().limit(20).toList());

        // 5) timeSlot (소프트)
        if (hasText(request.getTimeSlot())) {
            Set<String> allowed = Arrays.stream(request.getTimeSlot().split(","))
                    .map(String::trim)
                    .filter(s -> !s.isBlank())
                    .map(String::toUpperCase)
                    .collect(Collectors.toSet());

            if (!allowed.isEmpty()) {
                meetings = applySoftFilter(
                        meetings,
                        m -> m.getTimeSlot() != null && allowed.contains(m.getTimeSlot().name()),
                        "timeSlot in " + allowed
                );
            }
        }

        // 6) maxCost (소프트)
        if (request.getMaxCost() != null) {
            Integer max = request.getMaxCost();
            meetings = applySoftFilter(
                    meetings,
                    m -> m.getExpectedCost() != null && m.getExpectedCost() <= max,
                    "maxCost<=" + max
            );
        }

        // 7) locationQuery 텍스트 필터 (소프트)
        if (hasText(request.getLocationQuery()) && !isNearMePhrase(request.getLocationQuery())) {
            String q = request.getLocationQuery().trim().toLowerCase();
            meetings = applySoftFilter(
                    meetings,
                    m -> containsIgnoreCase(m.getLocationName(), q) || containsIgnoreCase(m.getLocationAddress(), q),
                    "locationQuery contains '" + q + "'"
            );
        }

        // 8) keywords 텍스트 필터 (소프트)
        if (request.getKeywords() != null && !request.getKeywords().isEmpty()) {
            List<String> kws = request.getKeywords().stream()
                    .filter(Objects::nonNull)
                    .map(String::trim)
                    .filter(s -> !s.isBlank())
                    .map(String::toLowerCase)
                    .distinct()
                    .toList();

            if (!kws.isEmpty()) {
                meetings = applySoftFilter(
                        meetings,
                        m -> {
                            String hay = buildHaystack(m);
                            for (String kw : kws) {
                                if (hay.contains(kw)) return true;
                            }
                            return false;
                        },
                        "keywords anyMatch " + kws
                );
            }
        }

        // 9) 거리 계산 + nearMe일 때만 radius 적용/정렬
        meetings = applyDistanceLogic(meetings, request);

        // DTO 변환
        List<AIMeetingDTO> meetingDTOs = meetings.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());

        log.info("✅ AI 검색 완료: {}개 모임 반환", meetingDTOs.size());

        return AISearchResponse.builder()
                .meetings(meetingDTOs)
                .totalCount(meetingDTOs.size())
                .build();
    }

    public AISearchResponse getMeetingsBatch(List<Long> meetingIds) {
        log.info("📦 모임 일괄 조회: {} IDs", meetingIds.size());

        List<Meeting> meetings = meetingRepository.findAllById(meetingIds);

        List<AIMeetingDTO> meetingDTOs = meetings.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());

        return AISearchResponse.builder()
                .meetings(meetingDTOs)
                .totalCount(meetingDTOs.size())
                .build();
    }

    // =========================
    // ✅ Vibe 유사도 매칭 헬퍼
    // =========================

    /**
     * 힐링 계열 vibe 체크
     */
    private boolean isHealingVibe(String vibe) {
        if (vibe == null) return false;
        String v = vibe.trim().toLowerCase();
        return v.equals("힐링") || v.equals("여유로운") || v.equals("차분한") ||
                v.equals("조용한") || v.equals("편안한") || v.equals("잔잔한");
    }

    /**
     * 즐거운 계열 vibe 체크
     */
    private boolean isFunVibe(String vibe) {
        if (vibe == null) return false;
        String v = vibe.trim().toLowerCase();
        return v.equals("즐거운") || v.equals("신나는") || v.equals("재밌는") ||
                v.equals("활기찬") || v.equals("흥미로운");
    }

    // =========================
    // 필터 로직
    // =========================

    private List<Meeting> applySoftFilter(List<Meeting> current, Predicate<Meeting> predicate, String label) {
        return applySoftFilter(current, predicate, label, MIN_CANDIDATES);
    }

    private List<Meeting> applySoftFilter(
            List<Meeting> current,
            Predicate<Meeting> predicate,
            String label,
            int minCandidates
    ) {
        if (current == null || current.isEmpty()) return current;

        List<Meeting> filtered = current.stream().filter(predicate).toList();

        if (filtered.isEmpty()) {
            log.info("⚠️ [{}] 결과 0개 → 스킵 (원본 {} 유지)", label, current.size());
            return current;
        }

        int dynamicMin = Math.min(minCandidates, Math.max(5, (int)Math.ceil(current.size() * 0.4)));

        if (filtered.size() < dynamicMin) {
            log.info("⚠️ [{}] 결과 {}개(<{}) → 스킵 (원본 {} 유지)",
                    label, filtered.size(), dynamicMin, current.size());
            return current;
        }

        log.info("✅ [{}] 적용: {} -> {}", label, current.size(), filtered.size());
        return filtered;
    }

    // =========================
    // 거리 로직
    // =========================

    private List<Meeting> applyDistanceLogic(List<Meeting> meetings, AISearchRequest request) {
        if (meetings == null || meetings.isEmpty()) return meetings;
        if (request.getUserLocation() == null) return meetings;
        if (request.getUserLocation().getLatitude() == null || request.getUserLocation().getLongitude() == null) return meetings;

        Double userLat = request.getUserLocation().getLatitude();
        Double userLng = request.getUserLocation().getLongitude();

        boolean nearMe = hasText(request.getLocationQuery()) && isNearMePhrase(request.getLocationQuery());

        Double radius = request.getRadius();
        if (nearMe && radius == null) radius = 10.0;

        for (Meeting m : meetings) {
            if (m.getLatitudeAsDouble() != null && m.getLongitudeAsDouble() != null) {
                double d = calculateDistance(userLat, userLng, m.getLatitudeAsDouble(), m.getLongitudeAsDouble());
                m.setDistanceKm(d);
            }
        }

        if (nearMe && radius != null) {
            double r = radius;
            List<Meeting> filtered = meetings.stream()
                    .filter(m -> m.getDistanceKm() != null && m.getDistanceKm() <= r)
                    .toList();

            if (!filtered.isEmpty() && filtered.size() >= Math.min(MIN_CANDIDATES, meetings.size())) {
                log.info("✅ [radius<={}km] 적용: {} -> {}", r, meetings.size(), filtered.size());
                meetings = filtered;
            } else {
                log.info("⚠️ [radius<={}km] 결과 {}개 → 스킵 (원본 {} 유지)",
                        r, filtered.size(), meetings.size());
            }
        }

        if (nearMe) {
            meetings = meetings.stream()
                    .sorted(Comparator.comparing(Meeting::getDistanceKm, Comparator.nullsLast(Comparator.naturalOrder())))
                    .toList();
        }

        return meetings;
    }

    // =========================
    // DTO 변환
    // =========================

    private AIMeetingDTO convertToDTO(Meeting meeting) {
        return AIMeetingDTO.builder()
                .meetingId(meeting.getMeetingId())
                .title(meeting.getTitle())
                .description(meeting.getDescription())
                .category(meeting.getCategory())
                .subcategory(meeting.getSubcategory())
                .meetingTime(meeting.getMeetingTime())
                .locationName(meeting.getLocationName())
                .locationAddress(meeting.getLocationAddress())
                .latitude(meeting.getLatitudeAsDouble())
                .longitude(meeting.getLongitudeAsDouble())
                .locationType(meeting.getLocationType() != null ? meeting.getLocationType().name() : null)
                .vibe(meeting.getVibe())
                .timeSlot(meeting.getTimeSlot() != null ? meeting.getTimeSlot().name() : null)
                .maxParticipants(meeting.getMaxParticipants())
                .currentParticipants(meeting.getCurrentParticipants())
                .expectedCost(meeting.getExpectedCost())
                .status(meeting.getStatus() != null ? meeting.getStatus().name() : null)
                .imageUrl(meeting.getImageUrl())
                .avgRating(meeting.getAvgRating())
                .ratingCount(meeting.getRatingCount())
                .distanceKm(meeting.getDistanceKm())
                .avgSentimentScore(meeting.getAvgSentimentScore())
                .positiveReviewRatio(meeting.getPositiveReviewRatio())
                .negativeReviewRatio(meeting.getNegativeReviewRatio())
                .reviewSentimentVariance(meeting.getReviewSentimentVariance())
                .organizer(convertOrganizerInfo(meeting))
                .build();
    }

    private OrganizerInfo convertOrganizerInfo(Meeting meeting) {
        if (meeting.getOrganizer() == null) return null;

        return OrganizerInfo.builder()
                .userId(meeting.getOrganizer().getUserId())
                .nickname(meeting.getOrganizer().getUsername())
                .rating(meeting.getOrganizer().getRating())
                .meetingCount(meeting.getOrganizer().getMeetingCount())
                .build();
    }

    // =========================
    // Helpers
    // =========================

    private boolean isNearMePhrase(String q) {
        if (q == null) return false;
        String s = q.toLowerCase();
        return s.contains("근처") || s.contains("주변") || s.contains("집");
    }

    private boolean hasText(String s) {
        return s != null && !s.trim().isBlank();
    }

    private boolean containsIgnoreCase(String field, String qLower) {
        if (field == null) return false;
        return field.toLowerCase().contains(qLower);
    }

    private String buildHaystack(Meeting m) {
        return (
                safe(m.getTitle()) + " " +
                        safe(m.getDescription()) + " " +
                        safe(m.getLocationName()) + " " +
                        safe(m.getLocationAddress())
        ).toLowerCase();
    }

    private String safe(String s) {
        return s == null ? "" : s;
    }

    private double calculateDistance(double lat1, double lon1, double lat2, double lon2) {
        final int R = 6371;
        double latDistance = Math.toRadians(lat2 - lat1);
        double lonDistance = Math.toRadians(lon2 - lon1);

        double a = Math.sin(latDistance / 2) * Math.sin(latDistance / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(lonDistance / 2) * Math.sin(lonDistance / 2);

        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
}