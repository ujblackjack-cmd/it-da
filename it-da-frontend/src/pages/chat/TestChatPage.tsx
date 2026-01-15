import React, { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/useAuthStore.ts";
import axios from "axios";
import "./ChatRoomPage.css";

interface ChatRoomResponse {
    chatRoomId: number;
    roomName: string;
    participantCount: number;
    maxParticipants: number;
    lastMessage: string | null;
    lastMessageTime: string | null;
    category: string | null;
    imageUrl: string | null;
    locationName: string | null;
}

const TestChatPage: React.FC = () => {
    const { user } = useAuthStore();
    const [rooms, setRooms] = useState<ChatRoomResponse[]>([]);
    const [newRoomName, setNewRoomName] = useState("");
    const [loading, setLoading] = useState(false);

    // ✅ 누락된 상태값 추가: 현재 선택된 방 ID
    const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);

    // 채팅방 목록 조회
    const fetchRooms = async () => {
        try {
            const response = await axios.get("http://localhost:8080/api/social/chat/rooms", {
                params: { userId: user?.userId },
                withCredentials: true,
            });
            console.log("📋 채팅방 목록 응답:", response.data);

            // ✅ 응답이 객체 형태라면 필드를 찾아 배열로 설정 (백엔드 구조에 맞춰 유연하게 처리)
            const roomData = Array.isArray(response.data) ? response.data : (response.data.content || []);
            setRooms(roomData);
        } catch (error) {
            console.error("❌ 채팅방 목록 조회 실패:", error);
            setRooms([]); // 에러 시 빈 배열로 초기화하여 .map 에러 방지
        }
    };

    // 채팅방 생성
    const createRoom = async () => {
        if (!newRoomName.trim()) {
            alert("채팅방 이름을 입력하세요");
            return;
        }

        setLoading(true);
        try {
            const response = await axios.post(
                "http://localhost:8080/api/social/chat/rooms",
                { roomName: newRoomName },
                { withCredentials: true }
            );
            console.log("✅ 채팅방 생성 성공:", response.data);
            setNewRoomName("");
            fetchRooms(); // 목록 새로고침
        } catch (error) {
            console.error("❌ 채팅방 생성 실패:", error);
            alert("채팅방 생성에 실패했습니다");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            fetchRooms();
        }
    }, [user]);

    if (!user) {
        return (
            <div style={{ padding: "20px", textAlign: "center" }}>
                <h2>로그인이 필요합니다</h2>
                <button onClick={() => (window.location.href = "/login")}>
                    로그인하기
                </button>
            </div>
        );
    }

    return (
        <div style={{ padding: "20px", maxWidth: "800px", margin: "0 auto" }}>
            <h1>채팅 테스트 페이지</h1>

            {/* 사용자 정보 섹션 */}
            <div style={{ backgroundColor: "#f0f0f0", padding: "15px", borderRadius: "8px", marginBottom: "20px" }}>
                <h3>현재 로그인 정보</h3>
                <p>이메일: {user.email}</p>
                <p>이름: {user.username}</p>
                <p>닉네임: {user.nickname || "없음"}</p>
            </div>

            {/* 채팅방 생성 섹션 */}
            <div style={{ backgroundColor: "#e3f2fd", padding: "20px", borderRadius: "8px", marginBottom: "20px" }}>
                <h3>채팅방 생성</h3>
                <div style={{ display: "flex", gap: "10px" }}>
                    <input
                        type="text"
                        value={newRoomName}
                        onChange={(e) => setNewRoomName(e.target.value)}
                        placeholder="채팅방 이름을 입력하세요"
                        style={{ flex: 1, padding: "10px", fontSize: "16px", border: "1px solid #ddd", borderRadius: "5px" }}
                        onKeyPress={(e) => e.key === "Enter" && createRoom()}
                    />
                    <button onClick={createRoom} disabled={loading} style={{ padding: "10px 20px", fontSize: "16px", backgroundColor: "#2196F3", color: "white", border: "none", borderRadius: "5px", cursor: loading ? "not-allowed" : "pointer" }}>
                        {loading ? "생성 중..." : "생성"}
                    </button>
                </div>
            </div>

            {/* 채팅방 목록 섹션 */}
            <h3>내 채팅방 목록</h3>
            <div className="rooms-list" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {rooms.map((room) => (
                    <div
                        key={room.chatRoomId}
                        className={`room-item ${selectedRoomId === room.chatRoomId ? 'active' : ''}`}
                        onClick={() => setSelectedRoomId(room.chatRoomId)}
                        style={{
                            padding: "15px",
                            backgroundColor: selectedRoomId === room.chatRoomId ? "#f0f4ff" : "#fff",
                            border: "1px solid #ddd",
                            borderRadius: "12px",
                            cursor: "pointer",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center"
                        }}
                    >
                        <div className="room-info" style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <h4 style={{ margin: 0 }}>{room.roomName}</h4>
                                {/* ✅ 추가된 카테고리 배지 표시 */}
                                {room.category && (
                                    <span style={{ fontSize: "10px", backgroundColor: "#e0e7ff", color: "#4338ca", padding: "2px 6px", borderRadius: "4px" }}>
                                        {room.category}
                                    </span>
                                )}
                            </div>

                            {/* ✅ 장소 및 인원 정보 (2/10명) 표시 */}
                            <p style={{ margin: "5px 0", fontSize: "13px", color: "#666" }}>
                                📍 {room.locationName || "장소 미정"} | 👥 {room.participantCount}/{room.maxParticipants}명
                            </p>

                            {/* ✅ 마지막 메시지 및 시간 표시 */}
                            <p style={{ margin: 0, fontSize: "12px", color: "#999", fontStyle: "italic" }}>
                                {room.lastMessage ? `💬 ${room.lastMessage}` : "최근 메시지가 없습니다."}
                                {room.lastMessageTime && ` (${new Date(room.lastMessageTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})})`}
                            </p>
                        </div>

                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                window.location.href = `/chat/${room.chatRoomId}`;
                            }}
                            style={{
                                marginLeft: "15px",
                                padding: "8px 16px",
                                backgroundColor: "#667eea",
                                color: "white",
                                border: "none",
                                borderRadius: "6px",
                                cursor: "pointer",
                                fontWeight: "600"
                            }}
                        >
                            입장
                        </button>
                    </div>
                ))}

                {/* 방이 없을 때 표시 */}
                {(!rooms || rooms.length === 0) && (
                    <div style={{ textAlign: 'center', padding: '30px', color: '#999', backgroundColor: '#fff', borderRadius: '8px', border: '1px dashed #ccc' }}>
                        참여 중인 채팅방이 없습니다. 모임에 가입하거나 방을 새로 생성해 보세요!
                    </div>
                )}
            </div>
        </div>
    );
};

export default TestChatPage;