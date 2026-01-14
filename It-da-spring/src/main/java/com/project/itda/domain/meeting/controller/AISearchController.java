package com.project.itda.domain.meeting.controller;

import com.project.itda.domain.meeting.dto.request.AISearchRequest;
import com.project.itda.domain.meeting.dto.response.AISearchResponse;
import com.project.itda.domain.meeting.service.AISearchService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * FastAPI AI 서버 전용 컨트롤러
 * 기존 MeetingSearchController와 분리
 */
@Tag(name = "AI 검색", description = "FastAPI AI 서버 전용 API")
@RestController
@RequestMapping("/api/meetings")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:5173", "http://localhost:8000"})
public class AISearchController {

    private final AISearchService aiSearchService;

    /**
     * AI 서버용 모임 검색
     * POST /api/ai/recommendations/search
     */
    @Operation(
            summary = "AI 모임 검색",
            description = "FastAPI AI 서버에서 사용하는 모임 검색 API"
    )
    @PostMapping("/search")
    public ResponseEntity<AISearchResponse> searchMeetingsForAI(
            @RequestBody AISearchRequest request
    ) {
        log.info("🤖 AI 검색 요청: category={}, subcategory={}, timeSlot={}",
                request.getCategory(), request.getSubcategory(), request.getTimeSlot());

        AISearchResponse response = aiSearchService.searchForAI(request);

        return ResponseEntity.ok(response);
    }

    /**
     * AI 서버용 모임 일괄 조회
     * POST /api/ai/recommendations/batch
     */
    @Operation(
            summary = "AI 모임 일괄 조회",
            description = "여러 모임을 ID로 한번에 조회"
    )
    @PostMapping("/batch")
    public ResponseEntity<AISearchResponse> getMeetingsBatch(
            @RequestBody AISearchRequest.BatchRequest request
    ) {
        if (request == null || request.getMeetingIds() == null || request.getMeetingIds().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        log.info("📦 모임 일괄 조회: {} IDs", request.getMeetingIds().size());

        AISearchResponse response = aiSearchService.getMeetingsBatch(request.getMeetingIds());
        return ResponseEntity.ok(response);
    }
}