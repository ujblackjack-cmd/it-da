import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import './CreateChatRoom.css';
import api from '@/api/axios.config'

interface RoomData {
    roomName: string;
    maxParticipants: number;
    category: string;
    description: string;
    meetingDate: string;
    location: string;
}

const CreateChatRoom: React.FC = () => {
    const navigate = useNavigate();
    const [isAiMode, setIsAiMode] = useState(true); // 기본값: AI 추천 모드
    const [formData, setFormData] = useState<RoomData>({
        roomName: "",
        maxParticipants: 10,
        category: "일반",
        description: "",
        meetingDate: "",
        location: ""
    });

    // AI 매칭 데이터 로드 시뮬레이션
    useEffect(() => {
        if (isAiMode) {
            // 실제 구현 시 AI API에서 받아온 데이터를 세팅
            const aiRecommendation = {
                roomName: "🌅 한강 선셋 러닝 모임",
                maxParticipants: 8,
                category: "운동/건강",
                description: "AI가 추천한 최적의 러닝 코스에서 함께 달려요!",
                meetingDate: "2026-01-25T18:00",
                location: "여의도 한강공원 물빛광장"
            };
            setFormData(aiRecommendation);
            toast.success("AI가 최적의 모임 설정을 추천했습니다! ✨");
        }
    }, [isAiMode]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // 1. 실제 백엔드 API 호출
            const response = await api.post('/social/chat/rooms', formData);
            const newRoomId = response.data.chatRoomId;

            // 2. 성공 시 등록 완료 페이지로 이동하며 생성된 정보를 전달합니다.
            navigate(`/social/chat/success?title=${encodeURIComponent(formData.roomName)}&roomId=${newRoomId}`);
            toast.success("모임이 생성되었습니다! 🎉");
        } catch (error) {
            console.error("방 생성 실패:", error);
            toast.error("방 생성에 실패했습니다.");
        }
    };

    return (
        <div className="create-room-container">
            <header className="create-header">
                <button onClick={() => navigate(-1)}>←</button>
                <h2>모임 만들기</h2>
            </header>

            <div className="mode-toggle">
                <button
                    className={isAiMode ? "active" : ""}
                    onClick={() => setIsAiMode(true)}
                >
                    🤖 AI 추천 모드
                </button>
                <button
                    className={!isAiMode ? "active" : ""}
                    onClick={() => setIsAiMode(false)}
                >
                    ✍️ 직접 만들기
                </button>
            </div>

            <form onSubmit={handleSubmit} className="room-form">
                <section className="form-section">
                    <label>톡방 이름</label>
                    <input
                        type="text"
                        value={formData.roomName}
                        onChange={(e) => setFormData({...formData, roomName: e.target.value})}
                        placeholder="모임의 이름을 입력하세요"
                        disabled={isAiMode} // AI 모드일 때는 자동 입력 유지
                    />
                </section>

                <div className="form-row">
                    <section className="form-section">
                        <label>최대 인원</label>
                        <input
                            type="number"
                            value={formData.maxParticipants}
                            onChange={(e) => setFormData({...formData, maxParticipants: Number(e.target.value)})}
                            min={2} max={100}
                        />
                    </section>
                    <section className="form-section">
                        <label>카테고리</label>
                        <select
                            value={formData.category}
                            onChange={(e) => setFormData({...formData, category: e.target.value})}
                        >
                            <option>운동/건강</option>
                            <option>사교/인맥</option>
                            <option>문화/예술</option>
                            <option>일반</option>
                        </select>
                    </section>
                </div>

                <section className="form-section">
                    <label>모임 장소</label>
                    <input
                        type="text"
                        value={formData.location}
                        onChange={(e) => setFormData({...formData, location: e.target.value})}
                        placeholder="예: 여의도 한강공원"
                    />
                </section>

                <section className="form-section">
                    <label>모임 소개</label>
                    <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        placeholder="어떤 활동을 하는 모임인가요?"
                    />
                </section>

                <button type="submit" className="submit-btn">
                    {isAiMode ? "추천받은 정보로 만들기" : "모임 생성하기"}
                </button>
            </form>
        </div>
    );
};

export default CreateChatRoom;