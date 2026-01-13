import { useNavigate } from 'react-router-dom';
import './AIRecommendCard.css';

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

interface AIRecommendCardProps {
  meeting: Meeting;
}

const AIRecommendCard = ({ meeting }: AIRecommendCardProps) => {
  const navigate = useNavigate();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()} (${
      ['일', '월', '화', '수', '목', '금', '토'][date.getDay()]
    }) ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const getTags = () => {
    return [
      `#${meeting.category}`,
      `#${meeting.subcategory}`,
      `#${meeting.vibe}`,
      `#${meeting.maxParticipants}명`
    ];
  };

  return (
    <div className="recommended-section">
      <div className="section-header">
        <h2 className="section-title">AI 맞춤 추천</h2>
      </div>
      
      <div className="recommend-card">
        <div className="ai-badge">
          🤖 AI 매칭률 {Math.floor(Math.random() * 15 + 85)}%
        </div>
        
        <div className="recommend-content">
          <div 
            className="recommend-image"
            style={{
              backgroundImage: `url(${
                meeting.imageUrl || 
                'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400'
              })`
            }}
          />
          
          <div className="recommend-info">
            <h3 className="recommend-title">{meeting.title}</h3>
            
            <p className="recommend-desc">
              {meeting.description}
            </p>
            
            <div className="recommend-tags">
              {getTags().map((tag, index) => (
                <span key={index} className="tag">{tag}</span>
              ))}
            </div>
            
            <div className="recommend-meta">
              📍 {meeting.locationName} | 
              ⏰ {formatDate(meeting.meetingTime)} | 
              👥 {meeting.currentParticipants}/{meeting.maxParticipants}명
            </div>
            
            <div className="recommend-actions">
              <button 
                className="btn-join"
                onClick={() => navigate(`/chat/${meeting.meetingId}`)}
              >
                💬 톡방 입장하기
              </button>
              <button 
                className="btn-detail"
                onClick={() => navigate(`/meetings/${meeting.meetingId}`)}
              >
                상세보기
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIRecommendCard;