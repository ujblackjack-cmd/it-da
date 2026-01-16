import { create } from 'zustand';

export interface UserChatMessage {
    messageId: number;
    roomId: number;
    senderId: number;
    senderName: string;
    senderProfileImage?: string;
    content: string;
    createdAt: string;
    isRead: boolean;
    isMine: boolean;
}

export interface ChatRoom {
    roomId: number;
    otherUserId: number;
    otherUsername: string;
    otherProfileImage?: string;
    lastMessage?: string;
    lastMessageAt?: string;
    unreadCount: number;
}

export interface NewMessageNotification {
    roomId: number;
    senderName: string;
    senderProfileImage?: string;
    content: string;
}

interface UserChatState {
    chatRooms: ChatRoom[];
    setChatRooms: (rooms: ChatRoom[]) => void;
    updateChatRoom: (roomId: number, data: Partial<ChatRoom>) => void;
    currentRoomId: number | null;
    setCurrentRoomId: (roomId: number | null) => void;
    messages: UserChatMessage[];
    setMessages: (messages: UserChatMessage[] | ((prev: UserChatMessage[]) => UserChatMessage[])) => void;
    addMessage: (message: UserChatMessage) => void;
    markMessagesAsRead: (roomId: number) => void;
    totalUnreadCount: number;
    setTotalUnreadCount: (count: number) => void;
    increaseTotalUnread: (count: number) => void;
    decreaseTotalUnread: (count: number) => void;
    newMessageNotification: NewMessageNotification | null;
    setNewMessageNotification: (notification: NewMessageNotification | null) => void;
    clearNewMessageNotification: () => void;
}

export const useUserChatStore = create<UserChatState>((set, get) => ({
    chatRooms: [],
    setChatRooms: (rooms) => set({ chatRooms: rooms }),
    updateChatRoom: (roomId, data) => set((state) => ({
        chatRooms: state.chatRooms.map(room =>
            room.roomId === roomId ? { ...room, ...data } : room
        ).sort((a, b) => {
            if (!a.lastMessageAt) return 1;
            if (!b.lastMessageAt) return -1;
            return b.lastMessageAt.localeCompare(a.lastMessageAt);
        })
    })),
    currentRoomId: null,
    setCurrentRoomId: (roomId) => set({ currentRoomId: roomId }),
    messages: [],
    setMessages: (messagesOrUpdater) => set((state) => ({
        messages: typeof messagesOrUpdater === 'function'
            ? messagesOrUpdater(state.messages)
            : messagesOrUpdater
    })),
    addMessage: (message) => set((state) => {
        if (state.messages.some(m => m.messageId === message.messageId)) {
            return state;
        }
        return { messages: [...state.messages, message] };
    }),
    markMessagesAsRead: (roomId) => set((state) => ({
        messages: state.messages.map(m =>
            m.roomId === roomId ? { ...m, isRead: true } : m
        )
    })),
    totalUnreadCount: 0,
    setTotalUnreadCount: (count) => set({ totalUnreadCount: count }),
    increaseTotalUnread: (count) => set((state) => ({
        totalUnreadCount: state.totalUnreadCount + count
    })),
    decreaseTotalUnread: (count) => set((state) => ({
        totalUnreadCount: Math.max(0, state.totalUnreadCount - count)
    })),
    newMessageNotification: null,
    setNewMessageNotification: (notification) => {
        set({ newMessageNotification: notification });
        if (notification) {
            setTimeout(() => {
                const current = get().newMessageNotification;
                if (current?.roomId === notification.roomId) {
                    set({ newMessageNotification: null });
                }
            }, 4000);
        }
    },
    clearNewMessageNotification: () => set({ newMessageNotification: null }),
}));