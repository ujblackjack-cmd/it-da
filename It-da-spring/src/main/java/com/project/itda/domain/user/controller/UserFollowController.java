package com.project.itda.domain.user.controller;

import com.project.itda.domain.user.dto.response.FollowUserResponse;
import com.project.itda.domain.user.service.UserFollowService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserFollowController {

    private final UserFollowService userFollowService;

    // ==================== 기본 팔로우 (공개 계정용) ====================

    /**
     * 팔로우하기 (공개 계정만)
     * POST /api/users/{userId}/follow/{targetUserId}
     */
    @PostMapping("/{userId}/follow/{targetUserId}")
    public ResponseEntity<Map<String, String>> follow(
            @PathVariable Long userId,
            @PathVariable Long targetUserId) {
        log.info("팔로우 요청: {} -> {}", userId, targetUserId);
        userFollowService.follow(userId, targetUserId);
        return ResponseEntity.ok(Map.of("message", "팔로우 완료"));
    }

    /**
     * 언팔로우하기
     * DELETE /api/users/{userId}/follow/{targetUserId}
     */
    @DeleteMapping("/{userId}/follow/{targetUserId}")
    public ResponseEntity<Map<String, String>> unfollow(
            @PathVariable Long userId,
            @PathVariable Long targetUserId) {
        log.info("언팔로우 요청: {} -> {}", userId, targetUserId);
        userFollowService.unfollow(userId, targetUserId);
        return ResponseEntity.ok(Map.of("message", "언팔로우 완료"));
    }

    /**
     * 팔로잉 목록 조회
     * GET /api/users/{userId}/following
     */
    @GetMapping("/{userId}/following")
    public ResponseEntity<List<FollowUserResponse>> getFollowing(
            @PathVariable Long userId,
            @RequestParam(required = false) Long currentUserId) {
        log.info("팔로잉 목록 조회: userId={}, currentUserId={}", userId, currentUserId);
        return ResponseEntity.ok(userFollowService.getFollowingList(userId, currentUserId));
    }

    /**
     * 팔로워 목록 조회
     * GET /api/users/{userId}/followers
     */
    @GetMapping("/{userId}/followers")
    public ResponseEntity<List<FollowUserResponse>> getFollowers(
            @PathVariable Long userId,
            @RequestParam(required = false) Long currentUserId) {
        log.info("팔로워 목록 조회: userId={}, currentUserId={}", userId, currentUserId);
        return ResponseEntity.ok(userFollowService.getFollowerList(userId, currentUserId));
    }

    /**
     * 팔로우 상태 확인
     * GET /api/users/{userId}/is-following/{targetUserId}
     */
    @GetMapping("/{userId}/is-following/{targetUserId}")
    public ResponseEntity<Map<String, Boolean>> isFollowing(
            @PathVariable Long userId,
            @PathVariable Long targetUserId) {
        boolean result = userFollowService.isFollowing(userId, targetUserId);
        return ResponseEntity.ok(Map.of("isFollowing", result));
    }

    // ==================== 팔로우 요청 (비공개 계정용) ====================

    /**
     * 팔로우 요청 보내기 (비공개 계정용)
     * POST /api/users/{userId}/follow-request/{targetUserId}
     */
    @PostMapping("/{userId}/follow-request/{targetUserId}")
    public ResponseEntity<Map<String, String>> sendFollowRequest(
            @PathVariable Long userId,
            @PathVariable Long targetUserId) {
        log.info("팔로우 요청 전송: {} -> {}", userId, targetUserId);
        userFollowService.sendFollowRequest(userId, targetUserId);
        return ResponseEntity.ok(Map.of("message", "팔로우 요청을 보냈습니다."));
    }

    /**
     * ✅ 팔로우 요청 취소 (NEW!)
     * DELETE /api/users/{userId}/follow-request/{targetUserId}/cancel
     */
    @DeleteMapping("/{userId}/follow-request/{targetUserId}/cancel")
    public ResponseEntity<Map<String, String>> cancelFollowRequest(
            @PathVariable Long userId,
            @PathVariable Long targetUserId) {
        log.info("팔로우 요청 취소: {} -> {}", userId, targetUserId);
        userFollowService.cancelFollowRequest(userId, targetUserId);
        return ResponseEntity.ok(Map.of("message", "팔로우 요청을 취소했습니다."));
    }

    /**
     * 팔로우 요청 수락
     * POST /api/users/{userId}/follow-request/{requesterId}/accept
     */
    @PostMapping("/{userId}/follow-request/{requesterId}/accept")
    public ResponseEntity<Map<String, String>> acceptFollowRequest(
            @PathVariable Long userId,
            @PathVariable Long requesterId) {
        log.info("팔로우 요청 수락: {} <- {}", userId, requesterId);
        userFollowService.acceptFollowRequest(userId, requesterId);
        return ResponseEntity.ok(Map.of("message", "팔로우 요청을 수락했습니다."));
    }

    /**
     * 팔로우 요청 거절
     * POST /api/users/{userId}/follow-request/{requesterId}/reject
     */
    @PostMapping("/{userId}/follow-request/{requesterId}/reject")
    public ResponseEntity<Map<String, String>> rejectFollowRequest(
            @PathVariable Long userId,
            @PathVariable Long requesterId) {
        log.info("팔로우 요청 거절: {} <- {}", userId, requesterId);
        userFollowService.rejectFollowRequest(userId, requesterId);
        return ResponseEntity.ok(Map.of("message", "팔로우 요청을 거절했습니다."));
    }

    /**
     * 받은 팔로우 요청 목록 조회
     * GET /api/users/{userId}/follow-requests
     */
    @GetMapping("/{userId}/follow-requests")
    public ResponseEntity<List<FollowUserResponse>> getFollowRequests(
            @PathVariable Long userId) {
        log.info("받은 팔로우 요청 목록 조회: {}", userId);
        return ResponseEntity.ok(userFollowService.getFollowRequests(userId));
    }
}