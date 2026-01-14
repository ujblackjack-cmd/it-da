import React from 'react';
import './StatsTab.css';

interface Stat {
    icon: string;
    value: number | string;
    label: string;
}

interface Props {
    stats: Stat[];
}

const StatsTab: React.FC<Props> = ({ stats }) => {
    return (
        <div className="stats-tab">
            <h3 className="stats-title">📊 내 활동 통계</h3>
            <div className="stats-grid">
                {stats.map((stat, index) => (
                    <div key={index} className="stat-card">
                        <div className="stat-icon">{stat.icon}</div>
                        <div className="stat-number">{stat.value}</div>
                        <div className="stat-text">{stat.label}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default StatsTab;