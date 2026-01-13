import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useChatStore } from "../../stores/useChatStore";
import { chatApi } from "../../api/chat.api";
import ChatInput from "../../components/chat/ChatInput";
import ChatMessageItem from "../../components/chat/ChatMessage";
import ChatMemberList from "../../components/chat/ChatMemberList";
import { useAuthStore } from "@/stores/useAuthStore";
import "./ChatRoomPage.css";

const ChatRoomPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const { messages, addMessage, setMessages } = useChatStore();
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const { user } = useAuthStore();

  useEffect(() => {
    const initChat = async () => {
      if (!roomId) return;
      const history = await chatApi.getChatMessages(Number(roomId));
      setMessages(history);
    };
    initChat();

    if (roomId && user?.email) {
      chatApi.connect(Number(roomId), user.email, (newMsg) => {
        addMessage(newMsg);
      });
    }

    return () => {
      chatApi.disconnect();
    };
  }, [roomId, user?.email, setMessages, addMessage]);

    const handleFeatureAction = (feature: string) => {
        if (!roomId || !user?.email) return;

        const rId = Number(roomId);
        switch (feature) {
            case "poll":
                // 기획: 구성원끼리 정할 때 사용하는 투표
                chatApi.sendMessage(rId, user.email, "📊 투표: 모임 요일을 정해주세요!", "POLL", {
                    options: ["토요일", "일요일"]
                });
                break;
            case "bill":
                // 기획: 모임 때 발생된 비용을 정산
                chatApi.sendMessage(rId, user.email, "💰 총 120,000원 정산 요청", "BILL", {
                    totalAmount: 120000,
                    perPerson: 20000
                });
                break;
            case "location":
                // 기획: 지도 API 이용 장소 표시
                chatApi.sendMessage(rId, user.email, "📍 장소: 여의도 한강공원", "LOCATION", {
                    lat: 37.5271, lng: 126.9328
                });
                break;
        }
    };
  return (
    <div className="chat-room-container">
      {" "}
      {/* ✅ 클래스 적용 */}
      <header className="chat-header">
        <h2>🌅 한강 선셋 피크닉</h2>
        <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="icon-btn">
          ☰
        </button>
      </header>
      <div className="notice-banner">
        📢 공지: 모임 D-2! 여의도 한강공원 물빛광장에서 만나요
      </div>
      <div className="message-list-area">
        {messages.map((msg, idx) => {
          const isMine = msg.senderEmail === user?.email;
          return (
            <div
              key={msg.id || idx}
              className={`message-row ${isMine ? "mine" : "others"}`}
            >
              <ChatMessageItem message={msg} isMine={isMine} />
              {msg.unreadCount !== undefined && msg.unreadCount > 0 && (
                <span className="unread-count">{msg.unreadCount}</span>
              )}
            </div>
          );
        })}
      </div>
      <div className="chat-input-wrapper">
        <ChatInput
          onSend={(text) => {
            if (roomId && user?.email)
              chatApi.sendMessage(Number(roomId), user.email, text, "TALK");
          }}
          onShowFeature={handleFeatureAction}
        />
      </div>
      {isMenuOpen && (
        <div className="side-menu-overlay">
          <ChatMemberList
            members={[]}
            onFollow={() => {}}
            onReport={() => {}}
          />
        </div>
      )}
    </div>
  );
};

export default ChatRoomPage;
