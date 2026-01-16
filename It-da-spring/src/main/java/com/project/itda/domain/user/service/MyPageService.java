package com.project.itda.domain.user.service;

import com.project.itda.domain.meeting.entity.Meeting;
import com.project.itda.domain.meeting.entity.MeetingParticipation;
import com.project.itda.domain.user.dto.response.MyMeetingResponse;
import com.project.itda.domain.user.dto.response.MyReviewResponse;
import com.project.itda.domain.user.dto.response.PendingReviewResponse;
import com.project.itda.domain.user.entity.UserReview;
import com.project.itda.domain.user.enums.ParticipationStatus;
import com.project.itda.domain.user.repository.MeetingParticipationRepository;
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
    private final MeetingParticipationRepository participationRepository;
    private final UserReviewRepository userReviewRepository;

    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter DATETIME_FORMAT = DateTimeFormatter.ofPattern("yyyy.MM.dd HH:mm");

    // ✅ 수정: 유저 존재 여부만 체크 (권한 체크는 Controller에서 처리)
    private void validateUserExists(Long userId) {
        userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다."));
    }

    public List<PendingReviewResponse> getPendingReviews(Long userId, Long currentUserId) {
        validateUserExists(userId);  // ✅ 수정

        List<MeetingParticipation> completedParticipations =
                participationRepository.findByUserUserIdAndStatusOrderByIdDesc(userId, ParticipationStatus.COMPLETED);

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
        validateUserExists(userId);  // ✅ 수정

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

    public List<MyMeetingResponse> getUpcomingMeetings(Long userId, Long currentUserId) {
        validateUserExists(userId);  // ✅ 수정

        List<MeetingParticipation> upcomingParticipations =
                participationRepository.findByUserUserIdAndStatusOrderByIdDesc(userId, ParticipationStatus.UPCOMING);

        return upcomingParticipations.stream()
                .map(p -> {
                    Meeting m = p.getMeeting();
                    return MyMeetingResponse.builder()
                            .meetingId(m.getMeetingId())
                            .meetingTitle(m.getTitle())
                            .dateTime(m.getMeetingTime().format(DATETIME_FORMAT))
                            .location(m.getLocationName())
                            .statusText("예정")
                            .averageRating(m.getAvgRating())
                            .hasMyReview(false)
                            .build();
                })
                .toList();
    }

    public List<MyMeetingResponse> getCompletedMeetings(Long userId, Long currentUserId) {
        validateUserExists(userId);  // ✅ 수정

        List<MeetingParticipation> completedParticipations =
                participationRepository.findByUserUserIdAndStatusOrderByIdDesc(userId, ParticipationStatus.COMPLETED);

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
                            .meetingTitle(m.getTitle())
                            .dateTime(displayTime.format(DATETIME_FORMAT))
                            .location(m.getLocationName())
                            .statusText("완료")
                            .averageRating(m.getAvgRating())
                            .hasMyReview(reviewedMeetingIds.contains(m.getMeetingId()))
                            .build();
                })
                .toList();
    }
}