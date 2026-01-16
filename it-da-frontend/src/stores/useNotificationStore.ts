import { create } from 'zustand';

export interface Notification {
    id: string;
    type: 'follow' | 'follow_request' | 'follow_accept' | 'message';
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
}

export type NotificationItem = Notification;
export type FollowNotificationItem = Notification;
export type MessageNotificationItem = Notification;

interface NotificationState {
    notifications: Notification[];
    unreadCount: number;
    isOpen: boolean;
    fetchNotifications: () => Promise<void>;
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

export const useNotificationStore = create<NotificationState>((set, get) => ({
    notifications: [],
    unreadCount: 0,
    isOpen: false,

    fetchNotifications: async () => {
        console.log('fetchNotifications called');
    },

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

    addFollowRequestNotification: (data) => {
        get().addFollowNotification({
            ...data,
            type: 'follow_request',
        });
    },

    updateUserProfile: (userId, data) => {
        console.log('updateUserProfile called:', userId, data);
    },

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

    markAsRead: (id) => {
        set((state) => ({
            notifications: state.notifications.map((n) =>
                n.id === id ? { ...n, isRead: true, isUnread: false } : n
            ),
            unreadCount: state.notifications.find(n => n.id === id && !n.isRead)
                ? Math.max(0, state.unreadCount - 1)
                : state.unreadCount,
        }));
    },

    markAllAsRead: () => {
        set((state) => ({
            notifications: state.notifications.map((n) => ({
                ...n,
                isRead: true,
                isUnread: false
            })),
            unreadCount: 0,
        }));
    },

    removeNotification: (id) => {
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

    clearAll: () => {
        set({ notifications: [], unreadCount: 0 });
    },

    toggleDropdown: () => {
        set((state) => ({ isOpen: !state.isOpen }));
    },

    closeDropdown: () => {
        set({ isOpen: false });
    },
}));