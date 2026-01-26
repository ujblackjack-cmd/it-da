import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/api/axios.config";
import "./ChatRoomListModal.css";

interface ChatRoom {
  chatRoomId: number;
  roomName: string;
  lastMessage: string;
  lastMessageTime: string;
  participantCount: number;
  maxParticipants: number;
  category: string;
}

interface ChatRoomListModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const formatChatTime = (dateString: string) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();

  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
};

const ChatRoomListModal: React.FC<ChatRoomListModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [myRooms, setMyRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isOpen) return;

    const fetchMyRooms = async () => {
      try {
        setLoading(true);
        const response = await api.get("/social/chat/my-rooms");
        setMyRooms(response.data);
      } catch (error) {
        console.error("내 채팅 목록 로드 실패:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMyRooms();
  }, [isOpen]);

  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleRoomClick = (roomId: number) => {
    onClose();
    navigate(`/chat/${roomId}`);
  };

  return (
    <div className="chat-modal-overlay" onClick={onClose}>
      <div className="chat-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* 헤더 */}
        <div className="chat-modal-header">
          <h2 className="chat-modal-title">💬 모임톡</h2>
          <button className="chat-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* 내용 */}
        <div className="chat-modal-body">
          {loading ? (
            <div className="chat-modal-loading">
              <div className="spinner"></div>
              <p>채팅방 목록을 불러오는 중...</p>
            </div>
          ) : myRooms.length > 0 ? (
            <div className="chat-room-list">
              {myRooms.map((room) => (
                <div
                  key={room.chatRoomId}
                  className="chat-room-item"
                  onClick={() => handleRoomClick(room.chatRoomId)}
                >
                  <div className="chat-room-avatar">
                    {room.roomName.substring(0, 1)}
                  </div>
                  <div className="chat-room-info">
                    <div className="chat-room-header">
                      <span className="chat-room-name">{room.roomName}</span>
                      <span className="chat-room-count">
                        {room.participantCount}명
                      </span>
                      <span className="chat-room-time">
                        {formatChatTime(room.lastMessageTime)}
                      </span>
                    </div>
                    <div className="chat-room-footer">
                      <p className="chat-room-last-msg">{room.lastMessage}</p>
                      <span className="chat-room-category">
                        {room.category}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="chat-modal-empty">
              <p>참여 중인 채팅방이 없습니다</p>
              <button
                className="explore-btn"
                onClick={() => {
                  onClose();
                  navigate("/meetings");
                }}
              >
                모임 찾아보기
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatRoomListModal;
