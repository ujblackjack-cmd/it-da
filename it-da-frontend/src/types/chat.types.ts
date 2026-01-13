export interface ChatMessage {
    id?: number;
    senderEmail: string;
    senderName?: string;
    content: string;
    roomId: number;
    createdAt: string;
    type: "TALK" | "IMAGE" | "POLL" | "BILL" | "LOCATION" | "NOTICE";
    unreadCount?: number;
    metadata?: any;
}

export interface ChatRoomInfo {
  roomId: number;
  roomName: string;
  participantCount: number;
  notice?: string;
}
