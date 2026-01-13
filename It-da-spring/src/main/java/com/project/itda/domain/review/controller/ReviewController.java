package com.project.itda.domain.review.controller;

import com.project.itda.domain.review.dto.response.UserReviewDTO;
import com.project.itda.domain.review.service.ReviewService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/reviews")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:5173", "http://localhost:8000"})
public class ReviewController {

    private final ReviewService reviewService;

    /**
     * 사용자 리뷰 목록 조회 (FastAPI AI 서버 - SVD용)
     * GET /api/reviews/user/{userId}
     */
    @GetMapping("/user/{userId}")
    public ResponseEntity<List<UserReviewDTO>> getUserReviews(@PathVariable Long userId) {
        List<UserReviewDTO> reviews = reviewService.getUserReviews(userId);
        return ResponseEntity.ok(reviews);
    }
}