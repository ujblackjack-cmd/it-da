package com.project.itda.domain.notification.dto.response;

import com.project.itda.domain.notification.entity.Notification;
import com.project.itda.domain.notification.enums.NotificationType;
import lombok.*;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificationResponse {

    private Long notificationId;
    private Long userId;
    private NotificationType notificationType;
    private String title;
    private String content;
    private String linkUrl;
    private Long relatedId;
    private Long senderId;
    private String senderName;
    private String senderProfileImage;
    private Boolean isRead;
    private LocalDateTime sentAt;
    private LocalDateTime readAt;
    private String timeAgo;  // "2분 전", "1시간 전" 등

    public static NotificationResponse from(Notification notification) {
        return NotificationResponse.builder()
                .notificationId(notification.getNotificationId())
                .userId(notification.getUser().getUserId())
                .notificationType(notification.getNotificationType())
                .title(notification.getTitle())
                .content(notification.getContent())
                .linkUrl(notification.getLinkUrl())
                .relatedId(notification.getRelatedId())
                .senderId(notification.getSenderId())
                .senderName(notification.getSenderName())
                .senderProfileImage(notification.getSenderProfileImage())
                .isRead(notification.getIsRead())
                .sentAt(notification.getSentAt())
                .readAt(notification.getReadAt())
                .timeAgo(formatTimeAgo(notification.getSentAt()))
                .build();
    }

    private static String formatTimeAgo(LocalDateTime dateTime) {
        if (dateTime == null) return "";

        LocalDateTime now = LocalDateTime.now();
        long minutes = ChronoUnit.MINUTES.between(dateTime, now);
        long hours = ChronoUnit.HOURS.between(dateTime, now);
        long days = ChronoUnit.DAYS.between(dateTime, now);

        if (minutes < 1) return "방금 전";
        if (minutes < 60) return minutes + "분 전";
        if (hours < 24) return hours + "시간 전";
        if (days < 7) return days + "일 전";
        if (days < 30) return (days / 7) + "주 전";
        return (days / 30) + "개월 전";
    }
}