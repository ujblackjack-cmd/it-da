import { Client, IMessage, StompSubscription } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import axios from "axios";

const API_BASE_URL = "http://localhost:8080";

// ✅ metadata를 위한 구체적 타입 정의 (any 제거)
export interface ChatMessage {
  messageId: number;
  senderId: number;
  senderNickname: string;
  content: string;
  type: "TALK" | "IMAGE" | "POLL" | "BILL" | "LOCATION" | "NOTICE" | "READ";
  sentAt: string;
  metadata?: Record<string, unknown> | null;
}

class ChatApi {
  private client: Client | null = null;
  private subscription: StompSubscription | null = null;

  async getRooms() {
    const response = await axios.get(`${API_BASE_URL}/api/social/chat/rooms`, {
      withCredentials: true,
    });
    return response.data;
  }

  async getChatMessages(
    roomId: number,
    page: number = 0,
    size: number = 50,
  ): Promise<ChatMessage[]> {
    const response = await axios.get(
      `${API_BASE_URL}/api/social/messages/${roomId}`,
      {
        params: { page, size },
        withCredentials: true,
      },
    );
    return response.data;
  }

  async followUser(followingId: number) {
    const response = await axios.post(
      `${API_BASE_URL}/api/social/follow/${followingId}`,
      {},
      { withCredentials: true },
    );
    return response.data;
  }

  connect(
    roomId: number,
    userEmail: string,
    onMessageReceived: (msg: any) => void,
  ) {
    // ✅ 기존 연결이 있다면 완전히 정리
    if (this.client?.connected) {
      console.warn("⚠️ 기존 연결이 있습니다. 정리 후 재연결합니다.");
      this.disconnect();
    }

    const socket = new SockJS(`${API_BASE_URL}/ws`);

    this.client = new Client({
      webSocketFactory: () => socket,
      onConnect: () => {
        console.log(`✅ 채팅방 ${roomId} 연결 성공`);

        // 읽음 처리
        this.sendReadEvent(roomId, userEmail);

        // ✅ 이전 구독 정리
        if (this.subscription) {
          this.subscription.unsubscribe();
          this.subscription = null;
        }

        // ✅ 새 구독 등록
        this.subscription = this.client!.subscribe(
          `/topic/room/${roomId}`,
          (message: IMessage) => {
            const data = JSON.parse(message.body);
            onMessageReceived(data);
          },
        );

        console.log(`📡 /topic/room/${roomId} 구독 완료`);
      },
      onDisconnect: () => {
        console.log("🔌 WebSocket 연결 해제");
        this.subscription = null;
      },
    });

    this.client.activate();
  }

  disconnect() {
    // ✅ 구독 정리
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = null;
      console.log("🗑️ 구독 해제 완료");
    }

    // ✅ 클라이언트 정리
    if (this.client) {
      this.client.deactivate();
      this.client = null;
      console.log("🗑️ WebSocket 클라이언트 정리 완료");
    }
  }

  sendMessage(
    roomId: number,
    email: string,
    userId: number,
    content: string,
    type: ChatMessage["type"] = "TALK",
    metadata: Record<string, unknown> | null = null,
  ) {
    if (this.client?.connected) {
      const payload = {
        email: email,
        senderId: userId,
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

  // ✅ [수정됨] body 제거 (백엔드가 세션에서 유저 정보를 가져옴)
  async markAsRead(roomId: number) {
    try {
      // POST 요청이지만 body는 비워둡니다 (백엔드 Controller 수정 반영)
      await axios.post(
        `${API_BASE_URL}/api/social/chat/rooms/${roomId}/read`,
        {},
        { withCredentials: true },
      );
    } catch (error: any) {
      const status = error.response?.status;
      if (status === 401) {
        console.error("🔒 인증 에러(401): 유효한 세션 쿠키가 없습니다.");
      } else if (status === 404) {
        console.warn("⚠️ 404 에러: 읽음 처리 API 경로를 찾을 수 없습니다.");
      } else {
        console.warn(`⚠️ API 에러(${status}):`, error.message);
      }
    }
  }
  async getRoomMembers(roomId: number) {
    // ✅ 404 에러 직접 해결 지점: 백엔드 포트 8080 및 정확한 경로 명시
    const response = await axios.get(
      `${API_BASE_URL}/api/social/chat/rooms/${roomId}/members`,
      { withCredentials: true },
    );
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
  async uploadImage(roomId: number, file: File): Promise<string> {
    const formData = new FormData();
    formData.append("file", file); // 백엔드 @RequestParam("file")과 일치

    const response = await axios.post(
      `${API_BASE_URL}/api/social/chat/images/${roomId}`,
      formData,
      {
        withCredentials: true,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );
    return response.data.imageUrl; // 서버에서 반환한 /uploads/... 경로
  }
  async updateNotice(roomId: number, notice: string) {
    await axios.put(
      `${API_BASE_URL}/api/social/chat/rooms/${roomId}/notice`,
      { notice },
      { withCredentials: true },
    );
  }
  async searchUsers(keyword: string) {
    const response = await axios.get(
      `${API_BASE_URL}/api/social/chat/users/search`,
      {
        params: { keyword },
        withCredentials: true,
      },
    );
    return response.data;
  }

  // ✅ [추가] 유저 초대
  async inviteUser(roomId: number, userId: number) {
    await axios.post(
      `${API_BASE_URL}/api/social/chat/rooms/${roomId}/invite`,
      { targetUserId: userId }, // ✅ 수정됨: userId -> targetUserId
      { withCredentials: true },
    );
  }
  async reportUser(
    reportedId: number,
    reason: string,
    description: string = "",
  ) {
    const response = await axios.post(
      `${API_BASE_URL}/api/reports`,
      {
        reportedType: "USER", // 피신고 대상이 유저인 경우
        reportedId: reportedId,
        reason: reason,
        description: description,
      },
      { withCredentials: true },
    );
    return response.data;
  }
}

export const chatApi = new ChatApi();
