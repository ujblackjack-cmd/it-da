import { Client, IMessage } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import axios from "axios";

export interface ChatMessage {
  id?: number;
  senderEmail: string;
  senderName?: string;
  content: string;
  roomId: number;
  createdAt: string;
  type: "TALK" | "IMAGE" | "POLL" | "BILL" | "LOCATION" | "NOTICE";
  unreadCount?: number; // 읽음 처리용
  metadata?: any; // 투표 데이터나 장소 좌표 등 저장
}

class ChatApi {
  private client: Client | null = null;

  async getRooms() {
    const response = await axios.get("/api/social/rooms");
    return response.data;
  }

  async getChatMessages(roomId: number) {
    const response = await axios.get(`/api/social/messages/${roomId}`);
    return response.data;
  }

// chat.api.ts

// 1. 인자에 userEmail을 추가합니다.
    connect(roomId: number, userEmail: string, onMessageReceived: (msg: ChatMessage) => void) {
        const socket = new SockJS("http://localhost:8080/ws");

        this.client = new Client({
            webSocketFactory: () => socket,
            debug: (str) => console.log(str),
            onConnect: () => {
                console.log(`채팅방 ${roomId} 연결 성공`);

                // ✅ [추가] 접속하자마자 서버에 읽음 알림을 보냅니다.
                this.markAsRead(roomId, userEmail);

                this.client?.subscribe(`/topic/room/${roomId}`, (message: IMessage) => {
                    onMessageReceived(JSON.parse(message.body));
                });
            },
        });
        this.client.activate();
    }

    // src/api/chat.api.ts 내 sendMessage 메서드 수정

    sendMessage(
        roomId: number,
        email: string,
        content: string,
        type: ChatMessage['type'] = "TALK", // ✅ 기본값 설정
        metadata: any = null // ✅ 기본값 설정으로 TS2554 해결
    ) {
        if (this.client?.connected) {
            const payload: ChatMessage = {
                senderEmail: email,
                content: content,
                roomId: roomId,
                type: type,
                metadata: metadata,
                createdAt: new Date().toISOString()
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
    await axios.post(`/api/social/rooms/${roomId}/read`, { email });
  }
}

export const chatApi = new ChatApi();
