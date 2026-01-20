import { create } from 'zustand';
import notificationApi from '@/api/notification.api';
import { NotificationResponseDTO, convertNotificationType } from '@/types/notification.types';

export interface Notification {
    id: string;
    type: 'follow' | 'follow_request' | 'follow_accept' | 'message' | 'meeting' | 'meeting_join' | 'meeting_follow' | 'meeting_reminder' | 'review' | 'review_request' | 'badge' | 'system';  // ✅ 새 타입 추가
    title: string;
    text: string;
    time: string;
    isUnread: boolean;
    message: string;
    isRead: boolean;
    createdAt: string;
    fromUserId?: number;
    fromUsername?: string;
    fromProfileImage?: string;
    roomId?: number;
    senderId?: number;
    senderName?: string;
    senderProfileImage?: string;
    content?: string;
    // ✅ 백엔드 알림용 추가 필드 (optional)
    notificationId?: number;
    linkUrl?: string;
    relatedId?: number;
}

export type NotificationItem = Notification;
export type FollowNotificationItem = Notification;
export type MessageNotificationItem = Notification;

interface NotificationState {
    notifications: Notification[];
    unreadCount: number;
    isOpen: boolean;
    loading: boolean;  // ✅ 추가
    fetchNotifications: (userId?: number) => Promise<void>;  // ✅ userId 파라미터 추가 (optional)
    addFollowNotification: (data: {
        fromUserId: number;
        fromUsername: string;
        fromProfileImage?: string;
        toUserId?: number;
        type?: 'follow' | 'follow_request' | 'follow_accept';
        message?: string;
        newFollowerCount?: number;
    }) => void;
    addFollowRequestNotification: (data: {
        fromUserId: number;
        fromUsername: string;
        fromProfileImage?: string;
        toUserId?: number;
    }) => void;
    updateUserProfile: (userId: number, data: {
        username?: string;
        profileImage?: string;
    }) => void;
    addMessageNotification: (data: {
        roomId: number;
        senderId: number;
        senderName: string;
        senderProfileImage?: string;
        content: string;
    }) => void;
    addNotificationFromBackend: (notification: NotificationResponseDTO) => void;  // ✅ 추가
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    removeNotification: (id: string) => void;
    clearAll: () => void;
    toggleDropdown: () => void;
    closeDropdown: () => void;
}

const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '방금 전';
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    if (diffDays < 7) return `${diffDays}일 전`;
    return date.toLocaleDateString();
};

// ✅ 추가: 백엔드 알림 → 프론트엔드 Notification 변환
const convertBackendNotification = (dto: NotificationResponseDTO): Notification => {
    const frontendType = convertNotificationType(dto.notificationType) as Notification['type'];

    return {
        id: `backend-${dto.notificationId}`,
        notificationId: dto.notificationId,
        type: frontendType,
        title: dto.title,
        text: dto.content,
        message: dto.content,
        time: dto.timeAgo || formatTimeAgo(new Date(dto.sentAt)),
        isUnread: !dto.isRead,
        isRead: dto.isRead,
        createdAt: dto.sentAt,
        fromUserId: dto.senderId,
        fromUsername: dto.senderName,
        fromProfileImage: dto.senderProfileImage,
        senderId: dto.senderId,
        senderName: dto.senderName,
        senderProfileImage: dto.senderProfileImage,
        linkUrl: dto.linkUrl,
        relatedId: dto.relatedId,
        roomId: dto.notificationType === 'MESSAGE' ? dto.relatedId : undefined,
    };
};

export const useNotificationStore = create<NotificationState>((set, get) => ({
    notifications: [],
    unreadCount: 0,
    isOpen: false,
    loading: false,  // ✅ 추가

    // ✅ 수정: 백엔드에서 알림 조회 (기존 빈 함수 → 실제 구현)
    fetchNotifications: async (userId?: number) => {
        // userId가 없으면 localStorage에서 가져오기
        if (!userId) {
            const userStr = localStorage.getItem('user');
            userId = userStr ? JSON.parse(userStr)?.userId : null;
        }

        if (!userId) {
            console.log('fetchNotifications: userId 없음');
            return;
        }

        set({ loading: true });
        try {
            const response = await notificationApi.getAllNotifications(userId);
            const backendNotifications = response.notifications.map(convertBackendNotification);

            // 기존 실시간 알림(웹소켓)은 유지하고 백엔드 알림만 교체
            const realtimeNotifications = get().notifications.filter(n => !n.id.startsWith('backend-'));

            set({
                notifications: [...backendNotifications, ...realtimeNotifications],
                unreadCount: response.unreadCount + realtimeNotifications.filter(n => n.isUnread).length,
                loading: false,
            });

            console.log('📋 알림 목록 조회 완료:', response.notifications.length, '개');
        } catch (error) {
            console.error('❌ 알림 목록 조회 실패:', error);
            set({ loading: false });
        }
    },

    // ✅ 기존 코드 100% 유지
    addFollowNotification: (data) => {
        const typeMap: { [key: string]: string } = {
            'follow': '님이 회원님을 팔로우했습니다.',
            'follow_request': '님이 팔로우를 요청했습니다.',
            'follow_accept': '님이 팔로우 요청을 수락했습니다.',
        };

        const notificationType = data.type || 'follow';
        const messageText = data.message || `${data.fromUsername}${typeMap[notificationType] || '님이 회원님을 팔로우했습니다.'}`;
        const now = new Date();

        const newNotification: Notification = {
            id: `follow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: notificationType,
            title: `${data.fromUsername}님`,
            text: messageText,
            message: messageText,
            time: formatTimeAgo(now),
            isUnread: true,
            isRead: false,
            createdAt: now.toISOString(),
            fromUserId: data.fromUserId,
            fromUsername: data.fromUsername,
            fromProfileImage: data.fromProfileImage,
        };

        set((state) => ({
            notifications: [newNotification, ...state.notifications],
            unreadCount: state.unreadCount + 1,
        }));
    },

    // ✅ 기존 코드 100% 유지
    addFollowRequestNotification: (data) => {
        get().addFollowNotification({
            ...data,
            type: 'follow_request',
        });
    },

    // ✅ 기존 코드 100% 유지
    updateUserProfile: (userId, data) => {
        console.log('updateUserProfile called:', userId, data);
        set((state) => ({
            notifications: state.notifications.map((n) => {
                // 팔로우 알림에서 해당 유저 정보 업데이트
                if (n.fromUserId === userId) {
                    return {
                        ...n,
                        fromUsername: data.username || n.fromUsername,
                        fromProfileImage: data.profileImage || n.fromProfileImage,
                        title: data.username ? `${data.username}님` : n.title,
                    };
                }
                // 메시지 알림에서 해당 유저 정보 업데이트
                if (n.senderId === userId) {
                    return {
                        ...n,
                        senderName: data.username || n.senderName,
                        senderProfileImage: data.profileImage || n.senderProfileImage,
                        title: data.username ? `${data.username}님의 새 메시지` : n.title,
                    };
                }
                return n;
            }),
        }));
    },

    // ✅ 추가: 백엔드 알림 추가 (웹소켓 푸시용)
    addNotificationFromBackend: (notification: NotificationResponseDTO) => {
        const converted = convertBackendNotification(notification);

        // 중복 체크
        const exists = get().notifications.some(n => n.id === converted.id);
        if (exists) {
            console.log('⚠️ 중복 알림 스킵:', converted.id);
            return;
        }

        set((state) => ({
            notifications: [converted, ...state.notifications],
            unreadCount: state.unreadCount + 1,
        }));

        console.log('🔔 백엔드 알림 추가:', converted.type, converted.title);
    },

    // ✅ 기존 코드 100% 유지
    addMessageNotification: (data) => {
        const now = new Date();
        const truncatedContent = data.content.length > 30
            ? data.content.substring(0, 30) + '...'
            : data.content;

        const messageText = `💬 ${truncatedContent}`;

        const newNotification: Notification = {
            id: `message-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: 'message',
            title: `${data.senderName}님의 새 메시지`,
            text: messageText,
            message: messageText,
            time: formatTimeAgo(now),
            isUnread: true,
            isRead: false,
            createdAt: now.toISOString(),
            roomId: data.roomId,
            senderId: data.senderId,
            senderName: data.senderName,
            senderProfileImage: data.senderProfileImage,
            content: data.content,
        };

        console.log('📬 메시지 알림 추가:', newNotification);

        set((state) => ({
            notifications: [newNotification, ...state.notifications],
            unreadCount: state.unreadCount + 1,
        }));
    },

    // ✅ 기존 코드 유지 + 백엔드 API 호출 추가
    markAsRead: (id) => {
        const notification = get().notifications.find(n => n.id === id);

        // 백엔드 알림이면 API 호출
        if (notification?.notificationId) {
            notificationApi.markAsRead(notification.notificationId).catch(err => {
                console.error('❌ 알림 읽음 처리 API 실패:', err);
            });
        }

        // 기존 로직 그대로
        set((state) => ({
            notifications: state.notifications.map((n) =>
                n.id === id ? { ...n, isRead: true, isUnread: false } : n
            ),
            unreadCount: state.notifications.find(n => n.id === id && !n.isRead)
                ? Math.max(0, state.unreadCount - 1)
                : state.unreadCount,
        }));
    },

    // ✅ 기존 코드 유지 + 백엔드 API 호출 추가
    markAllAsRead: () => {
        const userStr = localStorage.getItem('user');
        const userId = userStr ? JSON.parse(userStr)?.userId : null;

        if (userId) {
            notificationApi.markAllAsRead(userId).catch(err => {
                console.error('❌ 모든 알림 읽음 처리 API 실패:', err);
            });
        }

        // 기존 로직 그대로
        set((state) => ({
            notifications: state.notifications.map((n) => ({
                ...n,
                isRead: true,
                isUnread: false
            })),
            unreadCount: 0,
        }));
    },

    // ✅ 기존 코드 유지 + 백엔드 API 호출 추가
    removeNotification: (id) => {
        const notification = get().notifications.find(n => n.id === id);

        // 백엔드 알림이면 API 호출
        if (notification?.notificationId) {
            notificationApi.deleteNotification(notification.notificationId).catch(err => {
                console.error('❌ 알림 삭제 API 실패:', err);
            });
        }

        // 기존 로직 그대로
        set((state) => {
            const notification = state.notifications.find(n => n.id === id);
            return {
                notifications: state.notifications.filter((n) => n.id !== id),
                unreadCount: notification && !notification.isRead
                    ? Math.max(0, state.unreadCount - 1)
                    : state.unreadCount,
            };
        });
    },

    // ✅ 기존 코드 100% 유지
    clearAll: () => {
        set({ notifications: [], unreadCount: 0 });
    },

    // ✅ 기존 코드 100% 유지
    toggleDropdown: () => {
        set((state) => ({ isOpen: !state.isOpen }));
    },

    // ✅ 기존 코드 100% 유지
    closeDropdown: () => {
        set({ isOpen: false });
    },
}));