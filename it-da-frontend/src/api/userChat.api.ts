import axios from 'axios';

const API_BASE = 'http://localhost:8080/api';

export interface ChatRoomResponse {
    roomId: number;
    otherUserId: number;
    otherUsername: string;
    otherProfileImage?: string;
    lastMessage?: string;
    lastMessageAt?: string;
    unreadCount: number;
}

export interface ChatMessageResponse {
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

const userChatApi = {
    // 내 채팅방 목록 조회
    getMyChatRooms: async (userId: number): Promise<ChatRoomResponse[]> => {
        const response = await axios.get(`${API_BASE}/user-chat/rooms`, {
            params: { userId },
        });
        return response.data;
    },

    // 특정 채팅방 정보 조회
    getChatRoom: async (roomId: number, userId: number): Promise<ChatRoomResponse> => {
        const response = await axios.get(`${API_BASE}/user-chat/room/${roomId}`, {
            params: { userId },
        });
        return response.data;
    },

    // 채팅방 메시지 조회
    getMessages: async (roomId: number, userId: number): Promise<ChatMessageResponse[]> => {
        const response = await axios.get(`${API_BASE}/user-chat/room/${roomId}/messages`, {
            params: { userId },
        });
        return response.data;
    },

    // 메시지 전송
    sendMessage: async (roomId: number, userId: number, content: string): Promise<ChatMessageResponse> => {
        const response = await axios.post(
            `${API_BASE}/user-chat/room/${roomId}/message`,
            { content },
            { params: { userId } }
        );
        return response.data;
    },

    // 읽음 처리
    markAsRead: async (roomId: number, userId: number): Promise<void> => {
        await axios.post(`${API_BASE}/user-chat/room/${roomId}/read`, null, {
            params: { userId },
        });
    },

    // 안읽은 메시지 수 조회
    getUnreadCount: async (userId: number): Promise<number> => {
        const response = await axios.get(`${API_BASE}/user-chat/unread-count`, {
            params: { userId },
        });
        return response.data.unreadCount;
    },

    // 채팅방 생성 또는 조회 (1:1 채팅)
    getOrCreateRoom: async (userId: number, targetUserId: number): Promise<ChatRoomResponse> => {
        const response = await axios.post(`${API_BASE}/user-chat/room`, null, {
            params: { userId, targetUserId },
        });
        return response.data;
    },

    // 메시지 전송 가능 여부 확인 (차단/비공개 계정 등)
    canSendMessage: async (senderId: number, receiverId: number): Promise<{ canSend: boolean; message?: string }> => {
        try {
            const response = await axios.get(`${API_BASE}/user-chat/can-send`, {
                params: { senderId, receiverId },
            });
            return response.data;
        } catch {
            // API 실패 시 기본적으로 허용
            return { canSend: true };
        }
    },
};

export default userChatApi;