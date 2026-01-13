import React, { useCallback, useEffect, useMemo, useState } from 'react';
import './MyPage.css';

import mypageApi, { MyMeeting, MyReview, PendingReview } from '../../api/mypage.api';


import ProfileSection from './components/ProfileSection';
import PendingReviews from './components/PendingReviews';
import MyReviews from './components/MyReviews';
import MyMeetingsPage from './components/MyMeetingsPage.tsx';
import ReviewModal from './components/ReviewModal';

type TabKey = 'meetings' | 'archive' | 'stats' | 'settings';

const MyPage: React.FC = () => {
    // TODO: 실제로는 로그인 사용자 id를 store/auth에서 가져오기
    const currentUserId = 1;

    // TODO: 실제로는 라우터 params로 userId 받아오기
    const viewingUserId = 1;

    const isMyPage = currentUserId === viewingUserId;

    const [activeTab, setActiveTab] = useState<TabKey>('meetings');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [pendingReviews, setPendingReviews] = useState<PendingReview[]>([]);
    const [myReviews, setMyReviews] = useState<MyReview[]>([]);
    const [upcomingMeetings, setUpcomingMeetings] = useState<MyMeeting[]>([]);
    const [completedMeetings, setCompletedMeetings] = useState<MyMeeting[]>([]);

    // 모달 상태
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMeetingId, setModalMeetingId] = useState<number | null>(null);
    const [modalMeetingTitle, setModalMeetingTitle] = useState('');
    const [modalMeetingDateText, setModalMeetingDateText] = useState('');

    const openReviewModal = useCallback((meetingId: number, title: string, completedDate: string) => {
        setModalMeetingId(meetingId);
        setModalMeetingTitle(title);
        setModalMeetingDateText(`${completedDate} 참여`);
        setIsModalOpen(true);
    }, []);

    const closeReviewModal = useCallback(() => {
        setIsModalOpen(false);
    }, []);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const [pending, reviews, upcoming, completed] = await Promise.all([
                mypageApi.getPendingReviews(viewingUserId, currentUserId),
                mypageApi.getMyReviews(viewingUserId, currentUserId),
                mypageApi.getUpcomingMeetings(viewingUserId, currentUserId),
                mypageApi.getCompletedMeetings(viewingUserId, currentUserId),
            ]);

            setPendingReviews(pending);
            setMyReviews(reviews);
            setUpcomingMeetings(upcoming);
            setCompletedMeetings(completed);
        } catch (e) {
            console.error(e);
            setError('마이페이지 정보를 불러오지 못했습니다.');
        } finally {
            setLoading(false);
        }
    }, [viewingUserId, currentUserId]);



    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    // 프로필 예시 데이터 (백엔드 붙기 전까지 임시)
    const profile = useMemo(() => {
        const average =
            myReviews.length > 0
                ? myReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / myReviews.length
                : 0;

        return {
            username: '최동원',
            email: 'dongwon@email.com',
            avatarEmoji: '👨‍💻',
            stats: {
                followingCount: 24,
                followerCount: 18,
                meetingCount: upcomingMeetings.length + completedMeetings.length,
                badgeCount: 8,
                averageRating: average || 0,
            },
        };
    }, [myReviews, upcomingMeetings.length, completedMeetings.length]);

    return (
        <div className="mypage-root">
            {/* 상단 헤더 */}
            <header className="mypage-header">
                <div className="mypage-header-content">
                    <button className="mypage-back-btn" type="button" onClick={() => window.history.back()}>
                        ←
                    </button>
                    <h1 className="mypage-header-title">마이페이지</h1>
                    <div className="mypage-header-actions">
                        <button className="mypage-icon-btn" type="button" title="알림">
                            🔔
                            {pendingReviews.length > 0 && <span className="mypage-badge">{pendingReviews.length}</span>}
                        </button>
                        <button className="mypage-icon-btn" type="button" title="설정" onClick={() => setActiveTab('settings')}>
                            ⚙️
                        </button>
                    </div>
                </div>
            </header>

            {/* 프로필 섹션 */}
            <ProfileSection
                username={profile.username}
                email={profile.email}
                avatarEmoji={profile.avatarEmoji}
                stats={profile.stats}
                isMyPage={isMyPage}
                isFollowing={false}
                onToggleFollow={() => alert('팔로우/언팔로우 API 붙이면 됩니다!')}
                onClickFollowing={() => alert('팔로잉 리스트 모달(추가 구현)')}
                onClickFollower={() => alert('팔로워 리스트 모달(추가 구현)')}
            />

            <main className="mypage-container">
                {/* 탭 */}
                <div className="mypage-tabs">
                    <button
                        className={`mypage-tab ${activeTab === 'meetings' ? 'active' : ''}`}
                        onClick={() => setActiveTab('meetings')}
                        type="button"
                    >
                        📅 참여 모임
                    </button>
                    <button
                        className={`mypage-tab ${activeTab === 'archive' ? 'active' : ''}`}
                        onClick={() => setActiveTab('archive')}
                        type="button"
                    >
                        🏆 취미 아카이브
                    </button>
                    <button
                        className={`mypage-tab ${activeTab === 'stats' ? 'active' : ''}`}
                        onClick={() => setActiveTab('stats')}
                        type="button"
                    >
                        📊 활동 통계
                    </button>
                    <button
                        className={`mypage-tab ${activeTab === 'settings' ? 'active' : ''}`}
                        onClick={() => setActiveTab('settings')}
                        type="button"
                    >
                        ⚙️ 설정
                    </button>
                </div>

                {loading && <div className="mypage-state">불러오는 중...</div>}
                {error && <div className="mypage-state error">{error}</div>}

                {!loading && !error && (
                    <>
                        {activeTab === 'meetings' && (
                            <>
                                <PendingReviews
                                    data={pendingReviews}
                                    onWriteReview={(meetingId, title, date) => openReviewModal(meetingId, title, date)}
                                />

                                <MyReviews data={myReviews} />

                                <MyMeetingsPage
                                    upcoming={upcomingMeetings}
                                    completed={completedMeetings}
                                    onOpenChat={(meetingId) => alert(`톡방 이동 (meetingId=${meetingId})`)}
                                    onOpenReview={(meetingId) => alert(`리뷰 보기/쓰기 (meetingId=${meetingId})`)}
                                />
                            </>
                        )}

                        {activeTab === 'archive' && (
                            <div className="mypage-placeholder">
                                <h3>🏆 취미 아카이브</h3>
                                <p>배지/타임라인 UI는 다음 단계에서 컴포넌트로 쪼개서 붙이면 됨!</p>
                            </div>
                        )}

                        {activeTab === 'stats' && (
                            <div className="mypage-placeholder">
                                <h3>📊 활동 통계</h3>
                                <p>통계 API 붙으면 카드/차트로 확장 가능!</p>
                            </div>
                        )}

                        {activeTab === 'settings' && (
                            <div className="mypage-placeholder">
                                <h3>⚙️ 설정</h3>
                                <p>설정 UI는 별도 컴포넌트로 분리해서 붙이면 깔끔해져요.</p>
                            </div>
                        )}
                    </>
                )}
            </main>

            <ReviewModal
                isOpen={isModalOpen}
                onClose={closeReviewModal}
                userId={viewingUserId}
                currentUserId={currentUserId}
                meetingId={modalMeetingId}
                meetingTitle={modalMeetingTitle}
                meetingDateText={modalMeetingDateText}
                onSubmitted={fetchAll}
            />
        </div>
    );
};

export default MyPage;
