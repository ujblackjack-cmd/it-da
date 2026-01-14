package com.project.itda.domain.meeting.controller;

import com.project.itda.domain.meeting.dto.request.MeetingCreateRequest;
import com.project.itda.domain.meeting.dto.request.MeetingUpdateRequest;
import com.project.itda.domain.meeting.dto.request.MeetingSearchRequest;
import com.project.itda.domain.meeting.dto.response.MeetingSearchResponse;
import com.project.itda.domain.meeting.dto.response.MeetingDetailResponse;
import com.project.itda.domain.meeting.dto.response.MeetingResponse;
import com.project.itda.domain.meeting.service.MeetingSearchService;
import com.project.itda.domain.meeting.service.MeetingService;
import com.project.itda.domain.user.entity.User;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * 모임 컨트롤러 (CRUD)
 */
@Tag(name = "모임", description = "모임 CRUD API")
@RestController
@RequestMapping("/api/meetings")
@RequiredArgsConstructor
@Slf4j
public class MeetingController {

    private final MeetingService meetingService;
    private final MeetingSearchService meetingSearchService;

    /**
     * 모임 생성
     */
    @Operation(
            summary = "모임 생성",
            description = "새로운 모임을 생성합니다"
    )
    @PostMapping
    public ResponseEntity<MeetingResponse> createMeeting(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody MeetingCreateRequest request
    ) {
        log.info("📍 POST /api/meetings - userId: {}", user.getUserId());

        MeetingResponse response = meetingService.createMeeting(user, request);

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * 모임 목록 조회 (React용 GET)
     * GET /api/meetings
     */
    @GetMapping
    public ResponseEntity<MeetingSearchResponse> getAllMeetings(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        log.info("📍 GET /api/meetings - category: {}, keyword: {}, page: {}",
                category, keyword, page);

        MeetingSearchRequest request = new MeetingSearchRequest(
                keyword,      // keyword
                category,     // category
                null,         // subcategory
                null, null,   // startDate, endDate
                null, null, null,  // latitude, longitude, radius
                null, null, null, null,  // locationType, vibe, timeSlot, status
                page, size, "createdAt", "desc"
        );

        MeetingSearchResponse response = meetingSearchService.searchMeetings(request);

        return ResponseEntity.ok(response);
    }

    /**
     * 모임 상세 조회
     */
    @Operation(
            summary = "모임 상세 조회",
            description = "모임의 상세 정보를 조회합니다"
    )
    @GetMapping("/{meetingId}")
    public ResponseEntity<MeetingDetailResponse> getMeeting(
            @Parameter(description = "모임 ID", required = true)
            @PathVariable Long meetingId
    ) {
        log.info("📍 GET /api/meetings/{}", meetingId);

        MeetingDetailResponse response = meetingService.getMeetingDetail(meetingId);

        return ResponseEntity.ok(response);
    }

    /**
     * 모임 수정
     */
    @Operation(
            summary = "모임 수정",
            description = "모임 정보를 수정합니다 (주최자만 가능)"
    )
    @PutMapping("/{meetingId}")
    public ResponseEntity<MeetingResponse> updateMeeting(
            @AuthenticationPrincipal User user,
            @Parameter(description = "모임 ID", required = true)
            @PathVariable Long meetingId,
            @Valid @RequestBody MeetingUpdateRequest request
    ) {
        log.info("📍 PUT /api/meetings/{} - userId: {}", meetingId, user.getUserId());

        MeetingResponse response = meetingService.updateMeeting(user, meetingId, request);

        return ResponseEntity.ok(response);
    }

    /**
     * 모임 삭제
     */
    @Operation(
            summary = "모임 삭제",
            description = "모임을 삭제합니다 (주최자만 가능, 소프트 삭제)"
    )
    @DeleteMapping("/{meetingId}")
    public ResponseEntity<Void> deleteMeeting(
            @AuthenticationPrincipal User user,
            @Parameter(description = "모임 ID", required = true)
            @PathVariable Long meetingId
    ) {
        log.info("📍 DELETE /api/meetings/{} - userId: {}", meetingId, user.getUserId());

        meetingService.deleteMeeting(user, meetingId);

        return ResponseEntity.noContent().build();
    }
}