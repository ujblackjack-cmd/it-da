package com.project.itda.domain.user.controller;

import com.project.itda.domain.user.dto.request.ReviewCreateRequest;
import com.project.itda.domain.user.dto.response.MyMeetingResponse;
import com.project.itda.domain.user.dto.response.MyReviewResponse;
import com.project.itda.domain.user.dto.response.PendingReviewResponse;
import com.project.itda.domain.user.entity.UserReview;
import com.project.itda.domain.user.service.MyPageService;
import com.project.itda.domain.user.service.UserReviewService;
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
public class MyPageController {

    private final MyPageService myPageService;
    private final UserReviewService userReviewService;

    @GetMapping("/{userId}/pending-reviews")
    public ResponseEntity<List<PendingReviewResponse>> getPendingReviews(
            @PathVariable Long userId,
            @RequestParam Long currentUserId) {
        log.info("후기 작성 대기 목록 조회: userId={}", userId);
        List<PendingReviewResponse> response = myPageService.getPendingReviews(userId, currentUserId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{userId}/my-reviews")
    public ResponseEntity<List<MyReviewResponse>> getMyReviews(
            @PathVariable Long userId,
            @RequestParam Long currentUserId) {
        log.info("내가 쓴 후기 조회: userId={}", userId);
        List<MyReviewResponse> response = myPageService.getMyReviews(userId, currentUserId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{userId}/upcoming-meetings")
    public ResponseEntity<List<MyMeetingResponse>> getUpcomingMeetings(
            @PathVariable Long userId,
            @RequestParam Long currentUserId) {
        log.info("예정 모임 조회: userId={}", userId);
        List<MyMeetingResponse> response = myPageService.getUpcomingMeetings(userId, currentUserId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{userId}/completed-meetings")
    public ResponseEntity<List<MyMeetingResponse>> getCompletedMeetings(
            @PathVariable Long userId,
            @RequestParam Long currentUserId) {
        log.info("완료 모임 조회: userId={}", userId);
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