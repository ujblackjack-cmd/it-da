package com.project.itda.domain.ai.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
public class PlaceRecommendResponse {

    private Boolean success;

    // centroid: { latitude, longitude }
    private Centroid centroid;

    @JsonProperty("search_radius")
    private Double searchRadius; // FastAPI: meters (float)

    private List<PlaceRecommendation> recommendations;

    @JsonProperty("filtered_count")
    private Map<String, Integer> filteredCount;

    @JsonProperty("processing_time_ms")
    private Integer processingTimeMs;

    @Getter
    @Setter
    @NoArgsConstructor
    public static class Centroid {
        private Double latitude;
        private Double longitude;

        // FastAPI가 address를 안주면 null로 옴 (니 python schema엔 없음)
        private String address;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    public static class PlaceRecommendation {

        @JsonProperty("place_id")
        private String placeId;

        private String name;
        private String category;
        private String address;

        private Double latitude;
        private Double longitude;

        @JsonProperty("distance_from_centroid")
        private Double distanceFromCentroid; // ✅ FastAPI: km 로 내려옴 (니 schema 기준)

        private Double rating;

        @JsonProperty("review_count")
        private Integer reviewCount;

        private String phone;

        // FastAPI는 url 필드
        private String url;
    }
}
