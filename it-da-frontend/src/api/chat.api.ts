// src/api/chat.api.ts 수정
import { Client, IMessage } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import axios from "axios";

const API_BASE_URL = "http://localhost:8080";

// ✅ metadata를 위한 구체적 타입 정의 (any 제거)
export interface ChatMessage {
    id?: number;
    senderEmail: string;
    senderName?: string;
    content: string;
    roomId: number;
    createdAt: string;
    type: "TALK" | "IMAGE" | "POLL" | "BILL" | "LOCATION" | "NOTICE";
    unreadCount?: number;
    metadata?: Record<string, unknown> | null; // ✅ any 대신 Record 사용
}

class ChatApi {
    private client: Client | null = null;

    async getRooms() {
        const response = await axios.get(`${API_BASE_URL}/api/social/chat/rooms`, { withCredentials: true });
        return response.data;
    }

    async getChatMessages(roomId: number) {
        const response = await axios.get(`${API_BASE_URL}/api/social/messages/${roomId}`, { withCredentials: true });
        return response.data;
    }

    async followUser(followingId: number) {
        const response = await axios.post(`${API_BASE_URL}/api/social/follow/${followingId}`, {}, { withCredentials: true });
        return response.data;
    }

    connect(roomId: number, userEmail: string, onMessageReceived: (msg: ChatMessage) => void) {
        const socket = new SockJS(`${API_BASE_URL}/ws`);

        this.client = new Client({
            webSocketFactory: () => socket,
            debug: (str) => console.log(str),
            onConnect: () => {
                console.log(`✅ 채팅방 ${roomId} 연결 성공`);
                this.markAsRead(roomId, userEmail);

                this.client?.subscribe(`/topic/room/${roomId}`, (message: IMessage) => {
                    onMessageReceived(JSON.parse(message.body));
                });
            },
        });
        this.client.activate();
    }

    sendMessage(
        roomId: number,
        email: string,
        content: string,
        type: ChatMessage['type'] = "TALK",
        metadata: Record<string, unknown> | null = null
    ) {
        if (this.client?.connected) {
            const payload = {
                email: email,
                content: content,
                roomId: roomId,
                type: type,
                metadata: metadata,
            };
            this.client.publish({
                destination: `/app/chat/send/${roomId}`,
                body: JSON.stringify(payload),
            });
        }
    }

    disconnect() {
        this.client?.deactivate();
    }

    async markAsRead(roomId: number, email: string) {
        try {
            // 백엔드에 해당 컨트롤러 매핑이 생길 때까지 에러를 잡아서 처리합니다.
            await axios.post(`${API_BASE_URL}/api/social/chat/rooms/${roomId}/read`, { email }, { withCredentials: true });
        } catch {
            console.warn("⚠️ 읽음 처리 API가 아직 서버에 구현되지 않았습니다.");
        }
    }

    async getRoomMembers(roomId: number) {
        // ✅ 404 에러 직접 해결 지점: 백엔드 포트 8080 및 정확한 경로 명시
        const response = await axios.get(`${API_BASE_URL}/api/social/chat/rooms/${roomId}/members`, { withCredentials: true });
        return response.data;
    }
}

export const chatApi = new ChatApi();