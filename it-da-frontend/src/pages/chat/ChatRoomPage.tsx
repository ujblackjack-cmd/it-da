import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useChatStore } from "../../stores/useChatStore";
import { chatApi } from "../../api/chat.api"; // ChatMessage 타입 활용
import ChatInput from "../../components/chat/ChatInput";
import ChatMessageItem from "../../components/chat/ChatMessage";
import ChatMemberList from "../../components/chat/ChatMemberList";
import { useAuthStore } from "@/stores/useAuthStore";
import toast from "react-hot-toast";
import ChatReportModal from "./ChatReportModal";
import { User } from "../../types/user.types";
import "./ChatRoomPage.css";
import BillInputModal from "../../components/chat/BillInputModal";
import PollInputModal from "../../components/chat/PollInputModal";

interface BillData {
    totalAmount: number;
    account: string;
}

interface PollData {
    title: string;
    options: string[];
}

interface RawMemberResponse {
    userId: number;
    username: string;
    nickname?: string;
    email: string;
    status?: string;
    createdAt?: string;
    updatedAt?: string;
    profileImageUrl?: string;
    role?: string;
}

const ChatRoomPage: React.FC = () => {
    const { roomId } = useParams<{ roomId: string }>();
    const { messages, addMessage, setMessages } = useChatStore();
    const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
    const { user: currentUser } = useAuthStore();

    const [members, setMembers] = useState<User[]>([]);
    const [reportTarget, setReportTarget] = useState<{ id: number; name: string } | null>(null);
    const [activeModal, setActiveModal] = useState<"BILL" | "POLL" | null>(null);

    const handleFeatureSubmit = (type: "BILL" | "POLL", data: BillData | PollData) => {
        if (!roomId || !currentUser?.email) return;

        const content = type === "BILL" ? "💰 정산 요청이 도착했습니다." : `📊 투표: ${(data as PollData).title}`;

        chatApi.sendMessage(
            Number(roomId),
            currentUser.email,
            content,
            type,
            data as unknown as Record<string, unknown>
        );

        setActiveModal(null);
        toast.success("메시지를 전송했습니다.");
    };

    useEffect(() => {
        const initChat = async () => {
            if (!roomId || !currentUser) return;

            try {
                const history = await chatApi.getChatMessages(Number(roomId));
                setMessages(history);

                const rawMembers: RawMemberResponse[] = await chatApi.getRoomMembers(Number(roomId));
                const formattedMembers: User[] = rawMembers.map((m: RawMemberResponse) => ({
                    id: m.userId,
                    userId: m.userId,
                    name: m.nickname || m.username,
                    username: m.username,
                    email: m.email,
                    status: (m.status as User['status']) || ("ACTIVE" as User['status']),
                    createdAt: m.createdAt || new Date().toISOString(),
                    updatedAt: m.updatedAt || new Date().toISOString(),
                    profileImageUrl: m.profileImageUrl || "",
                    role: m.userId === currentUser.userId ? "ME" : "MEMBER"
                }));
                setMembers(formattedMembers);
            } catch (e) {
                console.error("데이터 로드 실패:", e);
                toast.error("채팅방 정보를 불러오는데 실패했습니다.");
            }
        };

        initChat();

        let isSubscribed = true;

        if (roomId && currentUser?.email) {
            // 기존 연결이 있다면 명시적으로 해제하여 중복 구독을 막습니다.
            chatApi.disconnect();

            chatApi.connect(Number(roomId), currentUser.email, (newMsg) => {
                if (isSubscribed) {
                    addMessage(newMsg);
                }
            });
        }
        return () => {
            isSubscribed = false;
            chatApi.disconnect();
        };
    }, [roomId, currentUser?.email]);



    const handleSendMessage = (text: string) => {
        if (!roomId || !currentUser?.email) {
            toast.error("로그인 세션이 만료되었습니다.");
            return;
        }
        chatApi.sendMessage(Number(roomId), currentUser.email, text, "TALK");
    };

    const handleFeatureAction = (feature: string) => {
        if (!roomId || !currentUser?.email) return;
        const rId = Number(roomId);

        switch (feature) {
            case "📊":
                setActiveModal("POLL");
                break;
            case "💰":
                setActiveModal("BILL");
                break;
            case "📍":
                chatApi.sendMessage(rId, currentUser.email, "📍 모임 장소 확인하세요.", "LOCATION", {
                    placeName: "여의도 한강공원",
                    lat: 37.5271,
                    lng: 126.9328
                });
                toast.success("장소 정보를 전송했습니다.");
                break;
            case "📷":
                toast.error("이미지 전송 기능은 준비 중입니다.");
                break;
        }
    };

    const handleFollow = async (targetUserId: number) => {
        try {
            await chatApi.followUser(targetUserId);
            toast.success("팔로우가 완료되었습니다!");
        } catch {
            toast.error("팔로우 처리 중 오류가 발생했습니다.");
        }
    };

    const handleReportSubmit = async (reason: string) => {
        if (!reportTarget) return;
        console.log(`${reportTarget.name}님 신고 접수: ${reason}`);
        toast.success("신고가 정상적으로 접수되었습니다.");
        setReportTarget(null);
    };

    return (
        <div className="chat-room-container">
            <header className="chat-header">
                <div className="header-left">
                    <button onClick={() => window.history.back()} className="icon-btn">←</button>
                    <h2>🌅 한강 선셋 피크닉</h2>
                </div>
                <button onClick={() => setIsMenuOpen(true)} className="icon-btn">☰</button>
            </header>

            <div className="notice-banner">
                📢 공지: 모임 D-2! 여의도 한강공원 물빛광장에서 만나요
            </div>

            <div className="message-list-area">
                {messages.map((msg, idx) => {
                    const isMine = msg.senderEmail === currentUser?.email;
                    return (
                        <div key={msg.id || idx} className={`message-row ${isMine ? 'mine' : 'others'}`}>
                            <ChatMessageItem message={msg} isMine={isMine} />
                        </div>
                    );
                })}
            </div>

            <div className="chat-input-wrapper">
                <ChatInput onSend={handleSendMessage} onShowFeature={handleFeatureAction} />
            </div>

            {/* ✅ 정산 입력 모달 */}
            {activeModal === "BILL" && (
                <BillInputModal
                    onClose={() => setActiveModal(null)}
                    onSubmit={(data: BillData) => handleFeatureSubmit("BILL", data)}
                />
            )}

            {/* ✅ 투표 입력 모달 */}
            {activeModal === "POLL" && (
                <PollInputModal
                    onClose={() => setActiveModal(null)}
                    onSubmit={(data: PollData) => handleFeatureSubmit("POLL", data)}
                />
            )}

            {isMenuOpen && (
                <div className="side-menu-overlay" onClick={() => setIsMenuOpen(false)}>
                    <div className="side-menu-content" onClick={e => e.stopPropagation()}>
                        <div className="side-menu-header">
                            <h3>참여자 목록</h3>
                            <button onClick={() => setIsMenuOpen(false)} className="close-btn">×</button>
                        </div>
                        <ChatMemberList
                            members={members}
                            onFollow={handleFollow}
                            onReport={(id, name) => setReportTarget({ id, name })}
                        />
                    </div>
                </div>
            )}

            {reportTarget && (
                <ChatReportModal
                    targetName={reportTarget.name}
                    onClose={() => setReportTarget(null)}
                    onSubmit={handleReportSubmit}
                />
            )}
        </div>
    );
};

export default ChatRoomPage;