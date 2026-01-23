package com.project.itda.domain.user.service;

import com.project.itda.domain.meeting.entity.Meeting;
import com.project.itda.domain.participation.entity.Participation;
import com.project.itda.domain.participation.enums.ParticipationStatus;
import com.project.itda.domain.participation.repository.ParticipationRepository;
import com.project.itda.domain.user.dto.response.MyMeetingResponse;
import com.project.itda.domain.user.dto.response.MyReviewResponse;
import com.project.itda.domain.user.dto.response.PendingReviewResponse;
import com.project.itda.domain.user.entity.UserReview;
import com.project.itda.domain.user.repository.UserReviewRepository;
import com.project.itda.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MyPageService {

    private final UserRepository userRepository;
    private final ParticipationRepository participationRepository;  // ✅ 변경!
    private final UserReviewRepository userReviewRepository;

    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter DATETIME_FORMAT = DateTimeFormatter.ofPattern("yyyy.MM.dd HH:mm");

    private void validateUserExists(Long userId) {
        userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다."));
    }

    public List<PendingReviewResponse> getPendingReviews(Long userId, Long currentUserId) {
        validateUserExists(userId);

        // ✅ COMPLETED 상태 참여 조회
        List<Participation> completedParticipations =
                participationRepository.findByUserIdAndStatus(userId, ParticipationStatus.COMPLETED);

        if (completedParticipations.isEmpty()) {
            return List.of();
        }

        List<Long> meetingIds = completedParticipations.stream()
                .map(p -> p.getMeeting().getMeetingId())
                .toList();

        Set<Long> reviewedMeetingIds = userReviewRepository
                .findByUserUserIdAndMeetingMeetingIdIn(userId, meetingIds)
                .stream()
                .map(r -> r.getMeeting().getMeetingId())
                .collect(Collectors.toSet());

        return completedParticipations.stream()
                .filter(p -> !reviewedMeetingIds.contains(p.getMeeting().getMeetingId()))
                .map(p -> PendingReviewResponse.builder()
                        .meetingId(p.getMeeting().getMeetingId())
                        .meetingTitle(p.getMeeting().getTitle())
                        .completedDate(p.getCompletedAt() != null
                                ? p.getCompletedAt().format(DATE_FORMAT)
                                : "")
                        .build())
                .toList();
    }

    public List<MyReviewResponse> getMyReviews(Long userId, Long currentUserId) {
        validateUserExists(userId);

        List<UserReview> reviews = userReviewRepository.findByUserUserIdOrderByCreatedAtDesc(userId);

        return reviews.stream()
                .map(r -> MyReviewResponse.builder()
                        .meetingId(r.getMeeting().getMeetingId())
                        .meetingTitle(r.getMeeting().getTitle())
                        .rating(r.getRating())
                        .content(r.getReviewText())
                        .createdDate(r.getCreatedAt().format(DATE_FORMAT))
                        .sentiment(r.getSentiment().name())
                        .build())
                .toList();
    }

    // ✅ APPROVED 상태 참여 조회로 변경!
    public List<MyMeetingResponse> getUpcomingMeetings(Long userId, Long currentUserId) {
        validateUserExists(userId);

        // ✅ APPROVED 상태 = 승인된 참여 (예정 모임)
        List<Participation> approvedParticipations =
                participationRepository.findByUserIdAndStatus(userId, ParticipationStatus.APPROVED);

        log.info("📋 예정 모임 조회: userId={}, count={}", userId, approvedParticipations.size());

        return approvedParticipations.stream()
                .map(p -> {
                    Meeting m = p.getMeeting();
                    return MyMeetingResponse.builder()
                            .meetingId(m.getMeetingId())
                            .chatRoomId(m.getChatRoom() != null ? m.getChatRoom().getId() : null)
                            .meetingTitle(m.getTitle())
                            .dateTime(m.getMeetingTime() != null
                                    ? m.getMeetingTime().format(DATETIME_FORMAT)
                                    : "미정")
                            .location(m.getLocationName())
                            .statusText("예정")
                            .averageRating(m.getAvgRating())
                            .hasMyReview(false)
                            .build();
                })
                .toList();
    }

    // ✅ COMPLETED 상태 참여 조회
    public List<MyMeetingResponse> getCompletedMeetings(Long userId, Long currentUserId) {
        validateUserExists(userId);

        List<Participation> completedParticipations =
                participationRepository.findByUserIdAndStatus(userId, ParticipationStatus.COMPLETED);

        log.info("📋 완료 모임 조회: userId={}, count={}", userId, completedParticipations.size());

        if (completedParticipations.isEmpty()) {
            return List.of();
        }

        List<Long> meetingIds = completedParticipations.stream()
                .map(p -> p.getMeeting().getMeetingId())
                .toList();

        Set<Long> reviewedMeetingIds = userReviewRepository
                .findByUserUserIdAndMeetingMeetingIdIn(userId, meetingIds)
                .stream()
                .map(r -> r.getMeeting().getMeetingId())
                .collect(Collectors.toSet());

        return completedParticipations.stream()
                .map(p -> {
                    Meeting m = p.getMeeting();
                    LocalDateTime displayTime = p.getCompletedAt() != null
                            ? p.getCompletedAt()
                            : m.getMeetingTime();

                    return MyMeetingResponse.builder()
                            .meetingId(m.getMeetingId())
                            .chatRoomId(m.getChatRoom() != null ? m.getChatRoom().getId() : null)
                            .meetingTitle(m.getTitle())
                            .dateTime(displayTime != null
                                    ? displayTime.format(DATETIME_FORMAT)
                                    : "미정")
                            .location(m.getLocationName())
                            .statusText("완료")
                            .averageRating(m.getAvgRating())
                            .hasMyReview(reviewedMeetingIds.contains(m.getMeetingId()))
                            .build();
                })
                .toList();
    }
}