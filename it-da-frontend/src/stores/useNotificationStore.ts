import { create } from 'zustand';

export interface Notification {
    id: string;
    type: 'follow' | 'follow_request' | 'meeting' | 'review' | 'general';
    title: string;
    text: string;
    time: string;
    isUnread: boolean;
    fromUserId?: number;
    fromUsername?: string;
    fromProfileImage?: string;
    toUserId?: number;
    link?: string;
    content?: string;
}

export interface FollowerCountUpdate {
    userId: number;
    newCount: number;
    timestamp: number;
}

interface NotificationStore {
    notifications: Notification[];
    unreadCount: number;
    isOpen: boolean;
    lastFollowerUpdate: FollowerCountUpdate | null;

    addNotification: (notification: Omit<Notification, 'id' | 'time' | 'isUnread'>) => void;
    addFollowNotification: (data: {
        fromUserId: number;
        fromUsername: string;
        fromProfileImage?: string;
        toUserId: number;
        newFollowerCount?: number;
    }) => void;
    addFollowRequestNotification: (data: {
        fromUserId: number;
        fromUsername: string;
        fromProfileImage?: string;
        toUserId: number;
    }) => void;

    // ✅ 특정 유저의 프로필 정보 업데이트
    updateUserProfile: (userId: number, data: {
        username?: string;
        profileImage?: string;
    }) => void;

    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    removeNotification: (id: string) => void;
    clearAll: () => void;
    toggleDropdown: () => void;
    closeDropdown: () => void;
    fetchNotifications: () => Promise<void>;
}

const generateId = () => `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const useNotificationStore = create<NotificationStore>((set, get) => ({
    notifications: [],
    unreadCount: 0,
    isOpen: false,
    lastFollowerUpdate: null,

    addNotification: (notification) => {
        const newNotif: Notification = {
            ...notification,
            id: generateId(),
            time: '방금 전',
            isUnread: true,
        };

        set((state) => ({
            notifications: [newNotif, ...state.notifications].slice(0, 50),
            unreadCount: state.unreadCount + 1,
        }));
    },

    addFollowNotification: (data) => {
        const newNotif: Notification = {
            id: generateId(),
            type: 'follow',
            title: `${data.fromUsername}님이 회원님을 팔로우했어요!`,
            text: '👤 새로운 팔로워가 생겼습니다.',
            time: '방금 전',
            isUnread: true,
            fromUserId: data.fromUserId,
            fromUsername: data.fromUsername,
            fromProfileImage: data.fromProfileImage,
            toUserId: data.toUserId,
            content: `${data.fromUsername}님이 회원님을 팔로우했어요!`,
            link: `/profile/id/${data.fromUserId}`,
        };

        set((state) => ({
            notifications: [newNotif, ...state.notifications].slice(0, 50),
            unreadCount: state.unreadCount + 1,
            lastFollowerUpdate: data.newFollowerCount !== undefined ? {
                userId: data.toUserId,
                newCount: data.newFollowerCount,
                timestamp: Date.now(),
            } : state.lastFollowerUpdate,
        }));
    },

    addFollowRequestNotification: (data) => {
        const existing = get().notifications.find(
            n => n.type === 'follow_request' && n.fromUserId === data.fromUserId
        );
        if (existing) return;

        const newNotif: Notification = {
            id: generateId(),
            type: 'follow_request',
            title: `${data.fromUsername}님이 팔로우를 요청했어요!`,
            text: '📩 수락하면 팔로워가 됩니다.',
            time: '방금 전',
            isUnread: true,
            fromUserId: data.fromUserId,
            fromUsername: data.fromUsername,
            fromProfileImage: data.fromProfileImage,
            toUserId: data.toUserId,
            content: `${data.fromUsername}님이 팔로우를 요청했어요!`,
        };

        set((state) => ({
            notifications: [newNotif, ...state.notifications].slice(0, 50),
            unreadCount: state.unreadCount + 1,
        }));
    },

    // ✅ 특정 유저의 프로필 정보 업데이트
    updateUserProfile: (userId, data) => {
        console.log(`🔄 알림 프로필 업데이트: userId=${userId}`, data);

        set((state) => ({
            notifications: state.notifications.map(notif => {
                if (notif.fromUserId === userId) {
                    const newUsername = data.username || notif.fromUsername;
                    return {
                        ...notif,
                        fromUsername: newUsername,
                        fromProfileImage: data.profileImage || notif.fromProfileImage,
                        // 제목도 업데이트 (닉네임이 바뀌면)
                        title: data.username && notif.fromUsername
                            ? notif.title.replace(notif.fromUsername, data.username)
                            : notif.title,
                    };
                }
                return notif;
            }),
        }));
    },

    markAsRead: (id) => {
        set((state) => {
            const notif = state.notifications.find(n => n.id === id);
            if (!notif || !notif.isUnread) return state;

            return {
                notifications: state.notifications.map(n =>
                    n.id === id ? { ...n, isUnread: false } : n
                ),
                unreadCount: Math.max(0, state.unreadCount - 1),
            };
        });
    },

    markAllAsRead: () => {
        set((state) => ({
            notifications: state.notifications.map(n => ({ ...n, isUnread: false })),
            unreadCount: 0,
        }));
    },

    removeNotification: (id) => {
        set((state) => {
            const notif = state.notifications.find(n => n.id === id);
            return {
                notifications: state.notifications.filter(n => n.id !== id),
                unreadCount: notif?.isUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
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

    fetchNotifications: async () => {
        console.log('fetchNotifications called');
    },
}));