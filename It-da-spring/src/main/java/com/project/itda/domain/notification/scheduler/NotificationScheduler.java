package com.project.itda.domain.notification.scheduler;

import com.project.itda.domain.meeting.entity.Meeting;
import com.project.itda.domain.meeting.repository.MeetingRepository;
import com.project.itda.domain.notification.service.NotificationService;
import com.project.itda.domain.participation.entity.Participation;
import com.project.itda.domain.participation.enums.ParticipationStatus;
import com.project.itda.domain.participation.repository.ParticipationRepository;
import com.project.itda.domain.user.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

/**
 * ✅ 알림 스케줄러
 * - 모임 리마인더 (D-1, D-day)
 * - 후기 요청 (모임 종료 후)
 * - 오래된 알림 삭제
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class NotificationScheduler {

    private final MeetingRepository meetingRepository;
    private final ParticipationRepository participationRepository;
    private final NotificationService notificationService;

    /**
     * ✅ 매일 오전 9시에 D-1 리마인더 발송
     */
    @Scheduled(cron = "0 0 9 * * *")
    @Transactional(readOnly = true)
    public void sendDayBeforeReminders() {
        log.info("🔔 D-1 리마인더 스케줄러 시작");

        LocalDate tomorrow = LocalDate.now().plusDays(1);
        LocalDateTime startOfTomorrow = tomorrow.atStartOfDay();
        LocalDateTime endOfTomorrow = tomorrow.atTime(LocalTime.MAX);

        List<Meeting> tomorrowMeetings = meetingRepository.findByMeetingTimeBetween(startOfTomorrow, endOfTomorrow);

        int sentCount = 0;
        for (Meeting meeting : tomorrowMeetings) {
            List<Participation> participants = participationRepository.findByMeetingIdAndStatus(
                    meeting.getMeetingId(), ParticipationStatus.APPROVED);

            for (Participation p : participants) {
                notificationService.notifyMeetingReminder(
                        p.getUser(),
                        meeting.getMeetingId(),
                        meeting.getTitle(),
                        "D-1"
                );
                sentCount++;
            }

            User organizer = meeting.getOrganizer();
            if (organizer != null) {
                notificationService.notifyMeetingReminder(
                        organizer,
                        meeting.getMeetingId(),
                        meeting.getTitle(),
                        "D-1"
                );
                sentCount++;
            }
        }

        log.info("✅ D-1 리마인더 전송 완료: {}건", sentCount);
    }

    /**
     * ✅ 매일 오전 8시에 D-day 리마인더 발송
     */
    @Scheduled(cron = "0 0 8 * * *")
    @Transactional(readOnly = true)
    public void sendDayOfReminders() {
        log.info("🔔 D-day 리마인더 스케줄러 시작");

        LocalDate today = LocalDate.now();
        LocalDateTime startOfToday = today.atStartOfDay();
        LocalDateTime endOfToday = today.atTime(LocalTime.MAX);

        List<Meeting> todayMeetings = meetingRepository.findByMeetingTimeBetween(startOfToday, endOfToday);

        int sentCount = 0;
        for (Meeting meeting : todayMeetings) {
            List<Participation> participants = participationRepository.findByMeetingIdAndStatus(
                    meeting.getMeetingId(), ParticipationStatus.APPROVED);

            for (Participation p : participants) {
                notificationService.notifyMeetingReminder(
                        p.getUser(),
                        meeting.getMeetingId(),
                        meeting.getTitle(),
                        "D-day"
                );
                sentCount++;
            }

            User organizer = meeting.getOrganizer();
            if (organizer != null) {
                notificationService.notifyMeetingReminder(
                        organizer,
                        meeting.getMeetingId(),
                        meeting.getTitle(),
                        "D-day"
                );
                sentCount++;
            }
        }

        log.info("✅ D-day 리마인더 전송 완료: {}건", sentCount);
    }

    /**
     * ✅ 매일 오후 9시에 후기 요청 발송
     */
    @Scheduled(cron = "0 0 21 * * *")
    @Transactional(readOnly = true)
    public void sendReviewRequests() {
        log.info("🔔 후기 요청 스케줄러 시작");

        LocalDate today = LocalDate.now();
        LocalDateTime startOfToday = today.atStartOfDay();
        LocalDateTime endOfToday = today.atTime(LocalTime.MAX);

        List<Meeting> endedMeetings = meetingRepository.findByMeetingTimeBetween(startOfToday, endOfToday);

        int sentCount = 0;
        for (Meeting meeting : endedMeetings) {
            if (meeting.getMeetingTime().isBefore(LocalDateTime.now())) {
                List<Participation> participants = participationRepository.findByMeetingIdAndStatus(
                        meeting.getMeetingId(), ParticipationStatus.APPROVED);

                for (Participation p : participants) {
                    notificationService.notifyReviewRequest(
                            p.getUser(),
                            meeting.getMeetingId(),
                            meeting.getTitle()
                    );
                    sentCount++;
                }
            }
        }

        log.info("✅ 후기 요청 전송 완료: {}건", sentCount);
    }

    /**
     * ✅ 매일 새벽 3시에 오래된 알림 삭제 (30일 이상)
     */
    @Scheduled(cron = "0 0 3 * * *")
    @Transactional
    public void cleanupOldNotifications() {
        log.info("🧹 오래된 알림 삭제 스케줄러 시작");

        int deletedCount = notificationService.cleanupOldNotifications();

        log.info("✅ 오래된 알림 삭제 완료: {}건", deletedCount);
    }
}