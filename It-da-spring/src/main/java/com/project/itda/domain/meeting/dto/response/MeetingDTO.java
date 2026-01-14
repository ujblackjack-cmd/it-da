package com.project.itda.domain.meeting.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MeetingDTO {
    private Long meetingId;
    private String title;
    private String description;
    private String category;
    private String subcategory;
    private String meetingTime;  // ISO 8601 format
    private String locationName;
    private String locationAddress;
    private Double latitude;
    private Double longitude;
    private String locationType;  // "INDOOR", "OUTDOOR"
    private String vibe;
    private String timeSlot;  // "morning", "afternoon", "evening"
    private Integer maxParticipants;
    private Integer currentParticipants;
    private Integer expectedCost;
    private String status;  // "RECRUITING", "FULL", "CANCELLED", "COMPLETED"
    private String imageUrl;
    private Double avgRating;  // 평균 평점
    private Integer ratingCount;  // 평점 개수
    private Double distanceKm;  // 사용자로부터의 거리 (검색 시 계산)

    // 주최자 정보
    private OrganizerInfo organizer;

    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OrganizerInfo {
        private Long userId;
        private String nickname;
        private Double rating;
        private Integer meetingCount;
    }
}