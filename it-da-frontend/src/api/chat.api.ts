import { Client, IMessage } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import axios from "axios";

const API_BASE_URL = "http://localhost:8080";

// ✅ metadata를 위한 구체적 타입 정의 (any 제거)
export interface ChatMessage {
    messageId: number;
    senderId: number;
    senderNickname: string;
    content: string;
    type: "TALK" | "IMAGE" | "POLL" | "BILL" | "LOCATION" | "NOTICE";
    sentAt: string;
    metadata?: Record<string, unknown> | null;
}

class ChatApi {
    private client: Client | null = null;

    async getRooms() {
        const response = await axios.get(`${API_BASE_URL}/api/social/chat/rooms`, { withCredentials: true });
        return response.data;
    }

    async getChatMessages(roomId: number, page: number = 0, size: number = 50): Promise<ChatMessage[]> {
        const response = await axios.get(`${API_BASE_URL}/api/social/messages/${roomId}`, {
            params: { page, size },
            withCredentials: true
        });
        return response.data;
    }

    async followUser(followingId: number) {
        const response = await axios.post(`${API_BASE_URL}/api/social/follow/${followingId}`, {}, { withCredentials: true });
        return response.data;
    }

    connect(roomId: number, userEmail: string, onMessageReceived: (msg: ChatMessage) => void,onReadReceived?: (data: any) => void) {
        const socket = new SockJS(`${API_BASE_URL}/ws`);

        this.client = new Client({
            webSocketFactory: () => socket,
            debug: (str) => console.log(str),
            onConnect: () => {
                console.log(`✅ 채팅방 ${roomId} 연결 성공`);
                this.sendReadEvent(roomId, userEmail);
                this.markAsRead(roomId, userEmail);

                // 메시지 수신 구독
                this.client?.subscribe(`/topic/room/${roomId}`, (message: IMessage) => {
                    const data = JSON.parse(message.body);

                    // ✅ BILL_UPDATE 또는 VOTE_UPDATE 메시지는 그대로 전달
                    // useChatStore의 addMessage에서 알아서 처리함
                    onMessageReceived(data);
                });

                // ✅ 읽음 이벤트 구독 추가
                // ✅ 읽음 이벤트 구독 - 콜백 추가
                this.client?.subscribe(`/topic/room/${roomId}/read`, (message: IMessage) => {
                    const readData = JSON.parse(message.body);
                    console.log("📖 읽음 이벤트 수신:", readData);

                    // ✅ 다른 사람이 읽었다는 신호를 받으면 모든 메시지를 읽음 처리
                    if (onReadReceived) {
                        onReadReceived(readData);
                    }
                });
            },
        });
        this.client.activate();
    }

    sendMessage(
        roomId: number,
        email: string,
        userId: number,
        content: string,
        type: ChatMessage['type'] = "TALK",
        metadata: Record<string, unknown> | null = null
    ) {
        if (this.client?.connected) {
            const payload = {
                email: email,
                senderId:userId,
                content: content,
                roomId: roomId,
                type: type,
                metadata: metadata,
            };
            console.log("📤 전송하는 메시지:", payload);
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
    sendReadEvent(roomId: number, email: string) {
        if (this.client?.connected) {
            this.client.publish({
                destination: `/app/chat/read/${roomId}`,
                body: JSON.stringify({ roomId, email }),
            });
        }
    }
    subscribeToRead(roomId: number, onReadReceived: (data: any) => void) {
        if (this.client?.connected) {
            this.client.subscribe(`/topic/room/${roomId}/read`, (message: IMessage) => {
                onReadReceived(JSON.parse(message.body));
            });
        }
    }
    async uploadImage(roomId: number, file: File): Promise<string> {
        const formData = new FormData();
        formData.append('file', file); // 백엔드 @RequestParam("file")과 일치

        const response = await axios.post(`${API_BASE_URL}/api/social/chat/images/${roomId}`, formData, {
            withCredentials: true,
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data.imageUrl; // 서버에서 반환한 /uploads/... 경로
    }
    async updateNotice(roomId: number, notice: string) {
        await axios.put(`${API_BASE_URL}/api/social/chat/rooms/${roomId}/notice`,
            { notice },
            { withCredentials: true }
        );
    }
    async searchUsers(keyword: string) {
        const response = await axios.get(`${API_BASE_URL}/api/social/chat/users/search`, {
            params: { keyword },
            withCredentials: true
        });
        return response.data;
    }

    // ✅ [추가] 유저 초대
    async inviteUser(roomId: number, userId: number) {
        await axios.post(`${API_BASE_URL}/api/social/chat/rooms/${roomId}/invite`,
            { targetUserId: userId }, // ✅ 수정됨: userId -> targetUserId
            { withCredentials: true }
        );
    }
}

export const chatApi = new ChatApi();