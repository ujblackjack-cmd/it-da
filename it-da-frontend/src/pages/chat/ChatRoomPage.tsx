import React, { useState, useEffect,useRef } from "react";
import {useNavigate, useParams} from "react-router-dom";
import { useChatStore,ChatMessage } from "@/stores/useChatStore.ts";
import { chatApi } from "@/api/chat.api.ts"; // ChatMessage 타입 활용
import ChatMessageItem from "../../components/chat/ChatMessage";
import ChatMemberList from "../../components/chat/ChatMemberList";
import { useAuthStore } from "@/stores/useAuthStore";
import toast from "react-hot-toast";
import ChatReportModal from "./ChatReportModal";
import { User } from "@/types/user.types.ts";
import "./ChatRoomPage.css";
import BillInputModal from "../../components/chat/BillInputModal";
import PollInputModal from "../../components/chat/PollInputModal";
import api from '@/api/axios.config';

interface BillData {
    totalAmount: number;
    participantCount: number; // 참여 인원 추가
    account: string;
}

interface PollData {
    title: string;
    options: string[];
    isAnonymous?: boolean;
    isMultipleChoice?: boolean;
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

// const api = axios.create({
//     baseURL: 'http://localhost:8080',
//     withCredentials: true,
//     headers: {
//         'Content-Type': 'application/json'
//     }
// });

const ChatRoomPage: React.FC = () => {
    const { roomId } = useParams<{ roomId: string }>();
    const { messages, addMessage, setMessages, markAllAsRead,decrementUnreadCount } = useChatStore();
    const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
    const { user: currentUser } = useAuthStore();

    const [members, setMembers] = useState<User[]>([]);
    const [reportTarget, setReportTarget] = useState<{ id: number; name: string } | null>(null);
    const [activeModal, setActiveModal] = useState<"BILL" | "POLL" | null>(null);
    const [roomTitle,setRoomTitle]=useState<string>("채팅방");

    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const messageEndRef = useRef<HTMLDivElement>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [roomMembers, setRoomMembers] = useState<{ userId: number; nickname: string }[]>([]);
    const [inputValue, setInputValue] = useState<string>("");
    const navigate=useNavigate();

    // AI 추천 알림창 (HTML 기능 반영)
    const showAIRecommendation = () => {
        toast("🤖 AI가 최적의 장소를 추천해드립니다!\n\n1. 여의도 한강공원 ⭐\n2. 반포 달빛광장\n3. 뚝섬 장미광장", {
            duration: 4000,
            icon: '🤖',
        });
    };

    const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !roomId) return;

        try {
            setIsLoading(true);
            // API 호출하여 서버 저장 및 채팅 메시지 발송 (백엔드에서 자동 처리)
            await chatApi.uploadImage(Number(roomId), file);
            toast.success("이미지를 전송했습니다.");
        } catch (error) {
            console.error("이미지 전송 실패:", error);
            toast.error("이미지 전송에 실패했습니다.");
        } finally {
            setIsLoading(false);
            if (fileInputRef.current) fileInputRef.current.value = ""; // 입력창 초기화
        }
    };

    // ✅ 스크롤 핸들러 구현 (위로 올리면 과거 기록 로드)
    const handleScroll = async () => {
        if (!chatContainerRef.current || !hasMore || isLoading) return;

        if (chatContainerRef.current.scrollTop === 0) {
            setIsLoading(true);
            const previousHeight = chatContainerRef.current.scrollHeight;

            try {
                const oldMessages = await chatApi.getChatMessages(Number(roomId), page + 1,50);

                if (oldMessages && oldMessages.length > 0) {
                    const validatedOldMessages = oldMessages.map(msg => ({
                        ...msg,
                        senderNickname: msg.senderNickname || "사용자",
                        unreadCount: 0,
                        sentAt: msg.sentAt || new Date().toISOString()
                    }));

                    const combined = [...validatedOldMessages, ...messages];

                    // 중복 제거 강화
                    const uniqueMap = new Map();
                    combined.forEach(msg => {
                        if (!uniqueMap.has(msg.messageId)) {
                            uniqueMap.set(msg.messageId, msg);
                        }
                    });

                    const uniqueSorted = Array.from(uniqueMap.values())
                        .sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());

                    setMessages(uniqueSorted);
                    setPage(prev => prev + 1);

                    setTimeout(() => {
                        if (chatContainerRef.current) {
                            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight - previousHeight;
                        }
                    }, 50);
                } else {
                    setHasMore(false);
                }
            } catch (e) {
                console.error("과거 기록 로드 실패:", e);
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handleFeatureSubmit =async (type: "BILL" | "POLL", data: any) => {
        if (!roomId || !currentUser?.email || !currentUser?.userId) {
            toast.error("로그인 세션이 만료되었습니다.");
            return;
        }

        try {
            if (type === "BILL") {
                const perPerson = Math.floor(data.totalAmount / data.participantCount);
                const content = `💰 정산 요청: 1인당 ${perPerson.toLocaleString()}원`;
                const metadata = { ...data, amountPerPerson: perPerson };

                chatApi.sendMessage(
                    Number(roomId),
                    currentUser.email,
                    currentUser.userId,
                    content,
                    type,
                    metadata
                );
            } else if (type === "POLL") {
                // ✅ 투표는 별도 API로 생성 (백엔드의 VoteController 사용)
                await api.post(
                    `/votes/${roomId}`,
                    {
                        title: data.title,
                        isAnonymous: data.isAnonymous || false,
                        isMultipleChoice: data.isMultipleChoice || false,
                        options: data.options // 문자열 배열로 전송
                    },
                    { withCredentials: true }
                );
                console.log("✅ 투표 생성 API 호출 완료");
            }

            setActiveModal(null);
            toast.success("메시지를 전송했습니다.");
        } catch (error) {
            console.error("❌ 전송 실패:", error);
            toast.error("전송에 실패했습니다.");
        }
    };

    useEffect(() => {
        const initChat = async () => {
            if (!roomId || !currentUser) return;

            // 🚀 디버깅: 현재 진입한 ID가 모임 ID인지 채팅방 ID인지 확인
            console.log("🔍 [ChatRoom] Initializing with RoomID:", roomId);

            try {
                // 1. 초기 메시지 로드 (독립적)
                try {
                    const history = await chatApi.getChatMessages(Number(roomId), 0, 50);
                    const validatedHistory = history.map(msg => ({
                        ...msg,
                        senderNickname: msg.senderNickname || "사용자",
                        unreadCount: 0
                    }));
                    setMessages(validatedHistory);
                } catch (e) {
                    console.error("❌ 메시지 로드 실패:", e);
                }

                // 2. 읽음 처리 (실패해도 무방하므로 catch 처리)
                try {
                    await chatApi.markAsRead(Number(roomId), currentUser.email);
                    chatApi.sendReadEvent(Number(roomId), currentUser.email);
                    markAllAsRead();
                } catch (e) {
                    console.warn("⚠️ 읽음 처리 실패 (API 확인 필요):", e);
                }

                // 3. 방 제목 설정
                try {
                    const rooms = await chatApi.getRooms();
                    const currentRoom = rooms.find((r: any) => r.chatRoomId === Number(roomId));
                    if (currentRoom) setRoomTitle(currentRoom.roomName);
                } catch (e) {
                    console.warn("⚠️ 방 제목 로드 실패");
                }

                // 4. 멤버 목록 로드 (500 에러 발생 지점 방어)
                try {
                    const rawMembers: RawMemberResponse[] = await chatApi.getRoomMembers(Number(roomId));
                    const formattedMembers: User[] = rawMembers.map((m: RawMemberResponse) => ({
                        id: m.userId,
                        userId: m.userId,
                        name: m.nickname?.trim() ? m.nickname : m.username,
                        username: m.username,
                        nickname: m.nickname,
                        email: m.email,
                        status: (m.status || "ACTIVE") as User['status'],
                        createdAt: m.createdAt || new Date().toISOString(),
                        updatedAt: m.updatedAt || new Date().toISOString(),
                        profileImageUrl: m.profileImageUrl || "",
                        role: m.userId === currentUser.userId ? "ME" : m.role === "ORGANIZER" ? "LEADER" : "MEMBER"
                    }));
                    setMembers(formattedMembers);
                    setRoomMembers(rawMembers.map(m => ({
                        userId: m.userId,
                        nickname: m.nickname?.trim() ? m.nickname : m.username
                    })));
                } catch (e) {
                    console.error("❌ 멤버 로드 실패 (ID 101이 chat_rooms 테이블에 있나요?):", e);
                    toast.error("멤버 정보를 불러올 수 없습니다.");
                    setMembers([]); // 에러 시 빈 배열로 초기화하여 렌더링 에러 방지
                }

            } catch (e) {
                console.error("🚨 예상치 못한 치명적 오류:", e);
            }
        };

        initChat();

        let isSubscribed = true;

        if (roomId && currentUser?.email) {
            chatApi.disconnect(); // 중복 구독 방지

            chatApi.connect(Number(roomId), currentUser.email, (newMsg: any) => {
                if (!isSubscribed) return;

                if (newMsg.type === 'BILL_UPDATE' || newMsg.type === 'VOTE_UPDATE') {
                    addMessage({
                        ...newMsg,
                        messageId: Number(newMsg.targetMessageId || newMsg.messageId),
                        // ✅ 핵심: 업데이트 신호를 받아도 스토어가 찾을 수 있게 원본 타입(BILL/POLL)을 명시해야 함
                        type: newMsg.type === 'BILL_UPDATE' ? 'BILL' : 'POLL'
                    });
                    return; // 업데이트용 신호이므로 아래의 중복 체크 로직을 타지 않게 종료
                }

                const isMine = Number(newMsg.senderId) === Number(currentUser.userId) ||
                    newMsg.senderEmail === currentUser.email;

                const validatedMsg: ChatMessage = {
                    ...newMsg,
                    senderNickname: newMsg.senderNickname || "사용자",
                    unreadCount: isMine
                        ? Number(newMsg.unreadCount ?? 0)
                        : Math.max(0, Number(newMsg.unreadCount ?? 0) - 1),
                    sentAt: newMsg.sentAt || new Date().toISOString(),
                    senderId: Number(newMsg.senderId),
                    messageId: Number(newMsg.messageId) || Date.now(),
                    metadata: typeof newMsg.metadata === 'string'
                        ? JSON.parse(newMsg.metadata)
                        : newMsg.metadata
                };

                addMessage(validatedMsg);


                if (!isMine && newMsg.type === 'TALK') {
                    chatApi.sendReadEvent(Number(roomId), currentUser.email);
                }
            }, (readData: any) => {
                console.log("📖 읽음 이벤트 수신:", readData);
                // ✅ 핵심 수정 3: 상대방이 읽었을 때만 내 화면의 숫자를 줄임
                // 내가 읽은 이벤트는 이미 markAllAsRead() 등으로 처리되므로 중복 차감 방지
                if (readData.email !== currentUser?.email) {
                    decrementUnreadCount();
                }
            });
        } return () => {
            isSubscribed = false;
            chatApi.disconnect();
        };

    },[roomId, currentUser, setMessages, markAllAsRead,decrementUnreadCount]); // ✅ 의존성 배열 정리



    const handleSendMessage = () => {
        if (!roomId || !currentUser?.email || !currentUser?.userId || !inputValue.trim()) {
            if (!inputValue.trim()) return;
            toast.error("로그인 세션이 만료되었습니다.");
            return;
        }
        chatApi.sendMessage(Number(roomId), currentUser.email, currentUser.userId, inputValue, "TALK",{});

        setInputValue("");
    };

    const handleFeatureAction = (feature: string) => {
        if (!roomId || !currentUser?.email) return;

        switch (feature) {
            case "📷":
                fileInputRef.current?.click(); // 숨겨진 파일 입력창 클릭 실행
                break;
            case "📊":
                setActiveModal("POLL");
                break;
            case "💰":
                setActiveModal("BILL");
                break;
            case "📍":
                chatApi.sendMessage(
                    Number(roomId),
                    currentUser.email,
                    currentUser.userId, // ✅ 인자 추가됨
                    "📍 모임 장소 확인하세요.",
                    "LOCATION",
                    { placeName: "여의도 한강공원", lat: 37.5271, lng: 126.9328 }
                );
                toast.success("장소 정보를 전송했습니다.");
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

    const scrollToBottom = () => {
        if (page === 0) { // ✅ 첫 페이지 로드나 새 메시지일 때만 아래로 스크롤
            messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const renderMessages = () => {
        let lastDateLabel = "";
        const uniqueMessages = messages.reduce((acc, msg) => {
            if (!acc.find(m => m.messageId === msg.messageId)) {
                acc.push(msg);
            }
            return acc;
        }, [] as typeof messages);
        return uniqueMessages.map((msg, idx) => {
            const msgDate = msg.sentAt ? new Date(msg.sentAt) : new Date();
            if (isNaN(msgDate.getTime())) return null;

            const dateLabel = msgDate.toLocaleDateString("ko-KR", {
                year: 'numeric', month: 'long', day: 'numeric'
            });

            const showDateDivider = lastDateLabel !== dateLabel;
            lastDateLabel = dateLabel;

            const isMine = Number(msg.senderId) === Number(currentUser?.userId);

            return (
                <React.Fragment key={`msg-${msg.messageId}-${idx}`}>
                    {showDateDivider && (
                        <div className="date-divider" key={`date-${dateLabel}`}>
                            <span>{dateLabel}</span>
                        </div>
                    )}
                    <div className={`message-row ${isMine ? 'mine' : 'others'}`}>
                        <ChatMessageItem message={msg} isMine={isMine} />
                    </div>
                </React.Fragment>
            );
        });
    };



    return (
        <div className="chat-room-container">
            <header className="header">
                <div className="header-content">
                    <button className="back-btn" onClick={() => navigate("/")} style={{ cursor: "pointer" }}>
                        ←
                    </button>
                    <div className="header-info">
                        <div className="room-title">🌅 {roomTitle}</div>
                        <div className="room-meta">{members.length}명 참여중</div>
                    </div>
                    <div className="header-actions">
                        <button className="icon-btn">🔔</button>
                        <button className="icon-btn" onClick={() => setIsMenuOpen(true)}>☰</button>
                    </div>
                </div>
            </header>

            {/* ✅ 공지사항 배너 */}
            <div className="notice-banner">
                <span className="notice-icon">📢</span>
                <span className="notice-text">모임 D-2! 여의도 한강공원 물빛광장에서 만나요</span>
            </div>

            {/* ✅ AI 추천 배너 (그라데이션 디자인) */}
            <div className="ai-banner" onClick={showAIRecommendation}>
                <span style={{ fontSize: "2rem" }}>🤖</span>
                <div className="ai-banner-content">
                    <div className="ai-banner-title">AI 장소 추천</div>
                    <div className="ai-banner-subtitle">날씨와 분위기에 맞는 최적의 장소를 추천해드려요</div>
                </div>
                <span>→</span>
            </div>

            <main className="chat-container"
                  ref={chatContainerRef}
                  onScroll={handleScroll}
                  style={{paddingBottom: '5header0px'}}
            >
                {isLoading && <div className="loading-spinner">과거 메시지 로드 중...</div>}
                {renderMessages()}
                <div ref={messageEndRef} />
            </main>

            <footer className="input-area">
                <div className="quick-actions">
                    <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        accept="image/*"
                        onChange={handleImageSelect}
                    />
                    <button className="quick-btn" onClick={() => handleFeatureAction("📷")}>📷</button>
                    <button className="quick-btn" onClick={() => setActiveModal("POLL")}>📊</button>
                    <button className="quick-btn" onClick={() => handleFeatureAction("📍")}>📍</button>
                    <button className="quick-btn" onClick={() => setActiveModal("BILL")}>💰</button>
                </div>
                <input
                    className="message-input"
                    placeholder="메시지를 입력하세요..."
                    value={inputValue} // state와 동기화
                    onChange={(e) => setInputValue(e.target.value)} // 입력 시 state 업데이트
                    onKeyPress={(e) => {
                        if (e.key === "Enter") {
                            e.preventDefault(); // 엔터 시 줄바꿈 방지
                            handleSendMessage();
                        }
                    }}
                />
                <button
                    className="send-btn"
                    onClick={handleSendMessage}
                    style={{
                        cursor: inputValue.trim() ? 'pointer' : 'default',
                        opacity: inputValue.trim() ? 1 : 0.6 // 내용 없을 때 시각적 피드백
                    }}
                >
                    ➤
                </button>
            </footer>

            {/* ✅ 정산 입력 모달 */}
            {activeModal === "BILL" && (
                <BillInputModal
                    onClose={() => setActiveModal(null)}
                    onSubmit={(data: BillData) => handleFeatureSubmit("BILL", data)}
                    members={roomMembers || []}
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
                <>
                    <div className="overlay active" onClick={() => setIsMenuOpen(false)}></div>
                    <div className="side-menu active">
                        <div className="menu-header">
                            <div className="menu-title">모임 정보</div>
                            <button className="close-btn" onClick={() => setIsMenuOpen(false)}>×</button>
                        </div>
                        <div className="menu-section">
                            <div className="section-title">참여 멤버 ({members.length}명)</div>
                            <ChatMemberList
                                members={members}
                                onFollow={handleFollow}
                                onReport={(id, name) => setReportTarget({ id, name })}
                            />
                        </div>
                        {/* ✅ 사이드바 하단 모임 관리 버튼 추가 (image_a85aa1.png 디자인 반영) */}
                        <div className="menu-section admin-actions">
                            <button className="menu-btn"><span className="icon">⚙️</span> 모임 정보 수정</button>
                            <button className="menu-btn"><span className="icon">📢</span> 공지사항 수정</button>
                            <button className="menu-btn"><span className="icon">📄</span> 모임 상세보기</button>
                            <button className="menu-btn"><span className="icon">➕</span> 멤버 초대</button>
                        </div>
                        <div className="menu-section">
                            <button className="menu-btn danger" onClick={() => { if(confirm('방을 나가시겠습니까?')) window.history.back(); }}>🚪 톡방 나가기</button>
                        </div>
                    </div>
                </>
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