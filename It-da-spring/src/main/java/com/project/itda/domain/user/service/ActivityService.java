// src/main/java/com/project/itda/domain/user/service/ActivityService.java
package com.project.itda.domain.user.service;

import com.project.itda.domain.badge.entity.UserBadge;
import com.project.itda.domain.badge.repository.UserBadgeRepository;
import com.project.itda.domain.meeting.entity.Meeting;
import com.project.itda.domain.meeting.repository.MeetingRepository;
import com.project.itda.domain.participation.entity.Participation;
import com.project.itda.domain.participation.enums.ParticipationStatus;
import com.project.itda.domain.participation.repository.ParticipationRepository;
import com.project.itda.domain.review.entity.Review;
import com.project.itda.domain.review.repository.ReviewRepository;
import com.project.itda.domain.user.dto.response.ActivityResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 활동 기록 서비스
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class ActivityService {

    private final ParticipationRepository participationRepository;
    private final ReviewRepository reviewRepository;
    private final UserBadgeRepository userBadgeRepository;
    private final MeetingRepository meetingRepository;

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy.MM.dd");

    /**
     * 사용자 활동 기록 조회 (최신순)
     */
    public List<ActivityResponse> getActivities(Long userId, int limit) {
        List<ActivityResponse> activities = new ArrayList<>();

        // 1. 참여 완료 기록
        List<Participation> completedParticipations = participationRepository
                .findByUserIdAndStatus(userId, ParticipationStatus.COMPLETED);

        for (Participation p : completedParticipations) {
            activities.add(ActivityResponse.builder()
                    .id(p.getParticipationId())
                    .type("PARTICIPATION")
                    .title("모임 참여 완료!")
                    .description(p.getMeeting().getTitle() + " 모임에 참여했어요")
                    .icon("🎉")
                    .date(formatDate(p.getCompletedAt() != null ? p.getCompletedAt() : p.getApprovedAt()))
                    .timestamp(p.getCompletedAt() != null ? p.getCompletedAt() : p.getApprovedAt())
                    .relatedId(p.getMeeting().getMeetingId())
                    .build());
        }

        // 2. 리뷰 작성 기록
        List<Review> reviews = reviewRepository.findByUserId(userId);
        for (Review r : reviews) {
            activities.add(ActivityResponse.builder()
                    .id(r.getReviewId())
                    .type("REVIEW")
                    .title("후기 작성 완료!")
                    .description(r.getMeeting().getTitle() + " 모임에 후기를 남겼어요")
                    .icon("✍️")
                    .date(formatDate(r.getCreatedAt()))
                    .timestamp(r.getCreatedAt())
                    .relatedId(r.getMeeting().getMeetingId())
                    .build());
        }

        // 3. 배지 획득 기록
        List<UserBadge> badges = userBadgeRepository.findByUserIdAndUnlocked(userId, true);
        for (UserBadge b : badges) {
            String badgeIcon = b.getBadge().getIcon() != null ? b.getBadge().getIcon() : "🏅";
            activities.add(ActivityResponse.builder()
                    .id(b.getUserBadgeId())
                    .type("BADGE")
                    .title("배지 획득!")
                    .description(badgeIcon + " " + b.getBadge().getBadgeName() + " 배지를 획득했어요")
                    .icon("🏆")
                    .date(formatDate(b.getUnlockedAt()))
                    .timestamp(b.getUnlockedAt())
                    .relatedId(b.getBadge().getBadgeId())
                    .build());
        }

        // 4. 모임 생성 기록
        List<Meeting> organizedMeetings = meetingRepository.findByOrganizerUserId(userId);
        for (Meeting m : organizedMeetings) {
            activities.add(ActivityResponse.builder()
                    .id(m.getMeetingId())
                    .type("MEETING_CREATED")
                    .title("모임 생성!")
                    .description(m.getTitle() + " 모임을 만들었어요")
                    .icon("🎊")
                    .date(formatDate(m.getCreatedAt()))
                    .timestamp(m.getCreatedAt())
                    .relatedId(m.getMeetingId())
                    .build());
        }

        // 5. 최신순 정렬 + limit 적용
        return activities.stream()
                .sorted(Comparator.comparing(ActivityResponse::getTimestamp,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(limit)
                .collect(Collectors.toList());
    }

    private String formatDate(LocalDateTime dateTime) {
        if (dateTime == null) return "";
        return dateTime.format(DATE_FORMATTER);
    }
}