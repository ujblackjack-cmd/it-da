package com.project.itda.domain.review.service;

import com.project.itda.domain.ai.dto.response.SentimentAnalysisDTO;
import com.project.itda.domain.ai.service.SentimentAnalysisService;
import com.project.itda.domain.meeting.entity.Meeting;
import com.project.itda.domain.meeting.repository.MeetingRepository;
import com.project.itda.domain.participation.entity.Participation;
import com.project.itda.domain.participation.enums.ParticipationStatus;
import com.project.itda.domain.participation.repository.ParticipationRepository;
import com.project.itda.domain.review.dto.request.ReviewCreateRequest;
import com.project.itda.domain.review.dto.request.ReviewUpdateRequest;
import com.project.itda.domain.review.dto.response.ReviewListResponse;
import com.project.itda.domain.review.dto.response.ReviewResponse;
import com.project.itda.domain.review.dto.response.UserReviewDTO;
import com.project.itda.domain.review.entity.Review;
import com.project.itda.domain.review.enums.SentimentType;
import com.project.itda.domain.review.repository.ReviewRepository;
import com.project.itda.domain.user.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 후기 서비스 (감성 분석 + 모임별 집계 통합)
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final ParticipationRepository participationRepository;
    private final MeetingRepository meetingRepository;
    private final SentimentAnalysisService sentimentAnalysisService;
    private final MeetingSentimentService meetingSentimentService;  // ✅ 추가

    /**
     * 사용자 리뷰 목록 조회 (AI SVD용)
     */
    public List<UserReviewDTO> getUserReviews(Long userId) {
        log.info("🔍 사용자 리뷰 조회: userId={}", userId);

        List<Review> reviews = reviewRepository.findByUserId(userId);

        List<UserReviewDTO> reviewDTOs = reviews.stream()
                .map(review -> UserReviewDTO.builder()
                        .meetingId(review.getMeeting().getMeetingId())
                        .rating(review.getRating().doubleValue())
                        .build())
                .collect(Collectors.toList());

        log.info("✅ 리뷰 조회 완료: {}개", reviewDTOs.size());

        return reviewDTOs;
    }

    /**
     * 후기 작성 (감성 분석 포함)
     */
    @Transactional
    public ReviewResponse createReview(User user, ReviewCreateRequest request) {
        log.info("📝 후기 작성 시작 - userId: {}, meetingId: {}",
                user.getUserId(), request.getMeetingId());

        // 1. 참여 정보 조회
        Participation participation = participationRepository
                .findByUserIdAndMeetingId(user.getUserId(), request.getMeetingId())
                .orElseThrow(() -> new IllegalArgumentException("참여 정보를 찾을 수 없습니다"));

        // 참여 상태 확인
        if (participation.getStatus() != ParticipationStatus.COMPLETED) {
            throw new IllegalStateException("완료된 모임만 후기를 작성할 수 있습니다");
        }

        // 2. 이미 후기 작성했는지 확인
        if (reviewRepository.existsByParticipationId(participation.getParticipationId())) {
            throw new IllegalStateException("이미 후기를 작성했습니다");
        }

        // 3. 모임 정보 조회
        Meeting meeting = meetingRepository.findById(request.getMeetingId())
                .orElseThrow(() -> new IllegalArgumentException("모임을 찾을 수 없습니다"));

        // 4. AI 감성 분석
        SentimentAnalysisDTO sentimentResult = null;
        SentimentType sentimentType = null;
        Double sentimentScore = null;

        try {
            sentimentResult = sentimentAnalysisService.analyzeSentiment(request.getReviewText());

            if (sentimentResult.getSuccess()) {
                sentimentType = SentimentType.valueOf(sentimentResult.getSentimentType());
                sentimentScore = sentimentResult.getSentimentScore();

                log.info("✅ 감성 분석 완료 - type: {}, score: {}",
                        sentimentType, sentimentScore);
            }
        } catch (Exception e) {
            log.warn("⚠️ 감성 분석 실패, 후기는 저장됨: {}", e.getMessage());
        }

        // 5. 후기 엔티티 생성
        Review review = Review.builder()
                .participation(participation)
                .user(user)
                .meeting(meeting)
                .rating(request.getRating())
                .reviewText(request.getReviewText())
                .sentiment(sentimentType)
                .sentimentScore(sentimentScore)
                .isPublic(request.getIsPublic())
                .createdAt(LocalDateTime.now())
                .build();

        // 6. 저장
        Review savedReview = reviewRepository.save(review);

        // 7. 모임 평균 평점 업데이트
        updateMeetingAvgRating(meeting.getMeetingId());

        // ✅ 8. 모임 감성 집계 업데이트 (추가)
        try {
            meetingSentimentService.updateMeetingSentiment(meeting.getMeetingId());
            log.info("📊 모임 감성 집계 업데이트 완료");
        } catch (Exception e) {
            log.warn("⚠️ 모임 감성 집계 실패 (계속 진행): {}", e.getMessage());
        }

        log.info("✅ 후기 작성 완료 - reviewId: {}", savedReview.getReviewId());

        // 9. 응답 생성
        return toReviewResponse(savedReview, sentimentResult);
    }

    /**
     * 후기 수정
     */
    @Transactional
    public ReviewResponse updateReview(User user, Long reviewId, ReviewUpdateRequest request) {
        log.info("✏️ 후기 수정 시작 - userId: {}, reviewId: {}", user.getUserId(), reviewId);

        // 1. 후기 조회
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new IllegalArgumentException("후기를 찾을 수 없습니다"));

        // 2. 작성자 확인
        if (!review.getUser().getUserId().equals(user.getUserId())) {
            throw new IllegalStateException("본인이 작성한 후기만 수정할 수 있습니다");
        }

        // 3. 텍스트 변경 확인
        boolean textChanged = !review.getReviewText().equals(request.getReviewText());

        // 4. AI 감성 분석 (텍스트 변경 시만)
        SentimentAnalysisDTO sentimentResult = null;
        if (textChanged) {
            try {
                sentimentResult = sentimentAnalysisService.analyzeSentiment(request.getReviewText());

                if (sentimentResult.getSuccess()) {
                    SentimentType sentimentType = SentimentType.valueOf(sentimentResult.getSentimentType());
                    Double sentimentScore = sentimentResult.getSentimentScore();

                    review.updateSentiment(sentimentType, sentimentScore);

                    log.info("✅ 감성 분석 완료 - type: {}, score: {}",
                            sentimentType, sentimentScore);
                }
            } catch (Exception e) {
                log.warn("⚠️ 감성 분석 실패: {}", e.getMessage());
            }
        }

        // 5. 후기 업데이트
        review.update(request.getRating(), request.getReviewText(), request.getIsPublic());

        // 6. 평점 변경 시 모임 평균 평점 업데이트
        updateMeetingAvgRating(review.getMeeting().getMeetingId());

        // ✅ 7. 모임 감성 재집계 (추가)
        try {
            meetingSentimentService.updateMeetingSentiment(review.getMeeting().getMeetingId());
        } catch (Exception e) {
            log.warn("⚠️ 모임 감성 재집계 실패: {}", e.getMessage());
        }

        log.info("✅ 후기 수정 완료 - reviewId: {}", reviewId);

        return toReviewResponse(review, sentimentResult);
    }

    /**
     * 후기 삭제
     */
    @Transactional
    public void deleteReview(User user, Long reviewId) {
        log.info("🗑️ 후기 삭제 시작 - userId: {}, reviewId: {}", user.getUserId(), reviewId);

        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new IllegalArgumentException("후기를 찾을 수 없습니다"));

        if (!review.getUser().getUserId().equals(user.getUserId())) {
            throw new IllegalStateException("본인이 작성한 후기만 삭제할 수 있습니다");
        }

        Long meetingId = review.getMeeting().getMeetingId();

        review.delete();

        // 평균 평점 업데이트
        updateMeetingAvgRating(meetingId);

        // ✅ 모임 감성 재집계 (추가)
        try {
            meetingSentimentService.updateMeetingSentiment(meetingId);
        } catch (Exception e) {
            log.warn("⚠️ 모임 감성 재집계 실패: {}", e.getMessage());
        }

        log.info("✅ 후기 삭제 완료 - reviewId: {}", reviewId);
    }

    /**
     * ✅ 모임의 후기 목록 조회 (모달용 - List<ReviewResponse> 반환)
     */
    @Transactional(readOnly = true)
    public List<ReviewResponse> getReviewListByMeetingId(Long meetingId) {
        log.info("📋 모임 후기 목록 조회 - meetingId: {}", meetingId);

        List<Review> reviews = reviewRepository.findByMeetingIdAndIsPublicTrue(meetingId);

        return reviews.stream()
                .map(review -> toReviewResponse(review, null))
                .collect(Collectors.toList());
    }

    /**
     * 모임의 후기 목록 조회 (감성 통계 포함)
     */
    @Transactional(readOnly = true)
    public ReviewListResponse getReviewsByMeetingId(Long meetingId) {
        log.info("📊 모임 후기 통계 조회 - meetingId: {}", meetingId);

        List<Review> reviews = reviewRepository.findByMeetingIdAndIsPublicTrue(meetingId);

        List<ReviewResponse> reviewResponses = reviews.stream()
                .map(review -> toReviewResponse(review, null))
                .collect(Collectors.toList());

        Double avgRating = reviewRepository.getAvgRatingByMeetingId(meetingId);

        // 감성 통계
        long positiveCount = reviews.stream()
                .filter(r -> r.getSentiment() == SentimentType.POSITIVE)
                .count();
        long neutralCount = reviews.stream()
                .filter(r -> r.getSentiment() == SentimentType.NEUTRAL)
                .count();
        long negativeCount = reviews.stream()
                .filter(r -> r.getSentiment() == SentimentType.NEGATIVE)
                .count();

        long total = reviews.size();
        double positivePercent = total > 0 ? (positiveCount * 100.0 / total) : 0.0;

        return ReviewListResponse.builder()
                .success(true)
                .message("후기 목록 조회 성공")
                .reviews(reviewResponses)
                .totalCount(reviews.size())
                .avgRating(avgRating)
                .sentimentStats(ReviewListResponse.SentimentStats.builder()
                        .positiveCount(positiveCount)
                        .neutralCount(neutralCount)
                        .negativeCount(negativeCount)
                        .positivePercent(positivePercent)
                        .build())
                .build();
    }

    /**
     * 사용자가 작성한 후기 목록 조회
     */
    @Transactional(readOnly = true)
    public List<ReviewResponse> getReviewsByUserId(Long userId) {
        log.info("📋 사용자 후기 목록 조회 - userId: {}", userId);

        List<Review> reviews = reviewRepository.findByUserId(userId);

        return reviews.stream()
                .map(review -> toReviewResponse(review, null))
                .collect(Collectors.toList());
    }

    /**
     * 모임 평균 평점 업데이트
     */
    private void updateMeetingAvgRating(Long meetingId) {
        Double avgRating = reviewRepository.getAvgRatingByMeetingId(meetingId);

        if (avgRating != null) {
            meetingRepository.updateAvgRating(meetingId, avgRating);
            log.info("📊 모임 평균 평점 업데이트 - meetingId: {}, avgRating: {}",
                    meetingId, avgRating);
        }
    }

    /**
     * ✅ Review 엔티티 → ReviewResponse 변환 (프론트엔드 필드명에 맞춤)
     */
    private ReviewResponse toReviewResponse(Review review, SentimentAnalysisDTO sentimentResult) {
        String sentimentIcon = null;
        String sentimentText = null;

        if (sentimentResult != null && sentimentResult.getSuccess()) {
            sentimentIcon = sentimentResult.getSentimentIcon();
            sentimentText = sentimentResult.getSentimentText();
        } else if (review.getSentiment() != null) {
            switch (review.getSentiment()) {
                case POSITIVE:
                    sentimentIcon = "😊";
                    sentimentText = "긍정적인 후기예요";
                    break;
                case NEGATIVE:
                    sentimentIcon = "😞";
                    sentimentText = "부정적인 후기예요";
                    break;
                case NEUTRAL:
                    sentimentIcon = "😐";
                    sentimentText = "보통이에요";
                    break;
            }
        }

        return ReviewResponse.builder()
                .reviewId(review.getReviewId())
                .userId(review.getUser().getUserId())
                .username(review.getUser().getUsername())
                .profileImageUrl(review.getUser().getProfileImageUrl())
                .meetingId(review.getMeeting().getMeetingId())
                .meetingTitle(review.getMeeting().getTitle())
                .rating(review.getRating())
                .content(review.getReviewText())
                .sentiment(review.getSentiment() != null ? review.getSentiment().name() : null)
                .sentimentScore(review.getSentimentScore())
                .sentimentIcon(sentimentIcon)
                .sentimentText(sentimentText)
                .isPublic(review.getIsPublic())
                .createdAt(review.getCreatedAt())
                .updatedAt(review.getUpdatedAt())
                .build();
    }
}