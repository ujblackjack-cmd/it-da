package com.project.itda.domain.ai.service;

import com.project.itda.domain.ai.dto.request.MeetingRecommendRequest;
import com.project.itda.domain.ai.dto.response.AiRecommendListResponse;
import com.project.itda.domain.ai.dto.response.MeetingRecommendResponse;
import com.project.itda.domain.ai.dto.response.RecommendedMeetingDTO;
import com.project.itda.domain.meeting.entity.Meeting;
import com.project.itda.domain.meeting.repository.MeetingRepository;
import com.project.itda.domain.user.entity.User;
import com.project.itda.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

/**
 * AI 기반 모임 추천 서비스
 */
@Service
@Slf4j
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AiRecommendationService {

    private final AIServiceClient aiServiceClient;
//    private final MeetingRepository meetingRepository;
    private final UserRepository userRepository;

    /**
     * SVD 협업 필터링 기반 모임 추천
     *
     * @param userId 사용자 ID
     * @param topN 추천 개수
     * @return 추천 모임 목록
     */
    public AiRecommendListResponse recommendMeetings(Long userId, Integer topN) {
        long startTime = System.currentTimeMillis();

        log.info("🎯 AI 모임 추천 시작 - userId: {}, topN: {}", userId, topN);

        try {
            // 1. 사용자 조회
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다: " + userId));

            // 2. FastAPI로 AI 추천 요청
            MeetingRecommendRequest request = MeetingRecommendRequest.builder()
                    .userId(userId.intValue())
                    .topN(topN)
                    .build();

            MeetingRecommendResponse aiResponse = aiServiceClient.recommendMeetings(request);

            if (!aiResponse.getSuccess() || aiResponse.getRecommendations().isEmpty()) {
                log.warn("⚠️ AI 추천 결과 없음 - userId: {}", userId);
                return buildEmptyResponse(userId);
            }

            // 3. 추천된 모임 ID 리스트 추출
            List<Long> meetingIds = aiResponse.getRecommendations().stream()
                    .map(r -> r.getMeetingId().longValue())
                    .collect(Collectors.toList());

            log.info("📋 AI 추천 모임 IDs: {}", meetingIds);

            // 4. DB에서 실제 모임 정보 조회
//            List<Meeting> meetings = meetingRepository.findAllById(meetingIds);

//            if (meetings.isEmpty()) {
//                log.warn("⚠️ DB에서 모임을 찾을 수 없음 - meetingIds: {}", meetingIds);
//                return buildEmptyResponse(userId);
//            }

            // 5. AI 점수와 DB 모임 정보 매칭
            Map<Long, MeetingRecommendResponse.RecommendedMeeting> scoreMap =
                    aiResponse.getRecommendations().stream()
                            .collect(Collectors.toMap(
                                    r -> r.getMeetingId().longValue(),
                                    r -> r
                            ));

            // 6. DTO 변환 (AI 점수 순서 유지)
            List<RecommendedMeetingDTO> recommendations = meetingIds.stream()
                    .map(meetingId -> {
//                        Meeting meeting = meetings.stream()
////                                .filter(m -> m.getMeetingId().equals(meetingId))
////                                .findFirst()
//                                .orElse(null);

//                        if (meeting == null) return null;

                        MeetingRecommendResponse.RecommendedMeeting aiMeeting = scoreMap.get(meetingId);

                        // 거리 계산 (사용자 위치 - 모임 위치)
//                        Double distanceKm = calculateDistance(
//                                user.getLatitude(),
//                                user.getLongitude()
//                                meeting.getLatitude(),
//                                meeting.getLongitude()
//                        );

                        // 추천 이유 생성
//                        String reason = generateRecommendReason(aiMeeting.getScore(), distanceKm);

                        return RecommendedMeetingDTO.builder()
                                // 모임 기본 정보
//                                .meetingId(meeting.getMeetingId())
//                                .title(meeting.getTitle())
//                                .description(meeting.getDescription())
//                                .category(meeting.getCategory())
//                                .subcategory(meeting.getSubcategory())
//                                .meetingTime(meeting.getMeetingTime())
//                                .locationName(meeting.getLocationName())
//                                .locationAddress(meeting.getLocationAddress())
//                                .latitude(meeting.getLatitude())
//                                .longitude(meeting.getLongitude())
//                                .vibe(meeting.getVibe())
//                                .currentParticipants(meeting.getCurrentParticipants())
//                                .maxParticipants(meeting.getMaxParticipants())
//                                .expectedCost(meeting.getExpectedCost())
//                                .imageUrl(meeting.getImageUrl())
//                                .status(meeting.getStatus().name())
                                // AI 추천 정보
                                .aiScore(aiMeeting.getScore())
                                .rank(aiMeeting.getRank())
//                                .distanceKm(distanceKm)
//                                .recommendReason(reason)
                                // 주최자 정보
//                                .organizerId(meeting.getOrganizer().getUserId())
//                                .organizerUsername(meeting.getOrganizer().getUsername())
//                                .organizerProfileImage(meeting.getOrganizer().getProfileImage())
                                .build();
                    })
                    .filter(Objects::nonNull)
                    .collect(Collectors.toList());

            long processingTime = System.currentTimeMillis() - startTime;

            log.info("✅ AI 추천 완료 - userId: {}, 추천 개수: {}, 처리 시간: {}ms",
                    userId, recommendations.size(), processingTime);

            // 7. 최종 응답
            return AiRecommendListResponse.builder()
                    .success(true)
                    .message("AI 추천 성공")
                    .userId(userId)
                    .recommendations(recommendations)
                    .totalCount(recommendations.size())
                    .modelInfo(Map.of(
                            "rmse", aiResponse.getModelInfo().getRmse(),
                            "mae", aiResponse.getModelInfo().getMae(),
                            "accuracy", aiResponse.getModelInfo().getAccuracy()
                    ))
                    .processingTimeMs(processingTime)
                    .build();

        } catch (Exception e) {
            log.error("❌ AI 추천 실패: {}", e.getMessage(), e);
            throw new RuntimeException("AI 추천 처리 중 오류 발생: " + e.getMessage(), e);
        }
    }

    /**
     * 빈 응답 생성
     */
    private AiRecommendListResponse buildEmptyResponse(Long userId) {
        return AiRecommendListResponse.builder()
                .success(false)
                .message("추천 가능한 모임이 없습니다")
                .userId(userId)
                .recommendations(Collections.emptyList())
                .totalCount(0)
                .processingTimeMs(0L)
                .build();
    }

    /**
     * 거리 계산 (Haversine 공식)
     */
    private Double calculateDistance(Double lat1, Double lon1, Double lat2, Double lon2) {
        if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) {
            return null;
        }

        final int R = 6371; // 지구 반경 (km)

        double latDistance = Math.toRadians(lat2 - lat1);
        double lonDistance = Math.toRadians(lon2 - lon1);

        double a = Math.sin(latDistance / 2) * Math.sin(latDistance / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(lonDistance / 2) * Math.sin(lonDistance / 2);

        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c; // km
    }

    /**
     * 추천 이유 생성
     */
    private String generateRecommendReason(Double score, Double distanceKm) {
        StringBuilder reason = new StringBuilder();

        if (score >= 4.5) {
            reason.append("매우 높은 만족도 예상");
        } else if (score >= 4.0) {
            reason.append("높은 만족도 예상");
        } else if (score >= 3.5) {
            reason.append("적절한 만족도 예상");
        } else {
            reason.append("AI 추천");
        }

        if (distanceKm != null && distanceKm <= 5.0) {
            reason.append(", 가까운 거리 (").append(String.format("%.1f", distanceKm)).append("km)");
        }

        return reason.toString();
    }
}