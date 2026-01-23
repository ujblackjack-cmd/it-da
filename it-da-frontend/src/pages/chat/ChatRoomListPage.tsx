import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/api/axios.config";
import "./ChatRoomListPage.css";

// 날짜/시간 포맷팅 함수
const formatChatTime = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();

    if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return `${date.getMonth() + 1}월 ${date.getDate()}일`;
};

interface ChatRoom {
    chatRoomId: number;
    roomName: string;
    lastMessage: string;
    lastMessageTime: string;
    participantCount: number;
    maxParticipants: number;
    category: string;
}

const ChatRoomListPage = () => {
    // ✅ 에러 해결: setMyRooms 상태 선언
    const [myRooms, setMyRooms] = useState<ChatRoom[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchMyRooms = async () => {
            try {
                // ✅ 백엔드 컨트롤러의 @GetMapping("/my-rooms") 호출
                const response = await api.get("/social/chat/my-rooms");
                setMyRooms(response.data);
            } catch (error) {
                console.error("내 채팅 목록 로드 실패:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchMyRooms();
    }, []);

    if (loading) {
        return (
            <div className="chat-loading-wrapper">
                <div className="chat-spinner"></div>
                <p>채팅 목록을 불러오는 중...</p>
            </div>
        );
    }

    return (
        <div className="chat-page-container">
            <header className="chat-page-header">
                <h2 className="chat-page-title">채팅</h2>
            </header>

            <div className="chat-list-wrapper">
                {myRooms.length > 0 ? (
                    myRooms.map((room) => (
                        <div
                            key={room.chatRoomId}
                            className="chat-room-card"
                            onClick={() => navigate(`/chat/${room.chatRoomId}`)}
                        >
                            <div className="chat-room-avatar">
                                {room.roomName.substring(0, 1)}
                            </div>
                            <div className="chat-room-info">
                                <div className="chat-room-header">
                                    <span className="chat-room-name">{room.roomName}</span>
                                    <span className="chat-room-count">{room.participantCount}</span>
                                    <span className="chat-room-time">{formatChatTime(room.lastMessageTime)}</span>
                                </div>
                                <div className="chat-room-footer">
                                    <p className="chat-room-last-msg">{room.lastMessage}</p>
                                    <span className="chat-room-category">{room.category}</span>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="chat-list-empty">
                        <p>참여 중인 채팅방이 없습니다.</p>
                        <button className="chat-explore-btn" onClick={() => navigate("/social/rooms/explore")}>
                            모임 탐색하기
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatRoomListPage;