package com.project.itda.domain.meeting.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import java.util.List;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MeetingSearchResponse {
    private boolean success;
    private String message;
    private List<MeetingResponse> meetings;
    private String keyword;
    private SearchFilter filters;  // ← 이거 사용
    private int totalCount;
    private int currentPage;
    private int totalPages;
    private int pageSize;

    // ========================================
    // ✅ 이 내부 클래스 추가!
    // ========================================
    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SearchFilter {
        private String category;
        private String subcategory;
        private String locationType;
        private String vibe;
        private String timeSlot;
        private String status;
        private Double radius;
    }
}