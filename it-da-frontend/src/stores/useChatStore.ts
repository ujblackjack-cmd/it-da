import { create } from "zustand";
import { ChatMessage } from "../types/chat.types";

interface ChatState {
  messages: ChatMessage[];
  addMessage: (msg: ChatMessage) => void;
  setMessages: (msgs: ChatMessage[]) => void;
}

export const useChatStore = create<ChatState>((set) => ({
    messages: [],
    // ✅ 수정: 기존 메시지 목록에 동일한 ID가 없을 때만 추가합니다.
    addMessage: (msg) => set((state) => {
        const isDuplicate = state.messages.some(m => m.id === msg.id && msg.id !== undefined);
        if (isDuplicate) return state;
        return { messages: [...state.messages, msg] };
    }),
    setMessages: (msgs) => set({ messages: msgs }),
}));

