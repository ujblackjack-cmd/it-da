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

    @PostMapping("/{userId}/follow/{targetUserId}")
    public ResponseEntity<Map<String, String>> follow(
            @PathVariable Long userId,
            @PathVariable Long targetUserId) {
        log.info("팔로우 요청: {} -> {}", userId, targetUserId);
        userFollowService.follow(userId, targetUserId);
        return ResponseEntity.ok(Map.of("message", "팔로우 완료"));
    }

    @DeleteMapping("/{userId}/follow/{targetUserId}")
    public ResponseEntity<Map<String, String>> unfollow(
            @PathVariable Long userId,
            @PathVariable Long targetUserId) {
        log.info("언팔로우 요청: {} -> {}", userId, targetUserId);
        userFollowService.unfollow(userId, targetUserId);
        return ResponseEntity.ok(Map.of("message", "언팔로우 완료"));
    }

    @GetMapping("/{userId}/following")
    public ResponseEntity<List<FollowUserResponse>> getFollowing(
            @PathVariable Long userId) {
        log.info("팔로잉 목록 조회: {}", userId);
        return ResponseEntity.ok(userFollowService.getFollowing(userId));
    }

    @GetMapping("/{userId}/followers")
    public ResponseEntity<List<FollowUserResponse>> getFollowers(
            @PathVariable Long userId) {
        log.info("팔로워 목록 조회: {}", userId);
        return ResponseEntity.ok(userFollowService.getFollowers(userId));
    }

    @GetMapping("/{userId}/is-following/{targetUserId}")
    public ResponseEntity<Map<String, Boolean>> isFollowing(
            @PathVariable Long userId,
            @PathVariable Long targetUserId) {
        boolean result = userFollowService.isFollowing(userId, targetUserId);
        return ResponseEntity.ok(Map.of("isFollowing", result));
    }
}