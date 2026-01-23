package com.project.itda.domain.ai.service;

import com.project.itda.domain.ai.dto.request.PlaceRecommendRequest;
import com.project.itda.domain.ai.dto.response.KakaoSearchResponse;
import com.project.itda.domain.ai.dto.response.PlaceRecommendResponse;
import com.project.itda.domain.ai.dto.response.PlaceRecommendationDTO;
import com.project.itda.domain.meeting.entity.Meeting;
import com.project.itda.domain.meeting.repository.MeetingRepository;
import com.project.itda.domain.participation.entity.Participation;
import com.project.itda.domain.participation.enums.ParticipationStatus;
import com.project.itda.domain.participation.repository.ParticipationRepository;
import com.project.itda.domain.user.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * AI 기반 장소 추천 서비스
 * - FastAPI로 중간지점 계산
 * - 카카오맵으로 실제 장소 검색
 */
@Service
@Slf4j
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PlaceRecommendService {

    private final AIServiceClient aiServiceClient;
    private final KakaoMapService kakaoMapService;
    private final MeetingRepository meetingRepository;
    private final ParticipationRepository participationRepository;

    /**
     * 모임 장소 추천
     *
     * @param meetingId 모임 ID
     * @return 추천 장소 목록
     */
    public PlaceRecommendationDTO recommendPlace(Long meetingId) {
        long startTime = System.currentTimeMillis();

        log.info("🎯 장소 추천 시작 - meetingId: {}", meetingId);

        try {
            // 1. 모임 정보 조회
            Meeting meeting = meetingRepository.findById(meetingId)
                    .orElseThrow(() -> new IllegalArgumentException("모임을 찾을 수 없습니다: " + meetingId));

            // 2. 승인된 참가자 조회
            List<Participation> participations = participationRepository
                    .findByMeetingIdAndStatus(meetingId, ParticipationStatus.APPROVED);

            if (participations.size() < 2) {
                log.warn("⚠️ 참가자가 2명 미만 - meetingId: {}", meetingId);
                return buildEmptyResponse(meetingId, "참가자가 2명 이상이어야 합니다");
            }

            // 3. 참가자 위치 정보 추출
            List<PlaceRecommendRequest.ParticipantLocation> participants = participations.stream()
                    .map(p -> {
                        User user = p.getUser();
                        return PlaceRecommendRequest.ParticipantLocation.builder()
                                .userId(user.getUserId().intValue())
                                .address(user.getAddress())
                                .latitude(user.getLatitude())
                                .longitude(user.getLongitude())
                                .build();
                    })
                    .filter(p -> p.getLatitude() != null && p.getLongitude() != null)
                    .collect(Collectors.toList());

            if (participants.size() < 2) {
                log.warn("⚠️ 위치 정보가 있는 참가자가 2명 미만");
                return buildEmptyResponse(meetingId, "위치 정보가 있는 참가자가 2명 이상이어야 합니다");
            }

            // 4. FastAPI로 중간지점 계산
            PlaceRecommendRequest aiRequest = PlaceRecommendRequest.builder()
                    .meetingId(meetingId.intValue())
                    .participants(participants)
                    .meetingCategory(meeting.getCategory())
                    .build();

            PlaceRecommendResponse aiResponse = aiServiceClient.calculateCentroid(aiRequest);

            if (!aiResponse.getSuccess() || aiResponse.getCentroid() == null) {
                log.warn("⚠️ 중간지점 계산 실패");
                return buildEmptyResponse(meetingId, "중간지점 계산 실패");
            }

            PlaceRecommendResponse.Centroid centroid = aiResponse.getCentroid();
            Integer searchRadius = Optional.ofNullable(aiResponse.getSearchRadius())
                    .map(Double::intValue)
                    .orElse(3000);

            log.info("📍 중간지점: lat={}, lng={}, radius={}m",
                    centroid.getLatitude(), centroid.getLongitude(), searchRadius);

            // 5. 카카오맵으로 장소 검색
            List<KakaoSearchResponse.KakaoPlace> kakaoPlaces = kakaoMapService.searchPlaces(
                    meeting.getCategory(),
                    centroid.getLatitude(),
                    centroid.getLongitude(),
                    searchRadius
            );

            if (kakaoPlaces.isEmpty()) {
                log.warn("⚠️ 카카오맵 검색 결과 없음");
                return buildEmptyResponse(meetingId, "주변에 추천 가능한 장소가 없습니다");
            }

            // 6. DTO 변환
            List<PlaceRecommendationDTO.PlaceInfo> recommendations = new ArrayList<>();

            for (int i = 0; i < Math.min(kakaoPlaces.size(), 10); i++) {
                KakaoSearchResponse.KakaoPlace place = kakaoPlaces.get(i);

                Double distanceMeters = place.getDistanceMeters();
                Double distanceKm = distanceMeters != null ? distanceMeters / 1000.0 : null;

                // 추천 이유 생성
                List<String> matchReasons = generateMatchReasons(
                        distanceMeters,
                        meeting.getCategory(),
                        place.getCategoryName()
                );

                PlaceRecommendationDTO.PlaceInfo placeInfo = PlaceRecommendationDTO.PlaceInfo.builder()
                        .rank(i + 1)
                        .placeName(place.getPlaceName())
                        .category(place.getCategoryName())
                        .address(place.getAddressName())
                        .roadAddress(place.getRoadAddressName())
                        .latitude(place.getLatitude())
                        .longitude(place.getLongitude())
                        .distanceFromCentroid(distanceMeters)
                        .distanceKm(distanceKm)
                        .phone(place.getPhone())
                        .kakaoUrl(place.getPlaceUrl())
                        .matchReasons(matchReasons)
                        .build();

                recommendations.add(placeInfo);
            }

            long processingTime = System.currentTimeMillis() - startTime;

            log.info("✅ 장소 추천 완료 - meetingId: {}, 추천 개수: {}, 처리 시간: {}ms",
                    meetingId, recommendations.size(), processingTime);

            // 7. 최종 응답
            return PlaceRecommendationDTO.builder()
                    .success(true)
                    .message("장소 추천 성공")
                    .meetingId(meetingId)
                    .centroid(PlaceRecommendationDTO.CentroidInfo.builder()
                            .latitude(centroid.getLatitude())
                            .longitude(centroid.getLongitude())
                            .address(centroid.getAddress())
                            .build())
                    .searchRadius(searchRadius)
                    .recommendations(recommendations)
                    .totalCount(recommendations.size())
                    .processingTimeMs(processingTime)
                    .build();

        } catch (Exception e) {
            log.error("❌ 장소 추천 실패: {}", e.getMessage(), e);
            return buildEmptyResponse(meetingId, "장소 추천 처리 중 오류 발생");
        }
    }

    /**
     * 빈 응답 생성
     */
    private PlaceRecommendationDTO buildEmptyResponse(Long meetingId, String message) {
        return PlaceRecommendationDTO.builder()
                .success(false)
                .message(message)
                .meetingId(meetingId)
                .recommendations(Collections.emptyList())
                .totalCount(0)
                .processingTimeMs(0L)
                .build();
    }

    /**
     * 추천 이유 생성
     */
    private List<String> generateMatchReasons(
            Double distanceMeters,
            String meetingCategory,
            String placeCategory
    ) {
        List<String> reasons = new ArrayList<>();

        // 거리 이유
        if (distanceMeters != null) {
            if (distanceMeters < 500) {
                reasons.add("중간지점에서 매우 가까워요 (" + String.format("%.0f", distanceMeters) + "m)");
            } else if (distanceMeters < 1000) {
                reasons.add("중간지점에서 가까워요 (" + String.format("%.1f", distanceMeters / 1000.0) + "km)");
            } else {
                reasons.add("중간지점에서 " + String.format("%.1f", distanceMeters / 1000.0) + "km");
            }
        }

        // 카테고리 매칭 이유
        if (placeCategory != null && placeCategory.contains(meetingCategory)) {
            reasons.add(meetingCategory + " 카테고리 매칭");
        }

        return reasons;
    }
}