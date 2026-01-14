package com.project.itda.domain.meeting.dto.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * FastAPI AI 서버 전용 Request DTO
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AISearchRequest {
    private String category;  // "스포츠", "맛집", "카페" 등
    private String subcategory;  // "러닝", "한식" 등
    private String timeSlot;  // "morning", "afternoon", "evening"
    private String locationQuery;  // "강남", "홍대" 등
    private UserLocation userLocation;  // 사용자 위치
    private Integer maxCost;  // 최대 비용
    private String vibe;  // "활기찬", "여유로운" 등
    private List<String> keywords;  // 키워드 리스트

    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserLocation {
        private Double latitude;
        private Double longitude;
    }

    /**
     * 일괄 조회용 Request
     */
    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BatchRequest {
        @JsonProperty("meetingIds")
        private List<Long> meetingIds;

        @JsonProperty("meeting_ids")
        private void setMeetingIdsSnake(List<Long> ids) {
            this.meetingIds = ids;
        }
    }
}
