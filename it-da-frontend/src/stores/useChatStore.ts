import { create } from "zustand";

export interface VoteOption {
    optionId: number;
    content: string;
    voteCount: number;
    voterIds?: number[];
}

// 투표 데이터 인터페이스
export interface VoteData {
    voteId: number;
    title: string;
    isAnonymous: boolean;
    isMultipleChoice: boolean;
    creatorId: number;
    creatorNickname: string;
    options: VoteOption[];
}

export interface ChatMessage { // ✅ 이 부분이 Page의 인터페이스와 일치해야 함
    messageId: number;
    senderId: number;
    senderNickname: string;
    content: string;
    type: 'TALK' | 'BILL' | 'POLL' | 'IMAGE' | 'LOCATION'| 'NOTICE' | 'VOTE_UPDATE' | 'BILL_UPDATE' | "AI_RECOMMENDATION";
    sentAt: string;
    unreadCount: number;
    email?:string;
    voteData?: VoteData;
    metadata?:any;
    voteId?: number;
    targetMessageId?:number;
}

interface ChatState {
    messages: ChatMessage[];
    addMessage: (message: ChatMessage) => void;
    setMessages: (messages: ChatMessage[]) => void;
    updateVote: (voteData: VoteData) => void;
    markAllAsRead: () => void;
    decrementUnreadCount: () => void;
}



export const useChatStore = create<ChatState>((set) => ({
    messages: [],
    addMessage: (msg) => set((state) => {
        const voteIdFromMeta=msg.metadata?.voteId;
        // 1. 투표 업데이트(VOTE_UPDATE) 처리
        if (msg.type === 'VOTE_UPDATE' || voteIdFromMeta) {
            // msg.voteId가 없으면 metadata 안에서 찾음
            const targetVoteId = String(msg.voteId || voteIdFromMeta);

            const hasExistingPoll = state.messages.some(m => {
                const mMeta = typeof m.metadata === 'string' ? JSON.parse(m.metadata) : m.metadata;
                return m.type === 'POLL' && String(mMeta?.voteId) === targetVoteId;
            });

            if (hasExistingPoll) {
                // 존재한다면 업데이트만 수행하고 종료 (새 메시지로 추가되지 않음)
                return {
                    messages: state.messages.map(m => {
                        const mMeta = typeof m.metadata === 'string' ? JSON.parse(m.metadata) : m.metadata;
                        if (m.type === 'POLL' && String(mMeta?.voteId) === targetVoteId) {
                            return { ...m, metadata: msg.metadata };
                        }
                        return m;
                    })
                };
            }
            // 💡 만약 실시간 투표 생성 신호라면 아래 '2. 일반 메시지 추가' 로직으로 내려가서 추가됩니다.
        }
        if (msg.type === 'BILL' || msg.type === 'BILL_UPDATE') {
            const targetId = Number(msg.targetMessageId || msg.messageId || msg.metadata?.messageId);

            // ✅ 기존에 같은 ID를 가진 BILL 메시지가 있는지 확인
            const hasExistingBill = state.messages.some(m =>
                m.type === 'BILL' && Number(m.messageId) === targetId
            );

            if (hasExistingBill) {
                return {
                    messages: state.messages.map(m => {
                        if (m.type === 'BILL' && Number(m.messageId) === targetId) {
                            console.log("🔄 스토어: 기존 정산 데이터 덮어쓰기 실행", targetId);
                            return {
                                ...m,
                                // 새로운 metadata 객체를 생성하여 참조 변경 (리액트 리렌더링 유발)
                                metadata: typeof msg.metadata === 'string'
                                    ? JSON.parse(msg.metadata)
                                    : { ...msg.metadata }
                            };
                        }
                        return m;
                    })
                };
            }
        }

        // 2. 일반 메시지 중복 체크 및 추가
        const isDuplicate = state.messages.some((m) => m.messageId === msg.messageId);
        if (isDuplicate) return state;

        return {
            messages: [...state.messages, { ...msg, unreadCount: msg.unreadCount ?? 0 }]
        };
    }),

    setMessages: (msgs) => set({ messages: msgs }),

    // ✅ VOTE_UPDATE 소켓 신호 시 호출
    updateVote: (voteData) => set((state) => ({
        messages: state.messages.map((msg) =>
            msg.voteData?.voteId === voteData.voteId
                ? { ...msg, voteData: voteData }
                : msg
        )
    })),

    markAllAsRead: () => set((state) => ({
        messages: state.messages.map((msg) => ({ ...msg, unreadCount: 0 }))
    })),
    decrementUnreadCount: () => set((state) => {
        // 메시지가 없으면 업데이트하지 않음
        if (state.messages.length === 0) return state;

        return {
            messages: state.messages.map((msg) => {
                // 이미 0인 것은 건드리지 않고, 숫자가 있는 것만 1 차감
                const currentCount = Number(msg.unreadCount ?? 0);
                return {
                    ...msg,
                    unreadCount: currentCount > 0 ? currentCount - 1 : 0
                };
            })
        };
    }),

}));

