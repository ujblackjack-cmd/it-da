import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';
import mypageApi, { MyMeeting, OrganizedMeeting } from '../../api/mypage.api';
import MeetingReviewsModal from './components/MeetingReviewsModal';
import { useProfileWebSocket, ProfileUpdate } from '../../hooks/auth/useProfileWebSocket';
import './components/MyMeetings.css';

const API_ORIGIN = "http://localhost:8080";
const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&q=80";

const getImageUrl = (imageUrl?: string | null): string => {
    if (!imageUrl) return DEFAULT_IMAGE;
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

const MyMeetingsListPage: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const currentUserId = user?.userId;

    const [loading, setLoading] = useState(false);
    const [ongoingMeetings, setOngoingMeetings] = useState<MyMeeting[]>([]);
    const [upcomingMeetings, setUpcomingMeetings] = useState<MyMeeting[]>([]);
    const [completedMeetings, setCompletedMeetings] = useState<MyMeeting[]>([]);
    const [organizedMeetings, setOrganizedMeetings] = useState<OrganizedMeeting[]>([]);

    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [reviewMeetingId, setReviewMeetingId] = useState<number | null>(null);
    const [reviewMeetingTitle, setReviewMeetingTitle] = useState('');

    // ✅ fetchData
    const fetchData = useCallback(async () => {
        if (!currentUserId) return;
        setLoading(true);
        try {
            const [ongoing, upcoming, completed, organized] = await Promise.all([
                mypageApi.getOngoingMeetings(currentUserId, currentUserId),
                mypageApi.getUpcomingMeetings(currentUserId, currentUserId),
                mypageApi.getCompletedMeetings(currentUserId, currentUserId),
                mypageApi.getOrganizedMeetings(currentUserId),
            ]);
            setOngoingMeetings(ongoing);
            setUpcomingMeetings(upcoming);
            setCompletedMeetings(completed);
            setOrganizedMeetings(organized);
        } catch (err) {
            console.error('내 모임 로드 실패:', err);
        } finally {
            setLoading(false);
        }
    }, [currentUserId]);

    // ✅ WebSocket 실시간 업데이트 핸들러
    const handleProfileUpdate = useCallback(
        (update: ProfileUpdate) => {
            console.log("📊 내 모임 페이지 실시간 업데이트:", update);

            // ✅ 참여 승인 시 → "진행 예정" → "진행 중인 모임" 카드 이동
            if (update.type === "PARTICIPATION_APPROVED") {
                console.log("🎉 참여 승인됨! 모임 리스트 새로고침");
                void fetchData();
            }

            // ✅ 모임 마감 시 → "진행 중인 모임" → "완료된 모임" 카드 이동
            if (update.type === "MEETING_COMPLETED") {
                console.log("🏁 모임 완료됨! 모임 리스트 새로고침");
                void fetchData();
            }

            // ✅ [NEW] 모임 정보 변경 시 (이미지, 제목 등) → 즉시 새로고침
            if (update.type === "MEETING_UPDATED") {
                console.log("🖼️ 모임 정보 변경됨! 모임 리스트 새로고침:", update);
                void fetchData();
            }
        },
        [fetchData]
    );

    // ✅ WebSocket 연결
    useProfileWebSocket({
        profileUserId: currentUserId,
        onProfileUpdate: handleProfileUpdate,
    });

    // ✅ 초기 데이터 로드
    useEffect(() => {
        void fetchData();
    }, [fetchData]);

    // ✅ 스크롤 위치 복원
    useEffect(() => {
        const savedScrollY = sessionStorage.getItem('myMeetingsScrollY');
        if (savedScrollY && !loading) {
            setTimeout(() => {
                window.scrollTo(0, parseInt(savedScrollY));
                sessionStorage.removeItem('myMeetingsScrollY');
            }, 100);
        }
    }, [loading]);

    // ✅ 30초마다 자동 새로고침 (백업용)
    useEffect(() => {
        const interval = setInterval(() => {
            if (currentUserId) {
                console.log("🔄 자동 새로고침");
                fetchData();
            }
        }, 30000);
        return () => clearInterval(interval);
    }, [currentUserId, fetchData]);

    const handleCardClick = (meetingId: number) => {
        sessionStorage.setItem('myMeetingsScrollY', String(window.scrollY));
        navigate(`/meetings/${meetingId}`);
    };

    const handleButtonClick = (e: React.MouseEvent, callback: () => void) => {
        e.stopPropagation();
        sessionStorage.setItem('myMeetingsScrollY', String(window.scrollY));
        callback();
    };

    const handleManageMeeting = (meetingId: number) => navigate(`/meetings/${meetingId}`);
    const handleOpenReview = (meetingId: number, meetingTitle: string) => {
        setReviewMeetingId(meetingId);
        setReviewMeetingTitle(meetingTitle);
        setIsReviewModalOpen(true);
    };

    if (!currentUserId) {
        return (
            <div className="mymeetings-page">
                <div className="mymeetings-empty-state">
                    <p>로그인이 필요합니다.</p>
                    <button onClick={() => navigate('/login')}>로그인하기</button>
                </div>
            </div>
        );
    }

    return (
        <div className="mymeetings-page">
            <header className="mymeetings-header">
                <button className="back-btn" onClick={() => navigate(-1)}>←</button>
                <h1 className="header-title">내 모임</h1>
                <button onClick={() => fetchData()} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', padding: '8px' }} title="새로고침">🔄</button>
            </header>

            <main className="mymeetings-content">
                {loading ? (
                    <div className="mymeetings-loading">불러오는 중...</div>
                ) : (
                    <div className="my-meetings">
                        {/* 내가 주최한 모임 */}
                        <h3 className="meetings-title">👑 내가 주최한 모임</h3>
                        {organizedMeetings.length === 0 ? (
                            <div className="empty-block">주최한 모임이 없습니다.</div>
                        ) : (
                            <div className="meeting-list">
                                {organizedMeetings.map((m) => {
                                    const dday = calcDDay(m.dateTime);
                                    const isPast = dday?.startsWith('D+');
                                    const imgUrl = getImageUrl(m.imageUrl);
                                    return (
                                        <div key={`org-${m.meetingId}`} className="meeting-card organized-card clickable" onClick={() => handleCardClick(m.meetingId)}>
                                            <div className="card-image" style={{ backgroundImage: `url(${imgUrl})` }}>
                                                <span className="organizer-badge">👑 주최자</span>
                                                <span className={`dday-badge ${isPast ? 'past' : 'active'}`}>{dday ?? m.statusText}</span>
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
                                                        <button className="card-btn" onClick={(e) => handleButtonClick(e, () => navigate(`/chat/${m.meetingId}`))}>톡방</button>
                                                        <button className="card-btn primary" onClick={(e) => handleButtonClick(e, () => handleManageMeeting(m.meetingId))}>관리</button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* 진행 중인 모임 (APPROVED - 톡방 가능) */}
                        <h3 className="meetings-title" style={{ marginTop: '32px' }}>🔥 진행 중인 모임</h3>
                        {ongoingMeetings.length === 0 ? (
                            <div className="empty-block">진행 중인 모임이 없습니다.</div>
                        ) : (
                            <div className="meeting-list">
                                {ongoingMeetings.map((m) => {
                                    const imgUrl = getImageUrl(m.imageUrl);
                                    return (
                                        <div key={`ongoing-${m.meetingId}`} className="meeting-card ongoing-card clickable" onClick={() => handleCardClick(m.meetingId)}>
                                            <div className="card-image ongoing-image" style={{ backgroundImage: `url(${imgUrl})` }}>
                                                <span className="dday-badge ongoing">참여중 🔥</span>
                                            </div>
                                            <div className="card-body">
                                                <h4 className="card-title">{m.meetingTitle}</h4>
                                                <p className="card-date">{formatDateTime(m.dateTime)}</p>
                                                <div className="card-footer">
                                                    <span className="location-text">📍 {m.location}</span>
                                                    <div className="btn-group">
                                                        <button className="card-btn" onClick={(e) => handleButtonClick(e, () => navigate(`/chat/${m.meetingId}`))}>톡방</button>
                                                        <button className="card-btn primary" onClick={(e) => handleButtonClick(e, () => handleCardClick(m.meetingId))}>상세</button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* 진행 예정 모임 (PENDING - 톡방 불가) */}
                        <h3 className="meetings-title" style={{ marginTop: '32px' }}>💚 진행 예정 모임</h3>
                        {upcomingMeetings.length === 0 ? (
                            <div className="empty-block">예정된 모임이 없습니다.</div>
                        ) : (
                            <div className="meeting-list">
                                {upcomingMeetings.map((m) => {
                                    const dday = calcDDay(m.dateTime);
                                    const imgUrl = getImageUrl(m.imageUrl);
                                    return (
                                        <div key={`up-${m.meetingId}`} className="meeting-card clickable" onClick={() => handleCardClick(m.meetingId)}>
                                            <div className="card-image" style={{ backgroundImage: `url(${imgUrl})` }}>
                                                <span className="dday-badge active">{dday ?? '대기중'}</span>
                                            </div>
                                            <div className="card-body">
                                                <h4 className="card-title">{m.meetingTitle}</h4>
                                                <p className="card-date">{formatDateTime(m.dateTime)}</p>
                                                <div className="card-footer">
                                                    <span className="location-text">📍 {m.location}</span>
                                                    <button className="card-btn disabled" onClick={(e) => { e.stopPropagation(); alert('승인 후 톡방에 입장할 수 있습니다.'); }}>대기중</button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* 완료된 모임 */}
                        <h3 className="meetings-title" style={{ marginTop: '32px' }}>✅ 완료된 모임</h3>
                        {completedMeetings.length === 0 ? (
                            <div className="empty-block">완료된 모임이 없습니다.</div>
                        ) : (
                            <div className="meeting-list">
                                {completedMeetings.map((m) => {
                                    const imgUrl = getImageUrl(m.imageUrl);
                                    return (
                                        <div key={`comp-${m.meetingId}`} className="meeting-card clickable" onClick={() => handleCardClick(m.meetingId)}>
                                            <div className="card-image completed" style={{ backgroundImage: `url(${imgUrl})` }}>
                                                <span className="dday-badge completed">{m.statusText || '완료'}</span>
                                            </div>
                                            <div className="card-body">
                                                <h4 className="card-title">{m.meetingTitle}</h4>
                                                <p className="card-date">{formatDateTime(m.dateTime)}</p>
                                                <div className="card-footer">
                                                    <span className="rating-text">⭐ {Number(m.averageRating || 0).toFixed(1)}</span>
                                                    <button className="card-btn" onClick={(e) => handleButtonClick(e, () => handleOpenReview(m.meetingId, m.meetingTitle))}>{m.hasMyReview ? '리뷰 보기' : '리뷰 쓰기'}</button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </main>

            <MeetingReviewsModal isOpen={isReviewModalOpen} onClose={() => setIsReviewModalOpen(false)} meetingId={reviewMeetingId} meetingTitle={reviewMeetingTitle} />
        </div>
    );
};

export default MyMeetingsListPage;
