// src/types/notification.types.ts

/** 백엔드 알림 타입 (DB ENUM) */
export type NotificationTypeBackend =
    | 'FOLLOW'
    | 'FOLLOW_REQUEST'
    | 'FOLLOW_ACCEPT'
    | 'MESSAGE'
    | 'MEETING'
    | 'MEETING_JOIN'
    | 'MEETING_FOLLOW'
    | 'MEETING_REMINDER'
    | 'REVIEW'
    | 'REVIEW_REQUEST'
    | 'BADGE'
    | 'SYSTEM';

/** 프론트엔드 알림 타입 */
export type NotificationTypeFrontend =
    | 'follow'
    | 'follow_request'
    | 'follow_accept'
    | 'message'
    | 'meeting'
    | 'meeting_join'
    | 'meeting_follow'
    | 'meeting_reminder'
    | 'review'
    | 'review_request'
    | 'badge'
    | 'system';

/** 백엔드에서 받아오는 알림 응답 DTO */
export interface NotificationResponseDTO {
    notificationId: number;
    userId: number;
    notificationType: NotificationTypeBackend;
    title: string;
    content: string;
    linkUrl?: string;
    relatedId?: number;
    senderId?: number;
    senderName?: string;
    senderProfileImage?: string;
    isRead: boolean;
    sentAt: string;
    readAt?: string;
    timeAgo: string;
}

/** 알림 목록 응답 DTO */
export interface NotificationListResponseDTO {
    notifications: NotificationResponseDTO[];
    unreadCount: number;
    totalCount: number;
    page: number;
    size: number;
    hasNext: boolean;
}

/** 백엔드 타입 → 프론트엔드 타입 변환 */
export const convertNotificationType = (backendType: NotificationTypeBackend): NotificationTypeFrontend => {
    const typeMap: Record<NotificationTypeBackend, NotificationTypeFrontend> = {
        'FOLLOW': 'follow',
        'FOLLOW_REQUEST': 'follow_request',
        'FOLLOW_ACCEPT': 'follow_accept',
        'MESSAGE': 'message',
        'MEETING': 'meeting',
        'MEETING_JOIN': 'meeting_join',
        'MEETING_FOLLOW': 'meeting_follow',
        'MEETING_REMINDER': 'meeting_reminder',
        'REVIEW': 'review',
        'REVIEW_REQUEST': 'review_request',
        'BADGE': 'badge',
        'SYSTEM': 'system',
    };
    return typeMap[backendType] || 'system';
};

/** 알림 타입별 아이콘 */
export const getNotificationIcon = (type: NotificationTypeFrontend | NotificationTypeBackend): string => {
    const iconMap: Record<string, string> = {
        // 프론트엔드 타입
        'follow': '👤',
        'follow_request': '🔔',
        'follow_accept': '✅',
        'message': '💬',
        'meeting': '📅',
        'meeting_join': '🎉',
        'meeting_follow': '💡',
        'meeting_reminder': '⏰',
        'review': '⭐',
        'review_request': '✍️',
        'badge': '🏆',
        'system': '📢',
        // 백엔드 타입 (대문자)
        'FOLLOW': '👤',
        'FOLLOW_REQUEST': '🔔',
        'FOLLOW_ACCEPT': '✅',
        'MESSAGE': '💬',
        'MEETING': '📅',
        'MEETING_JOIN': '🎉',
        'MEETING_FOLLOW': '💡',
        'MEETING_REMINDER': '⏰',
        'REVIEW': '⭐',
        'REVIEW_REQUEST': '✍️',
        'BADGE': '🏆',
        'SYSTEM': '📢',
    };
    return iconMap[type] || '🔔';
};