import { useNavigate } from 'react-router-dom';
import './RecentItems.css';

interface RecentItem {
    id: number;
    icon: string;
    title: string;
    time: string;
    type: 'chat' | 'meeting';
    imageUrl?: string;  // ✅ 이미지 URL 추가
    category?: string;  // ✅ 카테고리 추가
}

interface RecentItemsProps {
    items: RecentItem[];
}

const RecentItems = ({ items }: RecentItemsProps) => {
    const navigate = useNavigate();

    const handleClick = (item: RecentItem) => {
        // ✅ 모임 상세 페이지로 이동
        navigate(`/meetings/${item.id}`);
    };

    return (
        <div className="recent-section">
            <div className="section-header">
                {/* ✅ 타이틀 변경: "최근 본 모임" */}
                <h2 className="section-title">👀 최근 본 모임</h2>
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
