// src/components/ChatRoomGrid.tsx

import { useNavigate } from 'react-router-dom';
import './ChatRoomGrid.css';

interface Meeting {
  meetingId: number;
  title: string;
  description: string;
  category: string;
  subcategory: string;
  locationName: string;
  meetingTime: string;
  maxParticipants: number;
  currentParticipants: number;
  expectedCost: number;
  vibe: string;
  imageUrl?: string;
  avgRating?: number;
}

interface ChatRoomGridProps {
  meetings?: Meeting[];  // ✅ optional로 변경
}

const ChatRoomGrid = ({ meetings = [] }: ChatRoomGridProps) => {  // ✅ 기본값 설정
  const navigate = useNavigate();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()} (${
      ['일', '월', '화', '수', '목', '금', '토'][date.getDay()]
    }) ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

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

  const generateParticipants = (count: number) => {
    return Array.from({ length: Math.min(count, 4) }, (_, i) => (
      <div key={i} className="participant-avatar" />
    ));
  };

  const isLive = (currentCount: number, maxCount: number) => {
    return currentCount > 0 && currentCount < maxCount;
  };

  if (meetings.length === 0) {
    return (
      <div className="empty-state">
        <p>진행 중인 채팅방이 없습니다</p>
      </div>
    );
  }

  return (
    <div className="chatroom-grid">
      {meetings.map((meeting) => (
        <div 
          key={meeting.meetingId}
          className="chatroom-card"
          onClick={() => navigate(`/meetings/${meeting.meetingId}`)}
        >
          <div 
            className="chatroom-image"
            style={{
              backgroundImage: `url(${meeting.imageUrl || getDefaultImage(meeting.category)})`
            }}
          >
            {isLive(meeting.currentParticipants, meeting.maxParticipants) && (
              <div className="live-badge">🔥 LIVE</div>
            )}
          </div>
          
          <div className="chatroom-content">
            <h3 className="chatroom-title">{meeting.title}</h3>
            <p className="chatroom-meta">
              📍 {meeting.locationName} | ⏰ {formatDate(meeting.meetingTime)}
            </p>
            
            <div className="chatroom-participants">
              {generateParticipants(meeting.currentParticipants)}
              {meeting.currentParticipants > 4 && (
                <span className="participant-count">
                  +{meeting.currentParticipants - 4}명
                </span>
              )}
            </div>
            
            <div className="chatroom-tags">
              <span className="tag">#{meeting.category}</span>
              <span className="tag">#{meeting.vibe}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ChatRoomGrid;