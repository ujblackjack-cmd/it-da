import React, { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/useAuthStore.ts";
import axios from "axios";

const TestChatPage: React.FC = () => {
    const { user } = useAuthStore();
    const [rooms, setRooms] = useState<any[]>([]);
    const [newRoomName, setNewRoomName] = useState("");
    const [loading, setLoading] = useState(false);

    // 채팅방 목록 조회
    const fetchRooms = async () => {
        try {
            const response = await axios.get("http://localhost:8080/api/social/chat/rooms", {
                params:{userId:user?.userId},
                withCredentials: true,
            });
            console.log("📋 채팅방 목록:", response.data);
            setRooms(response.data);
        } catch (error) {
            console.error("❌ 채팅방 목록 조회 실패:", error);
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

            {/* 사용자 정보 */}
            <div style={{
                backgroundColor: "#f0f0f0",
                padding: "15px",
                borderRadius: "8px",
                marginBottom: "20px"
            }}>
                <h3>현재 로그인 정보</h3>
                <p>이메일: {user.email}</p>
                <p>이름: {user.username}</p>
                <p>닉네임: {user.nickname || "없음"}</p>
            </div>

            {/* 채팅방 생성 */}
            <div style={{
                backgroundColor: "#e3f2fd",
                padding: "20px",
                borderRadius: "8px",
                marginBottom: "20px"
            }}>
                <h3>채팅방 생성</h3>
                <div style={{ display: "flex", gap: "10px" }}>
                    <input
                        type="text"
                        value={newRoomName}
                        onChange={(e) => setNewRoomName(e.target.value)}
                        placeholder="채팅방 이름을 입력하세요"
                        style={{
                            flex: 1,
                            padding: "10px",
                            fontSize: "16px",
                            border: "1px solid #ddd",
                            borderRadius: "5px",
                        }}
                        onKeyPress={(e) => e.key === "Enter" && createRoom()}
                    />
                    <button
                        onClick={createRoom}
                        disabled={loading}
                        style={{
                            padding: "10px 20px",
                            fontSize: "16px",
                            backgroundColor: "#2196F3",
                            color: "white",
                            border: "none",
                            borderRadius: "5px",
                            cursor: loading ? "not-allowed" : "pointer",
                        }}
                    >
                        {loading ? "생성 중..." : "생성"}
                    </button>
                </div>
            </div>

            {/* 채팅방 목록 */}
            <div>
                <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "15px"
                }}>
                    <h3>채팅방 목록 ({rooms.length}개)</h3>
                    <button
                        onClick={fetchRooms}
                        style={{
                            padding: "8px 15px",
                            backgroundColor: "#4CAF50",
                            color: "white",
                            border: "none",
                            borderRadius: "5px",
                            cursor: "pointer",
                        }}
                    >
                        새로고침
                    </button>
                </div>

                {rooms.length === 0 ? (
                    <div style={{
                        textAlign: "center",
                        padding: "40px",
                        backgroundColor: "#f9f9f9",
                        borderRadius: "8px"
                    }}>
                        <p>생성된 채팅방이 없습니다.</p>
                        <p>위에서 새로운 채팅방을 만들어보세요!</p>
                    </div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        {rooms.map((room) => (
                            <div
                                key={room.id}
                                style={{
                                    padding: "15px",
                                    backgroundColor: "#fff",
                                    border: "1px solid #ddd",
                                    borderRadius: "8px",
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                }}
                            >
                                <div>
                                    <h4 style={{ margin: "0 0 5px 0" }}>{room.roomName}</h4>
                                    <p style={{ margin: 0, fontSize: "14px", color: "#666" }}>
                                        ID: {room.id}
                                    </p>
                                </div>
                                <button
                                    onClick={() => (window.location.href = `/chat/${room.id}`)}
                                    style={{
                                        padding: "10px 20px",
                                        backgroundColor: "#FF9800",
                                        color: "white",
                                        border: "none",
                                        borderRadius: "5px",
                                        cursor: "pointer",
                                    }}
                                >
                                    입장하기
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default TestChatPage;