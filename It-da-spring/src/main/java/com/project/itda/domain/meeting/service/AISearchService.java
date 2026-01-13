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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * FastAPI AI 서버 전용 Service
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AISearchService {

    private final MeetingRepository meetingRepository;

    /**
     * AI용 모임 검색
     */
    public AISearchResponse searchForAI(AISearchRequest request) {
        log.info("🤖 AI 검색: category={}, subcategory={}, timeSlot={}, location={}",
                request.getCategory(), request.getSubcategory(),
                request.getTimeSlot(), request.getLocationQuery());

        // 기본 필터: RECRUITING 상태만
        List<Meeting> meetings = meetingRepository.findByStatus(
                MeetingStatus.RECRUITING,
                org.springframework.data.domain.Pageable.unpaged()
        ).getContent();

        // 카테고리 필터
        if (request.getCategory() != null) {
            meetings = meetings.stream()
                    .filter(m -> m.getCategory().equals(request.getCategory()))
                    .collect(Collectors.toList());
        }

        // 서브카테고리 필터
        if (request.getSubcategory() != null) {
            meetings = meetings.stream()
                    .filter(m -> m.getSubcategory() != null &&
                            m.getSubcategory().equals(request.getSubcategory()))
                    .collect(Collectors.toList());
        }

        // 시간대 필터
        if (request.getTimeSlot() != null) {
            meetings = meetings.stream()
                    .filter(m -> m.getTimeSlot() != null &&
                            m.getTimeSlot().name().equalsIgnoreCase(request.getTimeSlot()))
                    .collect(Collectors.toList());
        }

        // 분위기 필터
        if (request.getVibe() != null) {
            meetings = meetings.stream()
                    .filter(m -> m.getVibe() != null &&
                            m.getVibe().equals(request.getVibe()))
                    .collect(Collectors.toList());
        }

        // 비용 필터
        if (request.getMaxCost() != null) {
            meetings = meetings.stream()
                    .filter(m -> m.getExpectedCost() <= request.getMaxCost())
                    .collect(Collectors.toList());
        }

        // 위치 필터 (locationQuery)
        if (request.getLocationQuery() != null) {
            String query = request.getLocationQuery().toLowerCase();
            meetings = meetings.stream()
                    .filter(m -> (m.getLocationName() != null && m.getLocationName().toLowerCase().contains(query)) ||
                            (m.getLocationAddress() != null && m.getLocationAddress().toLowerCase().contains(query)))
                    .collect(Collectors.toList());
        }

        // 거리 계산 (userLocation이 있으면)
        if (request.getUserLocation() != null &&
                request.getUserLocation().getLatitude() != null &&
                request.getUserLocation().getLongitude() != null) {

            Double userLat = request.getUserLocation().getLatitude();
            Double userLng = request.getUserLocation().getLongitude();

            meetings.forEach(m -> {
                if (m.getLatitudeAsDouble() != null && m.getLongitudeAsDouble() != null) {
                    double distance = calculateDistance(
                            userLat, userLng,
                            m.getLatitudeAsDouble(), m.getLongitudeAsDouble()
                    );
                    m.setDistanceKm(distance);
                }
            });

            // 거리순 정렬
            meetings = meetings.stream()
                    .sorted((m1, m2) -> {
                        if (m1.getDistanceKm() == null) return 1;
                        if (m2.getDistanceKm() == null) return -1;
                        return Double.compare(m1.getDistanceKm(), m2.getDistanceKm());
                    })
                    .collect(Collectors.toList());
        }

        // DTO 변환
        List<AIMeetingDTO> meetingDTOs = meetings.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());

        log.info("✅ AI 검색 완료: {}개 모임 발견", meetingDTOs.size());

        return AISearchResponse.builder()
                .meetings(meetingDTOs)
                .totalCount(meetingDTOs.size())
                .build();
    }

    /**
     * 모임 일괄 조회
     */
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

    /**
     * Meeting → AIMeetingDTO 변환
     */
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
                .organizer(convertOrganizerInfo(meeting))
                .build();
    }

    /**
     * 주최자 정보 변환
     */
    private OrganizerInfo convertOrganizerInfo(Meeting meeting) {
        if (meeting.getOrganizer() == null) {
            return null;
        }

        return OrganizerInfo.builder()
                .userId(meeting.getOrganizer().getUserId())
                .nickname(meeting.getOrganizer().getUsername())
                .rating(meeting.getOrganizer().getRating())
                .meetingCount(meeting.getOrganizer().getMeetingCount())
                .build();
    }

    /**
     * 거리 계산 (Haversine formula)
     */
    private double calculateDistance(double lat1, double lon1, double lat2, double lon2) {
        final int R = 6371; // 지구 반지름 (km)

        double latDistance = Math.toRadians(lat2 - lat1);
        double lonDistance = Math.toRadians(lon2 - lon1);

        double a = Math.sin(latDistance / 2) * Math.sin(latDistance / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(lonDistance / 2) * Math.sin(lonDistance / 2);

        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    }
}