package com.project.itda.domain.ai.dto.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 장소 추천 요청 (FastAPI - 중간지점 계산용)
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PlaceRecommendRequest {

    /**
     * 모임 ID
     */
    @JsonProperty("meeting_id")
    private Integer meetingId;

    /**
     * 참가자 위치 목록
     */
    @NotEmpty(message = "참가자 목록은 최소 2명 이상이어야 합니다")
    private List<ParticipantLocation> participants;

    /**
     * 모임 카테고리
     */
    @NotNull(message = "모임 카테고리는 필수입니다")
    @JsonProperty("meeting_category")
    private String meetingCategory;

    @JsonProperty("meeting_title")
    private String meetingTitle;

    @JsonProperty("meeting_description")
    private String meetingDescription; // optional

    @JsonProperty("max_distance")
    private Double maxDistance;

    @JsonProperty("top_n")
    private Integer topN;

    /**
     * 참가자 위치 정보
     */
    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ParticipantLocation {

        @JsonProperty("user_id")
        private Integer userId;

        private String address;

        @NotNull
        private Double latitude;

        @NotNull
        private Double longitude;
    }
}