package com.project.itda.domain.meeting.dto.response;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.project.itda.domain.participation.dto.response.ParticipantDto;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 모임 상세 응답 DTO (AI 추천 정보 포함 가능)
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MeetingDetailResponse {

    // ========================================
    // 기본 정보
    // ========================================

    /**
     * 모임 ID
     */
    private Long meetingId;

    private Long chatRoomId;

    /**
     * 주최자 ID
     */
    private Long organizerId;

    /**
     * 주최자 닉네임
     */
    private String organizerUsername;

    /**
     * 주최자 이메일
     */
    private String organizerEmail;

    /**
     * 주최자 프로필 이미지
     */
    private String organizerProfileImage;

    /**
     * 모임 제목
     */
    private String title;

    /**
     * 모임 설명
     */
    private String description;

    /**
     * 대분류
     */
    private String category;

    /**
     * 소분류
     */
    private String subcategory;

    /**
     * 모임 일시
     */
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime meetingTime;

    /**
     * 시간대
     */
    private String timeSlot;

    /**
     * 장소명
     */
    private String locationName;

    /**
     * 상세 주소
     */
    private String locationAddress;

    /**
     * 위도
     */
    private Double latitude;

    /**
     * 경도
     */
    private Double longitude;

    /**
     * 장소 유형
     */
    private String locationType;

    /**
     * 분위기
     */
    private String vibe;

    /**
     * 현재 참가자 수
     */
    private Integer currentParticipants;

    /**
     * 최대 참가자 수
     */
    private Integer maxParticipants;

    /**
     * 예상 비용
     */
    private Integer expectedCost;

    /**
     * 대표 이미지 URL
     */
    private String imageUrl;

    /**
     * 모임 상태
     */
    private String status;

    /**
     * 평균 평점
     */
    private Double avgRating;

    /**
     * 후기 개수
     */
    private Long reviewCount;

    /**
     * 생성일
     */
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createdAt;

    /**
     * 모임 마감 여부
     */
    private Boolean isFull;

    /**
     * D-Day
     */
    private Long dDay;

    // ========================================
    // AI 추천 정보 (선택적)
    // ========================================

    /**
     * AI 예상 만족도 (선택적)
     */
    private AiSatisfaction aiSatisfaction;

    /**
     * 참여자 목록 (선택적)
     */
    private List<ParticipantDto> participants; // 추가

    /**
     * 추천 장소 (선택적)
     */
    private RecommendedPlace recommendedPlace;

    /**
     * 태그 (JSON 배열)
     */
    private String tags;

    // ========================================
    // 내부 클래스
    // ========================================

    /**
     * AI 만족도 예측
     */
    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AiSatisfaction {
        /**
         * 예상 평점 (1~5)
         */
        private Double predictedRating;

        /**
         * 별점 표시 (⭐⭐⭐⭐⭐)
         */
        private String ratingStars;

        /**
         * 만족도 레벨 (VERY_HIGH/HIGH/MEDIUM/LOW)
         */
        private String satisfactionLevel;

        /**
         * 추천 여부
         */
        private Boolean recommended;

        /**
         * 추천/비추천 이유
         */
        private List<ReasonItem> reasons;

        /**
         * 사용자와의 거리 (km)
         */
        private Double distanceKm;

        @Getter
        @Builder
        @NoArgsConstructor
        @AllArgsConstructor
        public static class ReasonItem {
            private String icon;
            private String text;
        }
    }

    /**
     * 참여자 정보
     */
    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ParticipantInfo {
        private Long userId;
        private String username;
        private String profileImage;
        private String status;  // APPROVED/PENDING/REJECTED

        @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
        private LocalDateTime joinedAt;
    }

    /**
     * 추천 장소 (중간지점)
     */
    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RecommendedPlace {
        /**
         * 중간지점 정보
         */
        private Centroid centroid;

        /**
         * 추천 장소 목록
         */
        private List<PlaceInfo> places;

        @Getter
        @Builder
        @NoArgsConstructor
        @AllArgsConstructor
        public static class Centroid {
            private Double latitude;
            private Double longitude;
            private String address;
        }

        @Getter
        @Builder
        @NoArgsConstructor
        @AllArgsConstructor
        public static class PlaceInfo {
            private Integer rank;
            private String placeName;
            private String category;
            private String address;
            private Double distanceKm;
            private List<String> matchReasons;
        }
    }
}