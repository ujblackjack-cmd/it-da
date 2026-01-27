import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useChatStore, type ChatMessage } from "@/stores/useChatStore.ts";
import { chatApi } from "@/api/chat.api.ts";
import ChatMessageItem from "../../components/chat/ChatMessage";
import ChatMemberList from "../../components/chat/ChatMemberList";
import { useAuthStore } from "@/stores/useAuthStore";
import toast from "react-hot-toast";
import ChatReportModal from "./ChatReportModal";
import { User } from "@/types/user.types.ts";
import "./ChatRoomPage.css";
import BillInputModal from "../../components/chat/BillInputModal";
import PollInputModal from "../../components/chat/PollInputModal";
import api from "@/api/axios.config";
import InviteMemberModal from "@/components/chat/InviteMemberModal.tsx";

// ... (Interface 정의는 동일하게 유지)
interface BillData {
  totalAmount: number;
  participantCount: number;
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
  isFollowing: boolean;
}

const ChatRoomPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const {
    messages,
    addMessage,
    setMessages,
    markAllAsRead,
    decrementUnreadCount,
  } = useChatStore();
  const [members, setMembers] = useState<User[]>([]);
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const { user: currentUser } = useAuthStore();
  const currentUserMemberInfo = useMemo(
    () => members.find((m) => m.userId === currentUser?.userId),
    [members, currentUser],
  );
  // 백엔드에서 ORGANIZER로 내려주는 값을 프론트에서 LEADER로 매핑 중이므로 아래와 같이 설정합니다.
  const isLeader = currentUserMemberInfo?.role === "LEADER";
  const isOrganizer = isLeader; // 방장에게 공지 권한 부여
  const [reportTarget, setReportTarget] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [activeModal, setActiveModal] = useState<"BILL" | "POLL" | null>(null);
  const [roomTitle, setRoomTitle] = useState<string>("채팅방");

  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [roomMembers, setRoomMembers] = useState<
    { userId: number; nickname: string }[]
  >([]);
  const [inputValue, setInputValue] = useState<string>("");
  const navigate = useNavigate();
  const [linkedMeetingId, setLinkedMeetingId] = useState<number | null>(null);

  const [notice, setNotice] = useState<string>("");
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  // 1️⃣ [수정됨] showAIRecommendation 함수를 return 문 밖(컴포넌트 로직 부분)으로 이동
  const showAIRecommendation = async () => {
    try {
      toast.loading("🤖 AI가 최적의 장소를 분석하고 있습니다...", {
        id: "ai-loading",
      });

      const response = await api.post("/ai/recommendations/recommend-place", {
        chatRoomId: Number(roomId),
      });

      toast.dismiss("ai-loading");

      if (!response.data.success || !response.data.recommendations?.length) {
        toast.error(response.data.message || "추천 가능한 장소가 없습니다.");
        return;
      }

      const places = response.data.recommendations;

      const message =
        `🤖 AI가 최적의 장소를 추천해드립니다!\n\n` +
        `📍 중간 지점: ${response.data.centroid?.address || "계산 완료"}\n\n` +
        places
          .map(
            (p: any, idx: number) =>
              `${idx + 1}. ${p.placeName} ⭐\n` +
              `   📍 ${p.address}\n` +
              `   🚶 중간지점에서 ${p.distanceKm?.toFixed(1) || 0}km\n` +
              `   💡 ${p.matchReasons?.join(", ") || "접근성이 좋아요"}`,
          )
          .join("\n\n");

      // 단순히 Toast만 띄우는 것이 아니라 채팅방에 메시지로 쏘고 싶다면 아래 주석 해제
      chatApi.sendMessage(
        Number(roomId),
        currentUser!.email,
        currentUser!.userId,
        message,
        "TALK",
        {},
      );

      toast(message, {
        duration: 8000,
        icon: "🤖",
      });
    } catch (error: any) {
        console.error("AI 추천 실패:", error);
        // 🚨 [수정] 500 에러 발생 시 데이터 부족 가능성 안내
        const errorMsg = error.response?.status === 500
            ? "주변에 적절한 장소가 없거나 위치 정보가 부족합니다."
            : "장소 추천을 불러올 수 없습니다.";
        toast.error(errorMsg);
        toast.dismiss("ai-loading");
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !roomId) return;

    try {
      setIsLoading(true);
      await chatApi.uploadImage(Number(roomId), file);
      toast.success("이미지를 전송했습니다.");
    } catch (error) {
      console.error("이미지 전송 실패:", error);
      toast.error("이미지 전송에 실패했습니다.");
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleScroll = async () => {
    if (!chatContainerRef.current || !hasMore || isLoading) return;

    if (chatContainerRef.current.scrollTop === 0) {
      setIsLoading(true);
      const previousHeight = chatContainerRef.current.scrollHeight;

      try {
        const oldMessages = await chatApi.getChatMessages(
          Number(roomId),
          page + 1,
          50,
        );

        if (oldMessages && oldMessages.length > 0) {
          const validatedOldMessages: ChatMessage[] = (
            oldMessages as any[]
          ).map((msg) => ({
            ...msg,
            senderNickname: msg.senderNickname || "사용자",
            unreadCount: Number(msg.unreadCount ?? 0),
            sentAt: msg.sentAt || new Date().toISOString(),
          }));

          const combined = [...validatedOldMessages, ...messages];
          const uniqueMap = new Map();
          combined.forEach((msg) => {
            if (!uniqueMap.has(msg.messageId)) {
              uniqueMap.set(msg.messageId, msg);
            }
          });

          const uniqueSorted = Array.from(uniqueMap.values()).sort(
            (a, b) =>
              new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime(),
          );

          setMessages(uniqueSorted);
          setPage((prev) => prev + 1);

          setTimeout(() => {
            if (chatContainerRef.current) {
              chatContainerRef.current.scrollTop =
                chatContainerRef.current.scrollHeight - previousHeight;
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

  const handleFeatureSubmit = async (type: "BILL" | "POLL", data: any) => {
    if (!roomId || !currentUser?.email || !currentUser?.userId) {
      toast.error("로그인 세션이 만료되었습니다.");
      return;
    }

    try {
      if (type === "BILL") {
        const perPerson = Math.floor(data.totalAmount / data.participantCount);
        const updatedParticipants = data.participants.map((p: any) => ({
          ...p,
          isPaid: Number(p.userId) === Number(currentUser?.userId),
        }));
        const content = `💰 정산 요청: 1인당 ${perPerson.toLocaleString()}원`;
        const metadata = {
          ...data,
          participants: updatedParticipants,
          amountPerPerson: perPerson,
        };

        chatApi.sendMessage(
          Number(roomId),
          currentUser.email,
          currentUser.userId,
          content,
          type,
          metadata,
        );
      } else if (type === "POLL") {
        await api.post(
          `/votes/${roomId}`,
          {
            title: data.title,
            isAnonymous: data.isAnonymous || false,
            isMultipleChoice: data.isMultipleChoice || false,
            options: data.options,
          },
          { withCredentials: true },
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
      console.log("🔍 [ChatRoom] Initializing with RoomID:", roomId);

      try {
        try {
          const history = await chatApi.getChatMessages(Number(roomId), 0, 50);
          const validatedHistory: ChatMessage[] = (history as any[]).map(
            (msg) => ({
              ...msg,
              senderNickname: msg.senderNickname || "사용자",
              content: msg.content || "",
              unreadCount: Number(msg.unreadCount ?? 0),
              sentAt: msg.sentAt || new Date().toISOString(),
              type: msg.type as ChatMessage["type"],
              metadata: msg.metadata || null,
            }),
          );
          setMessages(validatedHistory);
        } catch (e) {
          console.error("❌ 메시지 로드 실패:", e);
        }

        try {
          await chatApi.markAsRead(Number(roomId), currentUser.email);
          markAllAsRead();
        } catch (e) {
          console.warn("⚠️ 읽음 처리 실패 (API 확인 필요):", e);
        }

        try {
          const rooms = await chatApi.getRooms();
          const currentRoom = rooms.find(
            (r: any) => r.chatRoomId === Number(roomId),
          );
          if (currentRoom) {
            setRoomTitle(currentRoom.roomName);
            if (currentRoom.meetingId) {
              setLinkedMeetingId(currentRoom.meetingId);
              console.log("🔗 연결된 모임 ID:", currentRoom.meetingId);
            }
            if (currentRoom.notice) {
              setNotice(currentRoom.notice);
            }
          }
        } catch (e) {
          console.warn("⚠️ 방 제목 로드 실패");
        }

        try {
          const rawMembers: RawMemberResponse[] = await chatApi.getRoomMembers(
            Number(roomId),
          );
          const formattedMembers: User[] = rawMembers.map(
            (m: RawMemberResponse) => ({
              id: m.userId,
              userId: m.userId,
              name: m.nickname?.trim() ? m.nickname : m.username,
              username: m.username,
              nickname: m.nickname,
              email: m.email,
              status: (m.status || "ACTIVE") as User["status"],
              createdAt: m.createdAt || new Date().toISOString(),
              updatedAt: m.updatedAt || new Date().toISOString(),
              profileImageUrl: m.profileImageUrl || "",
              role: m.role === "ORGANIZER" ? "LEADER" : "MEMBER",
              isFollowing: m.isFollowing,
            }),
          );
          setMembers(formattedMembers);
          setRoomMembers(
            rawMembers.map((m) => ({
              userId: m.userId,
              nickname: m.nickname?.trim() ? m.nickname : m.username,
            })),
          );
        } catch (e) {
          console.error("❌ 멤버 로드 실패:", e);
          setMembers([]);
        }
      } catch (e) {
        console.error("🚨 예상치 못한 치명적 오류:", e);
      }
        await fetchRoomMembers();
    };

    initChat();

    let isSubscribed = true;

    if (roomId && currentUser?.email) {
      chatApi.disconnect();

      chatApi.connect(
        Number(roomId),
        currentUser.email,
        (newMsg: any) => {
          if (!isSubscribed) return;

          if (newMsg.type === "BILL_UPDATE") {
            const targetId = Number(
              newMsg.targetMessageId || newMsg.metadata.messageId,
            );
            addMessage({
              ...newMsg,
              messageId: targetId,
              type: "BILL",
              metadata:
                typeof newMsg.metadata === "string"
                  ? JSON.parse(newMsg.metadata)
                  : newMsg.metadata,
            });
            return;
          }
          if (newMsg.type === "NOTICE") {
              fetchRoomMembers();
          }
          const serverCount = Number(newMsg.unreadCount ?? 0);

          const validatedMsg: ChatMessage = {
            ...newMsg,
            unreadCount: serverCount,
            senderNickname: newMsg.senderNickname || "사용자",
            sentAt: newMsg.sentAt || new Date().toISOString(),
            senderId: Number(newMsg.senderId),
            messageId: Number(newMsg.messageId) || Date.now(),
            metadata:
              typeof newMsg.metadata === "string"
                ? JSON.parse(newMsg.metadata)
                : newMsg.metadata,
          };

          addMessage(validatedMsg);
        },
        (readData: any) => {
          console.log("📖 읽음 이벤트 수신:", readData);
          if (currentUser && readData.email !== currentUser.email) {
            decrementUnreadCount();
          }
        },
      );
    }
    return () => {
      isSubscribed = false;
      chatApi.disconnect();
    };
  }, [roomId, currentUser, setMessages, markAllAsRead, decrementUnreadCount]);

    const fetchRoomMembers = async () => {
        if (!roomId) return;
        try {
            const rawMembers = await chatApi.getRoomMembers(Number(roomId));
            const formattedMembers: User[] = rawMembers.map((m: any) => ({
                id: m.userId,
                userId: m.userId,
                name: m.nickname?.trim() ? m.nickname : m.username,
                username: m.username,
                nickname: m.nickname,
                email: m.email,
                status: m.status || "ACTIVE",
                profileImageUrl: m.profileImageUrl || "",
                role: m.role === "ORGANIZER" ? "LEADER" : "MEMBER",
                isFollowing: m.isFollowing,
            }));
            setMembers(formattedMembers);
            console.log("🔄 멤버 목록 갱신 완료:", formattedMembers.length, "명");
        } catch (e) {
            console.error("멤버 목록 갱신 실패:", e);
        }
    };

  const handleEditMeeting = () => {
    if (!linkedMeetingId) {
      toast.error("연결된 모임 정보를 찾을 수 없습니다.");
      return;
    }
    navigate(`/meetings/${linkedMeetingId}/edit`);
  };

  const handleMeetingDetail = () => {
    if (!linkedMeetingId) {
      toast.error("연결된 모임 정보를 찾을 수 없습니다.");
      return;
    }
    navigate(`/meetings/${linkedMeetingId}`);
  };

  const handleSendMessage = () => {
    if (
      !roomId ||
      !currentUser?.email ||
      !currentUser?.userId ||
      !inputValue.trim()
    ) {
      if (!inputValue.trim()) return;
      toast.error("로그인 세션이 만료되었습니다.");
      return;
    }
    chatApi.sendMessage(
      Number(roomId),
      currentUser.email,
      currentUser.userId,
      inputValue,
      "TALK",
      {},
    );

    setInputValue("");
  };

  const handleFeatureAction = (feature: string) => {
    if (!roomId || !currentUser?.email) return;

    switch (feature) {
      case "📷":
        fileInputRef.current?.click();
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
          currentUser.userId,
          "📍 모임 장소 확인하세요.",
          "LOCATION",
          { placeName: "여의도 한강공원", lat: 37.5271, lng: 126.9328 },
        );
        toast.success("장소 정보를 전송했습니다.");
        break;
    }
  };

  const handleFollow = async (targetUserId: number) => {
    try {
      await chatApi.followUser(targetUserId);
      toast.success("팔로우가 완료되었습니다!");
      setMembers((prev) =>
        prev.map((m) =>
          m.userId === targetUserId ? { ...m, isFollowing: true } : m,
        ),
      );
    } catch (error) {
      console.error("팔로우 실패:", error);
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
    if (page === 0) {
      messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const renderMessages = () => {
    let lastDateLabel = "";
    const uniqueMessages = messages.reduce(
      (acc, msg) => {
        if (!acc.find((m) => m.messageId === msg.messageId)) {
          acc.push(msg);
        }
        return acc;
      },
      [] as typeof messages,
    );
    return uniqueMessages.map((msg, idx) => {
      const msgDate = msg.sentAt ? new Date(msg.sentAt) : new Date();
      if (isNaN(msgDate.getTime())) return null;

      const dateLabel = msgDate.toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
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
          <div className={`message-row ${isMine ? "mine" : "others"}`}>
            <ChatMessageItem message={msg} isMine={isMine} />
          </div>
        </React.Fragment>
      );
    });
  };

  const handleEditNotice = async () => {
    if (!isOrganizer) {
      toast.error("방장만 공지사항을 수정할 수 있습니다.");
      return;
    }
    const newNotice = prompt("새로운 공지사항을 입력하세요:", notice);
    if (newNotice === null) return;

    try {
      await chatApi.updateNotice(Number(roomId), newNotice);
      setNotice(newNotice);
      toast.success("공지사항이 등록되었습니다.");
    } catch (error) {
      console.error("공지 수정 실패:", error);
      toast.error("공지사항 등록에 실패했습니다.");
    }
  };

  return (
    <div className="chat-room-container">
      <header className="header">
        <div className="header-content">
          <button
            className="back-btn"
            onClick={() => navigate("/")}
            style={{ cursor: "pointer" }}
          >
            ←
          </button>
          <div className="header-info">
            <div className="room-title">🌅 {roomTitle}</div>
            <div className="room-meta">{members.length}명 참여중</div>
          </div>
          <div className="header-actions">
            <button className="icon-btn">🔔</button>
            <button className="icon-btn" onClick={() => setIsMenuOpen(true)}>
              ☰
            </button>
          </div>
        </div>
      </header>

      {/* ✅ 공지사항 배너 */}
      {notice && (
        <div className="notice-banner">
          <span className="notice-icon">📢</span>
          <span className="notice-text">{notice}</span>
        </div>
      )}

      {/* 2️⃣ [수정됨] 함수 호출을 위한 UI 배너 추가 (그라데이션 디자인) */}
      <div
        className="ai-recommendation-banner"
        style={{
            background: "linear-gradient(90deg, #6a11cb 0%, #2575fc 100%)",
            color: "white",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "1.2rem" }}>🤖</span>
          <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>
            어디서 만날지 고민되시나요?
          </span>
        </div>
        <button
          onClick={showAIRecommendation}
          style={{
            backgroundColor: "rgba(255,255,255,0.2)",
            border: "1px solid rgba(255,255,255,0.4)",
            color: "white",
            padding: "6px 12px",
            borderRadius: "20px",
            cursor: "pointer",
            fontSize: "0.85rem",
            fontWeight: "bold",
            backdropFilter: "blur(4px)",
          }}
        >
          AI 추천 받기
        </button>
      </div>

      <main
        className="chat-container"
        ref={chatContainerRef}
        onScroll={handleScroll}
        style={{ paddingBottom: "80px" }}
      >
        {isLoading && (
          <div className="loading-spinner">과거 메시지 로드 중...</div>
        )}
        {renderMessages()}
        <div ref={messageEndRef} />
      </main>

      <footer className="input-area">
        <div className="quick-actions">
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: "none" }}
            accept="image/*"
            onChange={handleImageSelect}
          />
          <button
            className="quick-btn"
            onClick={() => handleFeatureAction("📷")}
          >
            📷
          </button>
          <button className="quick-btn" onClick={() => setActiveModal("POLL")}>
            📊
          </button>
          <button
            className="quick-btn"
            onClick={() => handleFeatureAction("📍")}
          >
            📍
          </button>
          <button className="quick-btn" onClick={() => setActiveModal("BILL")}>
            💰
          </button>
        </div>
        <input
          className="message-input"
          placeholder="메시지를 입력하세요..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSendMessage();
            }
          }}
        />
        <button
          className="send-btn"
          onClick={handleSendMessage}
          style={{
            cursor: inputValue.trim() ? "pointer" : "default",
            opacity: inputValue.trim() ? 1 : 0.6,
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
          <div
            className="overlay active"
            onClick={() => setIsMenuOpen(false)}
          ></div>
          <div className="side-menu active">
            <div className="menu-header">
              <div className="menu-title">모임 정보</div>
              <button
                className="close-btn"
                onClick={() => setIsMenuOpen(false)}
              >
                ×
              </button>
            </div>
            <div className="menu-section">
              <div className="section-title">
                참여 멤버 ({members.length}명)
              </div>
              {/* ✅ ChatMemberList에 handleFollow 연결하여 ESLint 해결 */}
              <ChatMemberList
                members={members}
                onFollow={handleFollow}
                onReport={(id, name) => setReportTarget({ id, name })}
              />
            </div>
            <div className="menu-section admin-actions">
              {/* 3. 권한별 버튼 렌더링 조건부 처리 */}
              {isLeader && (
                <button className="menu-btn" onClick={handleEditMeeting}>
                  <span className="icon">⚙️</span> 모임 정보 수정
                </button>
              )}

              {/* 🚩 공지사항 수정: isOrganizer(LEADER)일 때만 노출 */}
              {isOrganizer && (
                <button className="menu-btn" onClick={handleEditNotice}>
                  <span className="icon">📢</span> 공지사항 수정
                </button>
              )}

              <button className="menu-btn" onClick={handleMeetingDetail}>
                <span className="icon">📄</span> 모임 상세보기
              </button>

              <button
                className="menu-btn"
                onClick={() => setIsInviteModalOpen(true)}
              >
                <span className="icon">➕</span> 멤버 초대
              </button>
              {isInviteModalOpen && (
                <InviteMemberModal
                  roomId={Number(roomId)}
                  onClose={() => setIsInviteModalOpen(false)}
                  onInviteCompleted={() => {
                    window.location.reload();
                  }}
                />
              )}
            </div>

            <div className="menu-section">
              <button
                className="menu-btn danger"
                onClick={() => {
                  if (confirm("방을 나가시겠습니까?")) window.history.back();
                }}
              >
                🚪 톡방 나가기
              </button>
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
