package com.project.itda.domain.participation.controller;

import com.project.itda.domain.participation.dto.request.ParticipationRequest;
import com.project.itda.domain.participation.dto.request.ParticipationStatusRequest;
import com.project.itda.domain.participation.dto.response.ParticipantListResponse;
import com.project.itda.domain.participation.dto.response.ParticipationResponse;
import com.project.itda.domain.participation.dto.response.MyRecentMeetingResponse;
import com.project.itda.domain.participation.service.ParticipationService;
import com.project.itda.domain.user.entity.User;
import com.project.itda.domain.user.repository.UserRepository;
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

import java.util.List;
import java.util.Map;

/**
 * 참여 컨트롤러
 */
@Tag(name = "참여", description = "모임 참여 신청/승인/거절 API")
@RestController
@RequestMapping("/api/participations")
@RequiredArgsConstructor
@Slf4j
public class ParticipationController {

    private final ParticipationService participationService;
    private final UserRepository userRepository;

    /**
     * 모임 참여 신청
     */
    @Operation(summary = "모임 참여 신청", description = "모임에 참여를 신청합니다")
    @PostMapping
    public ResponseEntity<ParticipationResponse> applyParticipation(
            @AuthenticationPrincipal Long userId,  // ← 이건 null 올 수 있음
            @Valid @RequestBody ParticipationRequest request
    ) {
        log.info("📍 POST /api/participations - userId: {}, meetingId: {}", userId, request.getMeetingId());

        // ✅ userId가 null이면 request에서 가져오기
        Long actualUserId = userId != null ? userId : request.getUserId();

        if (actualUserId == null) {
            throw new IllegalArgumentException("로그인이 필요합니다.");
        }

        User user = userRepository.findById(actualUserId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

        // ✅ Service 메서드: applyParticipation(User user, ParticipationRequest request)
        ParticipationResponse response = participationService.applyParticipation(user, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * 참여 승인 (주최자만)
     */
    @Operation(summary = "참여 승인", description = "모임장이 참여 신청을 승인합니다")
    @PostMapping("/{participationId}/approve")
    public ResponseEntity<ParticipationResponse> approveParticipation(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long participationId
    ) {
        log.info("📍 PATCH /api/participations/{}/approve - userId: {}", participationId, userId);

        if (userId == null) {
            throw new IllegalArgumentException("인증 정보가 없습니다. 다시 로그인해주세요.");
        }

        User organizer = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

        // ✅ Service 메서드: approveParticipation(User organizer, Long participationId)
        ParticipationResponse response = participationService.approveParticipation(organizer, participationId);
        return ResponseEntity.ok(response);
    }

    /**
     * 참여 거절 (주최자만)
     */
    @Operation(summary = "참여 거절", description = "모임장이 참여 신청을 거절합니다")
    @PostMapping("/{participationId}/reject")
    public ResponseEntity<ParticipationResponse> rejectParticipation(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long participationId,
            @RequestBody(required = false) Map<String, String> body
    ) {
        log.info("📍 POST /api/participations/{}/reject - userId: {}", participationId, userId);

        User organizer = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

        // 프론트에서 { reason: "..." } 형태로 보냄
        String rejectionReason = (body != null && body.get("reason") != null)
                ? body.get("reason")
                : "주최자가 거절하였습니다.";

        // Builder 패턴 사용
        ParticipationStatusRequest request = ParticipationStatusRequest.builder()
                .rejectionReason(rejectionReason)
                .build();

        ParticipationResponse response = participationService.rejectParticipation(organizer, participationId, request);
        return ResponseEntity.ok(response);
    }

    /**
     * 참여 취소 (신청자 본인)
     */
    @Operation(summary = "참여 취소", description = "본인의 참여 신청을 취소합니다")
    @DeleteMapping("/{participationId}")
    public ResponseEntity<Void> cancelParticipation(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long participationId
    ) {
        log.info("📍 DELETE /api/participations/{} - userId: {}", participationId, userId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

        // ✅ Service 메서드: cancelParticipation(User user, Long participationId) - void 반환
        participationService.cancelParticipation(user, participationId);
        return ResponseEntity.noContent().build();
    }

    /**
     * 모임의 참여자 목록 조회
     */
    @Operation(summary = "참여자 목록 조회", description = "모임의 참여자 목록을 조회합니다")
    @GetMapping("/meeting/{meetingId}")
    public ResponseEntity<ParticipantListResponse> getParticipantsByMeeting(
            @PathVariable Long meetingId
    ) {
        log.info("📍 GET /api/participations/meeting/{}", meetingId);

        // ✅ Service 메서드: getParticipantsByMeetingId(Long meetingId)
        ParticipantListResponse response = participationService.getParticipantsByMeetingId(meetingId);
        return ResponseEntity.ok(response);
    }

    /**
     * 사용자의 참여 목록 조회
     */
    @Operation(summary = "내 참여 목록 조회", description = "사용자의 모든 참여 목록을 조회합니다")
    @GetMapping("/user/{userId}")
    public ResponseEntity<List<ParticipationResponse>> getParticipationsByUser(
            @PathVariable Long userId
    ) {
        log.info("📍 GET /api/participations/user/{}", userId);

        // ✅ Service 메서드: getParticipationsByUserId(Long userId)
        List<ParticipationResponse> responses = participationService.getParticipationsByUserId(userId);
        return ResponseEntity.ok(responses);
    }

    /**
     * 내 참여 목록 조회 (로그인 사용자)
     */
    @Operation(summary = "내 참여 목록 조회", description = "로그인 사용자의 참여 목록을 조회합니다")
    @GetMapping("/my")
    public ResponseEntity<List<ParticipationResponse>> getMyParticipations(
            @AuthenticationPrincipal Long userId
    ) {
        log.info("📍 GET /api/participations/my - userId: {}", userId);

        List<ParticipationResponse> responses = participationService.getParticipationsByUserId(userId);
        return ResponseEntity.ok(responses);
    }

    /**
     * ✅ 홈페이지용 - 내가 참여 중인 최근 모임 목록 조회
     */
    @Operation(summary = "최근 참여 모임 조회", description = "홈페이지에 표시할 최근 참여 중인 모임 목록")
    @GetMapping("/my-recent")
    public ResponseEntity<List<MyRecentMeetingResponse>> getMyRecentMeetings(
            @AuthenticationPrincipal Long userId,
            @RequestParam(defaultValue = "4") int limit
    ) {
        log.info("📍 GET /api/participations/my-recent - userId: {}, limit: {}", userId, limit);

        // ✅ Service 메서드: getMyRecentMeetings(Long userId, int limit)
        List<MyRecentMeetingResponse> responses = participationService.getMyRecentMeetings(userId, limit);
        return ResponseEntity.ok(responses);
    }

    /**
     * 모임 마감 (주최자만)
     */
    @Operation(summary = "모임 마감", description = "주최자가 모임을 마감합니다")
    @PostMapping("/meeting/{meetingId}/complete")
    public ResponseEntity<Integer> completeMeeting(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long meetingId
    ) {
        log.info("📍 POST /api/participations/meeting/{}/complete - userId: {}", meetingId, userId);

        User organizer = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

        // ✅ Service 메서드: completeMeeting(User organizer, Long meetingId)
        int completedCount = participationService.completeMeeting(organizer, meetingId);
        return ResponseEntity.ok(completedCount);
    }
}