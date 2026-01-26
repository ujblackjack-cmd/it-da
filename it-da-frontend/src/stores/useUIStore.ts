import { create } from "zustand";

interface UIStore {
  isChatListModalOpen: boolean;
  openChatListModal: () => void;
  closeChatListModal: () => void;
}

const useUIStore = create<UIStore>((set) => ({
  isChatListModalOpen: false,
  openChatListModal: () => set({ isChatListModalOpen: true }),
  closeChatListModal: () => set({ isChatListModalOpen: false }),
}));

export { useUIStore };
