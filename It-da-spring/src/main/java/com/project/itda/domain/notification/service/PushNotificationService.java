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

            // /topic/notification/{userId} 로 알림 전송
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
}