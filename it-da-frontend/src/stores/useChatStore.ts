import { create } from "zustand";

export interface ChatMessage { // ✅ 이 부분이 Page의 인터페이스와 일치해야 함
    messageId: number;
    senderId: number;
    senderNickname: string;
    content: string;
    type: string;
    sentAt: string;
}

interface ChatState {
    messages: ChatMessage[];
    addMessage: (message: ChatMessage) => void;
    setMessages: (messages: ChatMessage[]) => void;
}

export const useChatStore = create<ChatState>((set) => ({
    messages: [],
    // ✅ 수정: 새로운 DTO 필드명인 messageId를 기준으로 중복을 체크합니다.
    addMessage: (msg) => set((state) => {
        const isDuplicate = state.messages.some(
            (m) => m.messageId === msg.messageId && msg.messageId !== undefined
        );
        if (isDuplicate) return state;
        return { messages: [...state.messages, msg] };
    }),
    setMessages: (msgs) => set({ messages: msgs }),
}));

