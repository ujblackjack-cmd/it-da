package com.project.itda.domain.notification.service;

import com.project.itda.domain.notification.dto.response.NotificationResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class PushNotificationService {

    private final SimpMessagingTemplate messagingTemplate;

    /**
     * 특정 사용자에게 알림 푸시
     */
    public void pushNotification(Long userId, NotificationResponse notification) {
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("type", "NEW_NOTIFICATION");
            payload.put("notification", notification);

            messagingTemplate.convertAndSend("/topic/notification/" + userId, payload);

            log.info("📤 알림 푸시 전송: userId={}, type={}", userId, notification.getNotificationType());
        } catch (Exception e) {
            log.error("❌ 알림 푸시 전송 실패: userId={}, error={}", userId, e.getMessage(), e);
        }
    }

    /**
     * 읽지 않은 알림 개수 업데이트 푸시
     */
    public void pushUnreadCount(Long userId, long unreadCount) {
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("type", "UNREAD_COUNT_UPDATE");
            payload.put("unreadCount", unreadCount);

            messagingTemplate.convertAndSend("/topic/notification/" + userId, payload);

            log.info("📤 읽지 않은 알림 개수 푸시: userId={}, count={}", userId, unreadCount);
        } catch (Exception e) {
            log.error("❌ 읽지 않은 알림 개수 푸시 실패: userId={}, error={}", userId, e.getMessage(), e);
        }
    }

    /**
     * 알림 읽음 처리 알림 푸시 (다른 기기 동기화용)
     */
    public void pushNotificationRead(Long userId, Long notificationId) {
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("type", "NOTIFICATION_READ");
            payload.put("notificationId", notificationId);

            messagingTemplate.convertAndSend("/topic/notification/" + userId, payload);

            log.info("📤 알림 읽음 푸시: userId={}, notificationId={}", userId, notificationId);
        } catch (Exception e) {
            log.error("❌ 알림 읽음 푸시 실패: error={}", e.getMessage(), e);
        }
    }

    /**
     * 모든 알림 읽음 처리 푸시
     */
    public void pushAllNotificationsRead(Long userId) {
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("type", "ALL_NOTIFICATIONS_READ");

            messagingTemplate.convertAndSend("/topic/notification/" + userId, payload);

            log.info("📤 모든 알림 읽음 푸시: userId={}", userId);
        } catch (Exception e) {
            log.error("❌ 모든 알림 읽음 푸시 실패: error={}", e.getMessage(), e);
        }
    }

    /**
     * 프로필 업데이트 푸시 (참여 모임, 배지 등)
     */
    public void pushProfileUpdate(Long userId, String field, Object value) {
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("type", "PROFILE_UPDATE");
            payload.put("field", field);
            payload.put("value", value);

            messagingTemplate.convertAndSend("/topic/profile/" + userId, payload);

            log.info("📤 프로필 업데이트 푸시: userId={}, field={}, value={}", userId, field, value);
        } catch (Exception e) {
            log.error("❌ 프로필 업데이트 푸시 실패: userId={}, error={}", userId, e.getMessage(), e);
        }
    }

    /**
     * ✅ 모임 완료 알림 푸시 (마이페이지 실시간 새로고침용)
     */
    public void pushMeetingCompleted(Long userId, Long meetingId, String meetingTitle) {
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("type", "MEETING_COMPLETED");
            payload.put("meetingId", meetingId);
            payload.put("meetingTitle", meetingTitle);

            messagingTemplate.convertAndSend("/topic/profile/" + userId, payload);

            log.info("📤 모임 완료 푸시: userId={}, meetingId={}, title={}", userId, meetingId, meetingTitle);
        } catch (Exception e) {
            log.error("❌ 모임 완료 푸시 실패: userId={}, error={}", userId, e.getMessage(), e);
        }
    }

    /**
     * ✅ [NEW] 참여 승인 알림 푸시 (PENDING → APPROVED 실시간 카드 이동용)
     */
    public void pushParticipationApproved(Long userId, Long meetingId, String meetingTitle, long participationCount) {
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("type", "PARTICIPATION_APPROVED");
            payload.put("meetingId", meetingId);
            payload.put("meetingTitle", meetingTitle);
            payload.put("participationCount", participationCount);

            messagingTemplate.convertAndSend("/topic/profile/" + userId, payload);

            log.info("📤 참여 승인 푸시: userId={}, meetingId={}, title={}, count={}",
                    userId, meetingId, meetingTitle, participationCount);
        } catch (Exception e) {
            log.error("❌ 참여 승인 푸시 실패: userId={}, error={}", userId, e.getMessage(), e);
        }
    }

    /**
     * ✅ [NEW] 모임 정보 업데이트 알림 푸시 (이미지, 제목 등 변경 시)
     */
    public void pushMeetingUpdated(Long userId, Long meetingId, String field, Object value) {
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("type", "MEETING_UPDATED");
            payload.put("meetingId", meetingId);
            payload.put("field", field);
            payload.put("value", value);

            messagingTemplate.convertAndSend("/topic/profile/" + userId, payload);

            log.info("📤 모임 업데이트 푸시: userId={}, meetingId={}, field={}", userId, meetingId, field);
        } catch (Exception e) {
            log.error("❌ 모임 업데이트 푸시 실패: userId={}, error={}", userId, e.getMessage(), e);
        }
    }
}