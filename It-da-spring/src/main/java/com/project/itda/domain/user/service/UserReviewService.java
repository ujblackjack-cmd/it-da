package com.project.itda.domain.user.service;

import com.project.itda.domain.meeting.entity.Meeting;
import com.project.itda.domain.meeting.entity.MeetingParticipation;
import com.project.itda.domain.meeting.repository.MeetingRepository;
import com.project.itda.domain.user.dto.request.ReviewCreateRequest;
import com.project.itda.domain.user.entity.User;
import com.project.itda.domain.user.entity.UserReview;
import com.project.itda.domain.user.enums.ParticipationStatus;
import com.project.itda.domain.user.enums.SentimentType;
import com.project.itda.domain.user.repository.MeetingParticipationRepository;
import com.project.itda.domain.user.repository.UserRepository;
import com.project.itda.domain.user.repository.UserReviewRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserReviewService {

    private final UserRepository userRepository;
    private final MeetingRepository meetingRepository;
    private final MeetingParticipationRepository participationRepository;
    private final UserReviewRepository userReviewRepository;
    private final SentimentAnalyzer sentimentAnalyzer;

    @Transactional
    public UserReview createReview(Long currentUserId, Long meetingId, ReviewCreateRequest request) {
        log.info("후기 작성 시작: userId={}, meetingId={}", currentUserId, meetingId);

        User user = userRepository.findById(currentUserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다."));

        Meeting meeting = meetingRepository.findById(meetingId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "모임을 찾을 수 없습니다."));

        MeetingParticipation participation = participationRepository
                .findByUserUserIdAndMeetingMeetingId(currentUserId, meetingId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "해당 모임에 참여 기록이 없습니다."));

        if (participation.getStatus() != ParticipationStatus.COMPLETED) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "참여 완료된 모임만 후기를 작성할 수 있습니다.");
        }

        if (userReviewRepository.existsByUserUserIdAndMeetingMeetingId(currentUserId, meetingId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 후기를 작성했습니다.");
        }

        SentimentType sentiment = sentimentAnalyzer.analyze(request.getRating(), request.getContent());

        UserReview review = UserReview.builder()
                .user(user)
                .meeting(meeting)
                .participation(participation)
                .rating(request.getRating())
                .reviewText(request.getContent())
                .sentiment(sentiment)
                .isPublic(true)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        UserReview savedReview = userReviewRepository.save(review);
        log.info("후기 작성 완료: reviewId={}, sentiment={}", savedReview.getReviewId(), sentiment);

        return savedReview;
    }
}