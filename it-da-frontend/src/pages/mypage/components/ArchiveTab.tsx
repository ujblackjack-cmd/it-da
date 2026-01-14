import React from 'react';
import './ArchiveTab.css';

interface Badge {
    id: number;
    icon: string;
    name: string;
    description: string;
    isUnlocked: boolean;
}

interface Activity {
    id: number;
    date: string;
    title: string;
    description: string;
    icon: string;
}

interface Props {
    badges: Badge[];
    activities: Activity[];
}

const ArchiveTab: React.FC<Props> = ({ badges, activities }) => {
    return (
        <div className="archive-tab">
            <div className="archive-section">
                <h3 className="archive-title">🏆 획득한 배지</h3>
                <div className="badge-grid">
                    {badges.map((badge) => (
                        <div
                            key={badge.id}
                            className={`badge-card ${!badge.isUnlocked ? 'locked' : ''}`}
                        >
                            <div className="badge-icon">{badge.icon}</div>
                            <div className="badge-name">{badge.name}</div>
                            <div className="badge-desc">{badge.description}</div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="archive-section">
                <h3 className="archive-title">📖 활동 기록</h3>
                <div className="timeline">
                    {activities.map((activity) => (
                        <div key={activity.id} className="timeline-item">
                            <div className="timeline-icon">{activity.icon}</div>
                            <div className="timeline-content">
                                <div className="timeline-date">{activity.date}</div>
                                <div className="timeline-title">{activity.title}</div>
                                <div className="timeline-desc">{activity.description}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ArchiveTab;