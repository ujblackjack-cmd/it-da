package com.project.itda.domain.user.controller;

import com.project.itda.domain.user.repository.UserFollowRepository;
import com.project.itda.domain.user.dto.request.ReviewCreateRequest;
import com.project.itda.domain.user.dto.response.MyMeetingResponse;
import com.project.itda.domain.user.dto.response.MyReviewResponse;
import com.project.itda.domain.user.dto.response.PendingReviewResponse;
import com.project.itda.domain.user.entity.User;
import com.project.itda.domain.user.entity.UserReview;
import com.project.itda.domain.user.repository.UserRepository;
import com.project.itda.domain.user.service.MyPageService;
import com.project.itda.domain.user.service.UserReviewService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class MyPageController {

    private final MyPageService myPageService;
    private final UserReviewService userReviewService;
    private final UserRepository userRepository;
    private final UserFollowRepository userFollowRepository;

    // ✅ 접근 권한 체크 메서드
    private boolean canAccessUserData(Long targetUserId, Long currentUserId) {
        log.info("🔍 권한 체크 시작: targetUserId={}, currentUserId={}", targetUserId, currentUserId);

        if (targetUserId.equals(currentUserId)) {
            log.info("✅ 본인 접근 - 허용");
            return true;
        }

        User targetUser = userRepository.findById(targetUserId).orElse(null);
        if (targetUser == null) {
            log.warn("❌ 대상 유저 없음");
            return false;
        }

        log.info("🔍 대상 유저 isPublic 값: {}", targetUser.getIsPublic());

        if (targetUser.getIsPublic() != null && targetUser.getIsPublic()) {
            log.info("✅ 공개 계정 - 허용");
            return true;
        }

        boolean isFollowing = userFollowRepository.existsByFollowerIdAndFollowingId(currentUserId, targetUserId);
        log.info("🔍 팔로우 여부: {}", isFollowing);

        if (isFollowing) {
            log.info("✅ 팔로우 중 - 허용");
            return true;
        }

        log.warn("❌ 접근 권한 없음");
        return false;
    }

    @GetMapping("/{userId}/pending-reviews")
    public ResponseEntity<?> getPendingReviews(
            @PathVariable Long userId,
            @RequestParam Long currentUserId) {
        log.info("후기 작성 대기 목록 조회: userId={}, currentUserId={}", userId, currentUserId);

        if (!canAccessUserData(userId, currentUserId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "접근 권한이 없습니다."));
        }

        List<PendingReviewResponse> response = myPageService.getPendingReviews(userId, currentUserId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{userId}/my-reviews")
    public ResponseEntity<?> getMyReviews(
            @PathVariable Long userId,
            @RequestParam Long currentUserId) {
        log.info("내가 쓴 후기 조회: userId={}, currentUserId={}", userId, currentUserId);

        if (!canAccessUserData(userId, currentUserId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "접근 권한이 없습니다."));
        }

        List<MyReviewResponse> response = myPageService.getMyReviews(userId, currentUserId);
        return ResponseEntity.ok(response);
    }

    /**
     * ✅ 진행 중인 모임 조회 (NEW!)
     */
    @GetMapping("/{userId}/ongoing-meetings")
    public ResponseEntity<?> getOngoingMeetings(
            @PathVariable Long userId,
            @RequestParam Long currentUserId) {
        log.info("진행 중인 모임 조회: userId={}, currentUserId={}", userId, currentUserId);

        if (!canAccessUserData(userId, currentUserId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "접근 권한이 없습니다."));
        }

        List<MyMeetingResponse> response = myPageService.getOngoingMeetings(userId, currentUserId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{userId}/upcoming-meetings")
    public ResponseEntity<?> getUpcomingMeetings(
            @PathVariable Long userId,
            @RequestParam Long currentUserId) {
        log.info("예정 모임 조회: userId={}, currentUserId={}", userId, currentUserId);

        if (!canAccessUserData(userId, currentUserId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "접근 권한이 없습니다."));
        }

        List<MyMeetingResponse> response = myPageService.getUpcomingMeetings(userId, currentUserId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{userId}/completed-meetings")
    public ResponseEntity<?> getCompletedMeetings(
            @PathVariable Long userId,
            @RequestParam Long currentUserId) {
        log.info("완료 모임 조회: userId={}, currentUserId={}", userId, currentUserId);

        if (!canAccessUserData(userId, currentUserId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "접근 권한이 없습니다."));
        }

        List<MyMeetingResponse> response = myPageService.getCompletedMeetings(userId, currentUserId);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{userId}/meetings/{meetingId}/reviews")
    public ResponseEntity<Map<String, Object>> createReview(
            @PathVariable Long userId,
            @PathVariable Long meetingId,
            @RequestBody ReviewCreateRequest request) {
        log.info("후기 작성 요청: userId={}, meetingId={}", userId, meetingId);

        UserReview review = userReviewService.createReview(userId, meetingId, request);

        return ResponseEntity.ok(Map.of(
                "message", "후기 작성 완료",
                "reviewId", review.getReviewId(),
                "sentiment", review.getSentiment().name()
        ));
    }
}