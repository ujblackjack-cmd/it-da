import React from 'react';
import './MyMeetings.css';
import { MyMeeting, OrganizedMeeting } from '../../../api/mypage.api';

const API_ORIGIN = "http://localhost:8080";

interface Props {
    upcoming: MyMeeting[];
    completed: MyMeeting[];
    organized?: OrganizedMeeting[];
    onOpenChat?: (meetingId: number) => void;
    onOpenReview?: (meetingId: number, meetingTitle: string) => void;
    onManageMeeting?: (meetingId: number) => void;
}

const getImageUrl = (imageUrl?: string | null) => {
    if (!imageUrl) return null;
    if (imageUrl.startsWith('http')) return imageUrl;
    return `${API_ORIGIN}${imageUrl}`;
};

const calcDDay = (dateTime: string) => {
    const target = new Date(dateTime).getTime();
    const now = new Date().getTime();
    const diff = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
    if (isNaN(diff)) return null;
    if (diff > 0) return `D-${diff}`;
    if (diff === 0) return 'D-DAY';
    return `D+${Math.abs(diff)}`;
};

const formatDateTime = (dateTime: string) => {
    const d = new Date(dateTime);
    if (isNaN(d.getTime())) return dateTime;
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${yyyy}.${mm}.${dd} ${hh}:${mi}`;
};

const MyMeetingsPage: React.FC<Props> = ({
                                             upcoming,
                                             completed,
                                             organized = [],
                                             onOpenChat,
                                             onOpenReview,
                                             onManageMeeting
                                         }) => {
    return (
        <div className="my-meetings">
            {/* ✅ 내가 주최한 모임 */}
            <h3 className="meetings-title">👑 내가 주최한 모임</h3>
            {organized.length === 0 ? (
                <div className="empty-block">주최한 모임이 없습니다.</div>
            ) : (
                <div className="meeting-list">
                    {organized.map((m) => {
                        const dday = calcDDay(m.dateTime);
                        const isPast = dday?.startsWith('D+');
                        const imgUrl = getImageUrl(m.imageUrl);
                        return (
                            <div key={m.meetingId} className="meeting-card organized-card">
                                <div
                                    className={`card-image ${!imgUrl ? 'organized-image' : ''}`}
                                    style={imgUrl ? {
                                        backgroundImage: `url(${imgUrl})`,
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center'
                                    } : undefined}
                                >
                                    <span className="organizer-badge">👑 주최자</span>
                                    <span className={`dday-badge ${isPast ? 'past' : 'active'}`}>
                                        {dday ?? m.statusText}
                                    </span>
                                </div>
                                <div className="card-body">
                                    <h4 className="card-title">{m.meetingTitle}</h4>
                                    <p className="card-date">{formatDateTime(m.dateTime)}</p>
                                    <div className="card-meta">
                                        <span className="participant-info">👥 {m.currentParticipants}/{m.maxParticipants}명</span>
                                        {m.category && <span className="category-tag">{m.category}</span>}
                                    </div>
                                    <div className="card-footer">
                                        <span className="location-text">📍 {m.location || '위치 미정'}</span>
                                        <div className="btn-group">
                                            <button className="card-btn" onClick={() => onOpenChat?.(m.meetingId)}>톡방</button>
                                            <button className="card-btn primary" onClick={() => onManageMeeting?.(m.meetingId)}>관리</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ✅ 진행 예정 모임 */}
            <h3 className="meetings-title" style={{ marginTop: '32px' }}>💚 진행 예정 모임</h3>
            {upcoming.length === 0 ? (
                <div className="empty-block">예정된 모임이 없습니다.</div>
            ) : (
                <div className="meeting-list">
                    {upcoming.map((m) => {
                        const dday = calcDDay(m.dateTime);
                        const imgUrl = getImageUrl(m.imageUrl);
                        return (
                            <div key={m.meetingId} className="meeting-card">
                                <div
                                    className="card-image"
                                    style={imgUrl ? {
                                        backgroundImage: `url(${imgUrl})`,
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center'
                                    } : undefined}
                                >
                                    <span className="dday-badge active">{dday ?? m.statusText}</span>
                                </div>
                                <div className="card-body">
                                    <h4 className="card-title">{m.meetingTitle}</h4>
                                    <p className="card-date">{formatDateTime(m.dateTime)}</p>
                                    <div className="card-footer">
                                        <span className="location-text">📍 {m.location}</span>
                                        <button className="card-btn" onClick={() => onOpenChat?.(m.meetingId)}>톡방</button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ✅ 완료된 모임 */}
            <h3 className="meetings-title" style={{ marginTop: '32px' }}>✅ 완료된 모임</h3>
            {completed.length === 0 ? (
                <div className="empty-block">완료된 모임이 없습니다.</div>
            ) : (
                <div className="meeting-list">
                    {completed.map((m) => {
                        const imgUrl = getImageUrl(m.imageUrl);
                        return (
                            <div key={m.meetingId} className="meeting-card">
                                <div
                                    className={`card-image ${!imgUrl ? 'completed' : ''}`}
                                    style={imgUrl ? {
                                        backgroundImage: `url(${imgUrl})`,
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center'
                                    } : undefined}
                                >
                                    <span className="dday-badge completed">{m.statusText || '완료'}</span>
                                </div>
                                <div className="card-body">
                                    <h4 className="card-title">{m.meetingTitle}</h4>
                                    <p className="card-date">{formatDateTime(m.dateTime)}</p>
                                    <div className="card-footer">
                                        <span className="rating-text">⭐ {Number(m.averageRating || 0).toFixed(1)}</span>
                                        <button className="card-btn" onClick={() => onOpenReview?.(m.meetingId, m.meetingTitle)}>
                                            {m.hasMyReview ? '리뷰 보기' : '리뷰 쓰기'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default MyMeetingsPage;
