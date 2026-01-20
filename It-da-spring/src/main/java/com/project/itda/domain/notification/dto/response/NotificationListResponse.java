package com.project.itda.domain.notification.dto.response;

import lombok.*;

import java.util.List;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificationListResponse {

    private List<NotificationResponse> notifications;
    private long unreadCount;
    private int totalCount;
    private int page;
    private int size;
    private boolean hasNext;

    public static NotificationListResponse of(
            List<NotificationResponse> notifications,
            long unreadCount,
            int page,
            int size,
            boolean hasNext
    ) {
        return NotificationListResponse.builder()
                .notifications(notifications)
                .unreadCount(unreadCount)
                .totalCount(notifications.size())
                .page(page)
                .size(size)
                .hasNext(hasNext)
                .build();
    }

    public static NotificationListResponse of(List<NotificationResponse> notifications, long unreadCount) {
        return NotificationListResponse.builder()
                .notifications(notifications)
                .unreadCount(unreadCount)
                .totalCount(notifications.size())
                .page(0)
                .size(notifications.size())
                .hasNext(false)
                .build();
    }
}