package com.project.itda.domain.user.controller;

import com.project.itda.domain.user.dto.response.FollowResponse;
import com.project.itda.domain.user.dto.response.UserProfileResponse;
import com.project.itda.domain.user.service.UserProfileService;
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
public class UserProfileController {

    private final UserProfileService userProfileService;

    /**
     * 사용자 프로필 조회 (통계 포함)
     */
    @GetMapping("/{userId}/profile")
    public ResponseEntity<UserProfileResponse> getUserProfile(@PathVariable Long userId) {
        log.info("사용자 프로필 조회 요청: userId={}", userId);
        UserProfileResponse response = userProfileService.getUserProfile(userId);
        return ResponseEntity.ok(response);
    }

    /**
     * 팔로우하기
     */
    @PostMapping("/{userId}/follow")
    public ResponseEntity<Map<String, String>> followUser(
            @PathVariable Long userId,
            @RequestParam Long currentUserId) {
        log.info("팔로우 요청: follower={}, following={}", currentUserId, userId);
        userProfileService.followUser(currentUserId, userId);
        return ResponseEntity.ok(Map.of("message", "팔로우 완료"));
    }

    /**
     * 언팔로우하기
     */
    @DeleteMapping("/{userId}/follow")
    public ResponseEntity<Map<String, String>> unfollowUser(
            @PathVariable Long userId,
            @RequestParam Long currentUserId) {
        log.info("언팔로우 요청: follower={}, following={}", currentUserId, userId);
        userProfileService.unfollowUser(currentUserId, userId);
        return ResponseEntity.ok(Map.of("message", "언팔로우 완료"));
    }

    /**
     * 팔로잉 목록 조회
     */
    @GetMapping("/{userId}/following")
    public ResponseEntity<List<FollowResponse>> getFollowingList(
            @PathVariable Long userId,
            @RequestParam Long currentUserId) {
        log.info("팔로잉 목록 조회: userId={}", userId);
        List<FollowResponse> response = userProfileService.getFollowingList(userId, currentUserId);
        return ResponseEntity.ok(response);
    }

    /**
     * 팔로워 목록 조회
     */
    @GetMapping("/{userId}/followers")
    public ResponseEntity<List<FollowResponse>> getFollowerList(
            @PathVariable Long userId,
            @RequestParam Long currentUserId) {
        log.info("팔로워 목록 조회: userId={}", userId);
        List<FollowResponse> response = userProfileService.getFollowerList(userId, currentUserId);
        return ResponseEntity.ok(response);
    }

    /**
     * 팔로우 상태 확인
     */
    @GetMapping("/{userId}/follow-status")
    public ResponseEntity<Map<String, Boolean>> checkFollowStatus(
            @PathVariable Long userId,
            @RequestParam Long currentUserId) {
        log.info("팔로우 상태 확인: follower={}, following={}", currentUserId, userId);
        boolean isFollowing = userProfileService.checkFollowStatus(currentUserId, userId);
        return ResponseEntity.ok(Map.of("isFollowing", isFollowing));
    }
}