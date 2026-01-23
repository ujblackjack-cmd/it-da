import { useNavigate } from 'react-router-dom';
import './RecentItems.css';

interface RecentItem {
  id: number;
  chatRoomId: number;
  icon: string;
  title: string;
  time: string;
  type: 'chat' | 'meeting';
}

interface RecentItemsProps {
  items: RecentItem[];
}

const RecentItems = ({ items }: RecentItemsProps) => {
  const navigate = useNavigate();

  const handleClick = (item: RecentItem) => {
    if (item.type === 'chat') {
        navigate(`/chat/${item.chatRoomId}`);
    } else {
      navigate(`/meetings/${item.id}`);
    }
  };

  return (
    <div className="recent-section">
      <div className="section-header">
        <h2 className="section-title">최근 접속한 채팅방 / 캐시글</h2>
      </div>
      
      <div className="recent-items">
        {items.map((item) => (
          <div 
            key={item.id}
            className="recent-item"
            onClick={() => handleClick(item)}
          >
            <div className="recent-icon">{item.icon}</div>
            <div className="recent-title">{item.title}</div>
            <div className="recent-meta">{item.time}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecentItems;