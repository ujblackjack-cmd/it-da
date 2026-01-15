// src/components/chat/ChatRoomGrid.tsx

import { useNavigate } from 'react-router-dom';
import './ChatRoomGrid.css'; // HomePage.css와 별도로 관리하거나 통합 가능

interface Meeting {
    meetingId: number;
    title: string;
    category: string;
    locationName: string;
    meetingTime: string;
    maxParticipants: number;
    currentParticipants: number;
    vibe: string;
    imageUrl?: string;
}

interface ChatRoomGridProps {
    meetings?: Meeting[];
}

const ChatRoomGrid = ({ meetings = [] }: ChatRoomGridProps) => {
    const navigate = useNavigate();

    // ✅ HTML 파일 스타일의 날짜 포맷 (예: 1/5 (일) 17:00)
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
        return `${date.getMonth() + 1}/${date.getDate()} (${dayNames[date.getDay()]}) ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    };

    // ✅ 카테고리별 기본 이미지 로직 유지
    const getDefaultImage = (category: string) => {
        const images: Record<string, string> = {
            '스포츠': 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=400',
            '맛집': 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400',
            '카페': 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400',
            '문화예술': 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=400',
            '스터디': 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400',
            '취미활동': 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=400',
            '소셜': 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=400',
        };
        return images[category] || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400';
    };

    if (meetings.length === 0) {
        return <div className="empty-state">진행 중인 채팅방이 없습니다.</div>;
    }

    return (
        <div className="chatroom-grid">
            {meetings.map((meeting) => (
                <div
                    key={meeting.meetingId}
                    className="chatroom-card"
                    onClick={() => navigate(`/meetings/${meeting.meetingId}`)}
                >
                    {/* ✅ 이미지 및 LIVE 배지 영역 */}
                    <div className="chatroom-image-container">
                        <img
                            src={meeting.imageUrl || getDefaultImage(meeting.category)}
                            alt={meeting.title}
                            className="chatroom-image"
                        />
                        <div className="live-badge">🔥 LIVE</div>
                    </div>

                    <div className="chatroom-content">
                        <h3 className="chatroom-title">{meeting.title}</h3>
                        <p className="chatroom-meta">
                            📍 {meeting.locationName} | ⏰ {formatDate(meeting.meetingTime)}
                        </p>

                        {/* ✅ 참가자 아바타 겹치기 효과 */}
                        <div className="chatroom-participants">
                            {Array.from({ length: Math.min(meeting.currentParticipants, 4) }).map((_, i) => (
                                <div key={i} className="participant-avatar" />
                            ))}
                            {meeting.currentParticipants > 4 && (
                                <span className="participant-count">+{meeting.currentParticipants - 4}명</span>
                            )}
                        </div>

                        <div className="chatroom-tags">
                            <span className="tag-badge">#{meeting.category}</span>
                            <span className="tag-badge">#{meeting.vibe}</span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default ChatRoomGrid;