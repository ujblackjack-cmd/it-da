package com.project.itda.domain.meeting.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

/**
 * AI 검색 응답용 모임 DTO
 * FastAPI와 호환을 위해 snake_case 사용
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AIMeetingDTO {

    @JsonProperty("meeting_id")
    private Long meetingId;

    private String title;

    private String description;

    private String category;

    private String subcategory;

    @JsonProperty("meeting_time")
    private LocalDateTime meetingTime;

    @JsonProperty("location_name")
    private String locationName;

    @JsonProperty("location_address")
    private String locationAddress;

    private Double latitude;

    private Double longitude;

    @JsonProperty("location_type")
    private String locationType;

    private String vibe;

    @JsonProperty("time_slot")
    private String timeSlot;

    @JsonProperty("max_participants")
    private Integer maxParticipants;

    @JsonProperty("current_participants")
    private Integer currentParticipants;

    @JsonProperty("expected_cost")
    private Integer expectedCost;

    private String status;

    @JsonProperty("image_url")
    private String imageUrl;

    @JsonProperty("avg_rating")
    private Double avgRating;

    @JsonProperty("rating_count")
    private Integer ratingCount;

    @JsonProperty("distance_km")
    private Double distanceKm;

    // ✅ NEW: Sentiment 데이터 추가
    @JsonProperty("avg_sentiment_score")
    private Double avgSentimentScore;

    @JsonProperty("positive_review_ratio")
    private Double positiveReviewRatio;

    @JsonProperty("negative_review_ratio")
    private Double negativeReviewRatio;

    @JsonProperty("review_sentiment_variance")
    private Double reviewSentimentVariance;

    private OrganizerInfo organizer;

    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OrganizerInfo {
        @JsonProperty("user_id")
        private Long userId;

        private String nickname;

        private Double rating;

        @JsonProperty("meeting_count")
        private Integer meetingCount;
    }
}