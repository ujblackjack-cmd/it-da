package com.project.itda.domain.ai.service;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.project.itda.domain.ai.dto.request.PlaceRecommendRequest;
import com.project.itda.domain.ai.dto.response.PlaceRecommendResponse;
import com.project.itda.domain.ai.dto.response.PlaceRecommendationDTO;
import com.project.itda.domain.meeting.entity.Meeting;
import com.project.itda.domain.meeting.repository.MeetingRepository;
import com.project.itda.domain.participation.entity.Participation;
import com.project.itda.domain.participation.enums.ParticipationStatus;
import com.project.itda.domain.participation.repository.ParticipationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.*;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class MeetingRecommendationService {

    @Value("${ai.service.url}")
    private String aiServiceUrl;

    @Value("${kakao.rest.api.key}")
    private String kakaoApiKey;

    private final RestTemplate restTemplate;
    private final ParticipationRepository participationRepository;
    private final MeetingRepository meetingRepository;
    private final ObjectMapper objectMapper;

    /**
     * ✅ 채팅방 ID로 장소 추천
     */
    public PlaceRecommendationDTO recommendPlacesByChatRoomId(Long chatRoomId) {
        try {
            log.info("🔍 채팅방 ID {}로 장소 추천 시작", chatRoomId);

            // Meeting 테이블에서 chat_room_id로 검색
            Meeting meeting = meetingRepository.findByChatRoomId(chatRoomId)
                    .orElseThrow(() -> new IllegalArgumentException(
                            "채팅방 " + chatRoomId + "에 연결된 모임을 찾을 수 없습니다"));

            log.info("✅ 채팅방 ID {} → 모임 '{}' (ID: {})",
                    chatRoomId, meeting.getTitle(), meeting.getMeetingId());

            return recommendPlacesForMeeting(meeting.getMeetingId());

        } catch (Exception e) {
            log.error("❌ 장소 추천 실패: {}", e.getMessage(), e);
            throw new RuntimeException("장소 추천에 실패했습니다: " + e.getMessage(), e);
        }
    }

    /**
     * 모임 기반 장소 추천 (전체 프로세스)
     */
    public PlaceRecommendationDTO recommendPlacesForMeeting(Long meetingId) {
        long startTime = System.currentTimeMillis();

        try {
            // 1. 모임 정보 조회
            Meeting meeting = meetingRepository.findById(meetingId)
                    .orElseThrow(() -> new IllegalArgumentException("모임을 찾을 수 없습니다: " + meetingId));

            log.info("📍 모임 정보: ID={}, 제목={}, 카테고리={}",
                    meeting.getMeetingId(), meeting.getTitle(), meeting.getCategory());

            // 2. 참가자 위치 정보 수집
            List<Participation> participants = participationRepository
                    .findByMeetingAndStatus(meeting, ParticipationStatus.APPROVED);

            if (participants.isEmpty()) {
                throw new IllegalStateException("승인된 참가자가 없습니다.");
            }

            List<PlaceRecommendRequest.ParticipantLocation> locations = participants.stream()
                    .filter(p -> p.getUser().getLatitude() != null && p.getUser().getLongitude() != null)
                    .map(p -> PlaceRecommendRequest.ParticipantLocation.builder()
                            .userId(p.getUser().getUserId().intValue())
                            .latitude(p.getUser().getLatitude())
                            .longitude(p.getUser().getLongitude())
                            .address(p.getUser().getAddress())
                            .build())
                    .collect(Collectors.toList());

            if (locations.isEmpty()) {
                throw new IllegalStateException("위치 정보가 있는 참가자가 없습니다.");
            }

            log.info("📍 참가자 {}명의 위치 정보 수집 완료", locations.size());

            // 3. FastAPI로 중간지점 계산 요청
            PlaceRecommendRequest aiRequest = PlaceRecommendRequest.builder()
                    .meetingId(meetingId.intValue())
                    .meetingCategory(meeting.getCategory())
                    .meetingSubcategory(meeting.getSubcategory()) // ⭐ 이 줄 추가
                    .meetingTitle(meeting.getTitle())
                    .meetingDescription(meeting.getDescription())
                    .participants(locations)
                    .maxDistance(3.0)
                    .topN(3)
                    .build();

            String aiUrl = aiServiceUrl + "/api/ai/recommend-place";
            ResponseEntity<PlaceRecommendResponse> aiResponse = restTemplate.postForEntity(
                    aiUrl,
                    aiRequest,
                    PlaceRecommendResponse.class
            );

            PlaceRecommendResponse centroidData = aiResponse.getBody();
            if (centroidData == null || !centroidData.getSuccess()) {
                throw new RuntimeException("중간지점 계산 실패");
            }

            PlaceRecommendResponse.Centroid centroid = centroidData.getCentroid();
            log.info("🎯 중간지점: ({}, {})", centroid.getLatitude(), centroid.getLongitude());

            // ✅ FastAPI 추천 결과 그대로 사용
            List<PlaceRecommendResponse.PlaceRecommendation> aiRecs =
                    Optional.ofNullable(centroidData.getRecommendations())
                            .orElse(Collections.emptyList());

//            if (aiRecs.isEmpty()) {
//                throw new RuntimeException("추천 장소가 없습니다.");
//            }

            List<PlaceRecommendationDTO.PlaceInfo> recommendations = new ArrayList<>();

            for (int i = 0; i < Math.min(3, aiRecs.size()); i++) {
                PlaceRecommendResponse.PlaceRecommendation p = aiRecs.get(i);

                double km = Optional.ofNullable(p.getDistanceFromCentroid()).orElse(0.0);
                double meters = km * 1000.0;

                recommendations.add(
                        PlaceRecommendationDTO.PlaceInfo.builder()
                                .rank(i + 1)
                                .placeName(p.getName())
                                .category(p.getCategory())
                                .address(p.getAddress())
                                .roadAddress(p.getAddress()) // 없으면 address로 대체
                                .latitude(p.getLatitude())
                                .longitude(p.getLongitude())
                                .distanceFromCentroid(meters)
                                .distanceKm(km)
                                .phone(p.getPhone())
                                .kakaoUrl(p.getUrl())
                                .matchReasons(generateMatchReasonsFromDistance(km, meeting.getCategory(), p.getCategory(), p.getPhone()))
                                .build()
                );
            }


            log.info("✅ 최종 추천 장소(Spring): {}개", recommendations.size());


            long processingTime = System.currentTimeMillis() - startTime;

            return PlaceRecommendationDTO.builder()
                    .success(true)
                    .message(aiRecs.isEmpty() ? "반경 내에 추천할 만한 장소가 없습니다." : "장소 추천이 완료되었습니다.")
                    .meetingId(meetingId)
                    .centroid(PlaceRecommendationDTO.CentroidInfo.builder()
                            .latitude(centroid.getLatitude())
                            .longitude(centroid.getLongitude())
                            .address(centroid.getAddress())
                            .build())
                    .searchRadius(3000)
                    .recommendations(recommendations)
                    .totalCount(recommendations.size())
                    .processingTimeMs(processingTime)
                    .build();

        } catch (Exception e) {
            log.error("❌ 장소 추천 실패: {}", e.getMessage(), e);
            throw new RuntimeException("장소 추천에 실패했습니다: " + e.getMessage(), e);
        }
    }

    private List<String> generateMatchReasonsFromDistance(
            double distanceKm,
            String meetingCategory,
            String placeCategory,
            String phone
    ) {
        List<String> reasons = new ArrayList<>();

        if (distanceKm < 0.5) reasons.add("중간 지점에서 매우 가까워요 (500m 이내)");
        else if (distanceKm < 1.0) reasons.add("중간 지점에서 도보 이동 가능해요");
        else if (distanceKm < 3.0) reasons.add("중간 지점에서 이동하기 괜찮은 거리예요");

        // ✅ 스포츠/운동 계열은 카테고리 포함 매칭이 잘 안 되니까 키워드 기반 보강
        if (placeCategory != null) {
            if (placeCategory.contains("공원") || placeCategory.contains("운동") || placeCategory.contains("체육")
                    || placeCategory.contains("한강") || placeCategory.contains("트랙")) {
                reasons.add("러닝/야외 활동에 적합해요");
            }
        }

        if (phone != null && !phone.isBlank()) reasons.add("전화 문의 가능해요");
        if (reasons.isEmpty()) reasons.add("접근성이 좋은 장소예요");
        return reasons;
    }

    private List<String> generateMatchReasonsFromDistance(double distanceKm, String placeCategory, String phone) {
        List<String> reasons = new ArrayList<>();
        if (distanceKm < 0.5) reasons.add("중간 지점에서 매우 가까워요 (500m 이내)");
        else if (distanceKm < 1.0) reasons.add("중간 지점에서 도보 이동 가능해요");
        else if (distanceKm < 3.0) reasons.add("중간 지점에서 이동하기 괜찮은 거리예요");

        if (placeCategory != null && (placeCategory.contains("공원") || placeCategory.contains("운동") || placeCategory.contains("체육"))) {
            reasons.add("러닝/야외 활동에 적합해요");
        }
        if (phone != null && !phone.isBlank()) reasons.add("전화 문의 가능해요");
        if (reasons.isEmpty()) reasons.add("접근성이 좋은 장소예요");
        return reasons;
    }

    /**
     * 카카오맵 응답 파싱
     */
    private List<KakaoPlace> parseKakaoResponse(String responseBody) {
        List<KakaoPlace> places = new ArrayList<>();

        try {
            JsonNode root = objectMapper.readTree(responseBody);
            JsonNode documents = root.get("documents");

            if (documents != null && documents.isArray()) {
                for (JsonNode doc : documents) {
                    KakaoPlace place = KakaoPlace.builder()
                            .placeId(doc.get("id").asText())
                            .placeName(doc.get("place_name").asText())
                            .categoryName(doc.get("category_name").asText())
                            .addressName(doc.get("address_name").asText())
                            .roadAddressName(doc.has("road_address_name") && !doc.get("road_address_name").isNull()
                                    ? doc.get("road_address_name").asText() : "")
                            .latitude(doc.get("y").asDouble())
                            .longitude(doc.get("x").asDouble())
                            .distance(doc.has("distance") ? doc.get("distance").asInt() : 0)
                            .phone(doc.has("phone") && !doc.get("phone").isNull() ? doc.get("phone").asText() : "")
                            .placeUrl(doc.has("place_url") && !doc.get("place_url").isNull()
                                    ? doc.get("place_url").asText() : "")
                            .build();

                    places.add(place);
                }
            }

        } catch (Exception e) {
            log.error("카카오맵 응답 파싱 실패: {}", e.getMessage());
        }

        return places;
    }

    /**
     * 추천 이유 생성
     */
    private List<String> generateMatchReasons(KakaoPlace place, String category) {
        List<String> reasons = new ArrayList<>();

        double distanceKm = place.getDistance() / 1000.0;
        if (distanceKm < 0.5) {
            reasons.add("중간 지점에서 매우 가까워요 (500m 이내)");
        } else if (distanceKm < 1.0) {
            reasons.add("중간 지점에서 도보 이동 가능해요");
        }

        if (place.getCategoryName().contains(category)) {
            reasons.add("모임 카테고리와 잘 맞아요");
        }

        if (!place.getPhone().isEmpty()) {
            reasons.add("전화 예약 가능해요");
        }

        if (reasons.isEmpty()) {
            reasons.add("접근성이 좋은 장소예요");
        }

        return reasons;
    }

    /**
     * 카카오 장소 내부 DTO
     */
    @lombok.Getter
    @lombok.Builder
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    private static class KakaoPlace {
        private String placeId;
        private String placeName;
        private String categoryName;
        private String addressName;
        private String roadAddressName;
        private Double latitude;
        private Double longitude;
        private Integer distance;
        private String phone;
        private String placeUrl;
    }
}