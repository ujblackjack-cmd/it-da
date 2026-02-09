package com.project.itda.domain.meeting.controller;

import com.project.itda.domain.auth.dto.SessionUser;
import com.project.itda.domain.meeting.dto.request.*;
import com.project.itda.domain.meeting.dto.response.MeetingSearchResponse;
import com.project.itda.domain.meeting.dto.response.MeetingDetailResponse;
import com.project.itda.domain.meeting.dto.response.MeetingResponse;
import com.project.itda.domain.meeting.service.MeetingSearchService;
import com.project.itda.domain.meeting.service.MeetingService;
import com.project.itda.domain.participation.service.ParticipationService;
import com.project.itda.domain.user.entity.User;
import com.project.itda.domain.user.repository.UserRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

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
    private final ParticipationService participationService;  // ✅ 추가
    private final UserRepository userRepository;

    /**
     * ✅ 모임 생성 (SecurityContext 사용)
     */
    @Operation(
            summary = "모임 생성",
            description = "새로운 모임을 생성합니다"
    )
    @PostMapping
    public ResponseEntity<MeetingResponse> createMeeting(
            HttpServletRequest request,
            @Valid @RequestBody MeetingCreateRequest requestDto
    ) {
        log.info("==================== 모임 생성 요청 ====================");

        // ✅ SecurityContext에서 인증 정보 가져오기
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !authentication.isAuthenticated()) {
            log.error("❌ SecurityContext에 인증 정보 없음");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        // ✅ Principal에서 userId 추출 (이제 Long 타입으로 저장됨)
        Object principal = authentication.getPrincipal();
        log.info("Principal 타입: {}, 값: {}", principal.getClass().getSimpleName(), principal);

        Long userId;
        try {
            userId = (Long) principal;  // ✅ Long으로 캐스팅
            log.info("✅ 인증된 사용자 ID: {}", userId);
        } catch (ClassCastException e) {
            log.error("❌ Principal 타입 오류: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        // ✅ 세션 디버깅 (선택 사항)
        HttpSession session = request.getSession(false);
        if (session != null) {
            log.info("세션 ID: {}", session.getId());
            log.info("세션이 새로 생성됨?: {}", session.isNew());
        }

        // ✅ 사용자 조회 및 모임 생성
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

        MeetingResponse response = meetingService.createMeeting(user, requestDto);

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
                keyword,
                category,
                null,
                null, null,
                null, null, null,
                null, null, null, null,
                page, size, "createdAt", "desc"
        );

        MeetingSearchResponse response = meetingSearchService.searchMeetings(request);

        return ResponseEntity.ok(response);
    }

    /**
     * 모임 상세 조회 (참여자 포함)
     */
    @Operation(
            summary = "모임 상세 조회",
            description = "모임 ID로 상세 정보를 조회합니다 (참여자 정보 포함)"
    )
    @GetMapping("/{meetingId}")
    public ResponseEntity<MeetingDetailResponse> getMeetingById(
            @Parameter(description = "모임 ID", required = true)
            @PathVariable Long meetingId
    ) {
        log.info("📍 GET /api/meetings/{}", meetingId);

        MeetingDetailResponse response = meetingService.getMeetingById(meetingId);

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
            @AuthenticationPrincipal Long userId,
            @Parameter(description = "모임 ID", required = true)
            @PathVariable Long meetingId,
            @Valid @RequestBody MeetingUpdateRequest request
    ) {
        log.info("📍 PUT /api/meetings/{} - userId: {}", meetingId, userId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

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
            @AuthenticationPrincipal Long userId,
            @Parameter(description = "모임 ID", required = true)
            @PathVariable Long meetingId
    ) {
        log.info("📍 DELETE /api/meetings/{} - userId: {}", meetingId, userId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

        meetingService.deleteMeeting(user, meetingId);

        return ResponseEntity.noContent().build();
    }

    /**
     * 모임 이미지 업로드
     */
    @PostMapping("/{meetingId}/image")
    public ResponseEntity<String> uploadMeetingImage(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long meetingId,
            @RequestParam("image") MultipartFile image
    ) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

        String imageUrl = meetingService.uploadMeetingImage(user, meetingId, image);

        return ResponseEntity.ok(imageUrl);
    }

    /**
     * ✅ 모임 마감 (주최자만)
     * 모든 APPROVED 참여자를 COMPLETED로 변경
     */
    @Operation(
            summary = "모임 마감",
            description = "모임을 마감하고 모든 승인된 참여자를 완료 상태로 변경합니다 (주최자만 가능)"
    )
    @PostMapping("/{meetingId}/complete")
    public ResponseEntity<Map<String, Object>> completeMeeting(
            @AuthenticationPrincipal Long userId,
            @Parameter(description = "모임 ID", required = true)
            @PathVariable Long meetingId
    ) {
        log.info("📍 POST /api/meetings/{}/complete - userId: {}", meetingId, userId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

        int completedCount = participationService.completeMeeting(user, meetingId);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "모임이 마감되었습니다.",
                "completedParticipants", completedCount
        ));
    }

    @PostMapping("/api/meetings/batch")
    public ResponseEntity<?> getMeetingsBatch(@RequestBody BatchRequestDto req) {
        List<Long> meetingIds = req.getMeetingIds();
        Map<String, Object> result = meetingService.getMeetingsByIds(meetingIds);
        return ResponseEntity.ok(result);
    }

// ========================================
// MeetingController.java에 아래 메서드 추가!
// (클래스 맨 아래, 마지막 } 전에)
// ========================================
    @PatchMapping("/{meetingId}/location")
    public ResponseEntity<?> updateLocation(
            @PathVariable Long meetingId,
            @RequestBody LocationUpdateRequest request) {

        // 서비스 로직: DB의 meetings 테이블 업데이트
        meetingService.updateLocation(meetingId, request);

        return ResponseEntity.ok().body(Map.of("success", true));
    }

    /**
     * ✅ 카테고리별 모임 개수 조회
     * GET /api/meetings/category-stats
     */
    @Operation(
            summary = "카테고리별 모임 통계",
            description = "각 카테고리별 모임 개수를 반환합니다"
    )
    @GetMapping("/category-stats")
    public ResponseEntity<Map<String, Long>> getCategoryStats() {
        log.info("📍 GET /api/meetings/category-stats");

        Map<String, Long> stats = meetingService.getCategoryStats();

        return ResponseEntity.ok(stats);
    }
    // ========================================
// MeetingController.java에 아래 메서드 추가!
// (클래스 맨 아래, 마지막 } 전에)
// ========================================

    /**
     * ✅ 카테고리별 모임 개수 조회
     * GET /api/meetings/category-stats
     */
    @Operation(
            summary = "카테고리별 모임 통계",
            description = "각 카테고리별 모임 개수를 반환합니다"
    )
    
    @GetMapping("/category-stats/detail")
    public ResponseEntity<Map<String, Object>> getCategoryDetailStats() {
        log.info("📍 GET /api/meetings/category-stats/detail");

        Map<String, Object> stats = meetingService.getCategoryDetailStats();

        return ResponseEntity.ok(stats);
    }
//    @PatchMapping("/{meetingId}/location")
//    public ResponseEntity<Void> updateLocation(@PathVariable Long meetingId, @RequestBody MeetingLocationUpdateDto dto) {
//        meetingService.updateMeetingLocation(meetingId, dto);
//        return ResponseEntity.ok().build();
//    }
}