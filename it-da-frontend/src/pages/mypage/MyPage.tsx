import React, { useCallback, useEffect, useMemo, useState } from 'react';
import './MyPage.css';
import { useAuthStore } from '@/stores/useAuthStore';
import { useNavigate } from 'react-router-dom';
import mypageApi, { MyMeeting, MyReview, PendingReview } from '../../api/mypage.api';
import followApi from '../../api/follow.api';
import userSettingApi from '../../api/userSetting.api';
import type { FollowUser } from '../../types/follow.types';
import ProfileSection from './components/ProfileSection';
import PendingReviews from './components/PendingReviews';
import MyReviews from './components/MyReviews';
import MyMeetingsPage from './components/MyMeetingsPage';
import ReviewModal from './components/ReviewModal';
import NotificationDropdown from './components/NotificationDropdown';
import FollowModal from './components/FollowModal';
import ArchiveTab from './components/ArchiveTab';
import StatsTab from './components/StatsTab';
import SettingsTab from './components/SettingsTab';
import ProfileEditModal from './components/ProfileEditModal';
import apiClient from '../../api/client';

type TabKey = 'meetings' | 'archive' | 'stats' | 'settings';

const MyPage: React.FC = () => {
    const { user } = useAuthStore();
    const currentUserId = user?.userId || 44;
    const viewingUserId = currentUserId;
    const isMyPage = currentUserId === viewingUserId;
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<TabKey>('meetings');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [pendingReviews, setPendingReviews] = useState<PendingReview[]>([]);
    const [myReviews, setMyReviews] = useState<MyReview[]>([]);
    const [upcomingMeetings, setUpcomingMeetings] = useState<MyMeeting[]>([]);
    const [completedMeetings, setCompletedMeetings] = useState<MyMeeting[]>([]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMeetingId, setModalMeetingId] = useState<number | null>(null);
    const [modalMeetingTitle, setModalMeetingTitle] = useState('');
    const [modalMeetingDateText, setModalMeetingDateText] = useState('');

    const [isNotificationOpen, setIsNotificationOpen] = useState(false);
    const [notifications, setNotifications] = useState([
        { id: 1, title: '민지님이 새로운 모임에 참가했어요!', text: '💡 한강 야간 러닝 모임에 참가했습니다.', time: '2분 전', isUnread: true },
        { id: 2, title: '수현님이 후기를 작성했어요!', text: '⭐ ★★★★★ - 정말 좋았어요!', time: '1시간 전', isUnread: true },
        { id: 3, title: '태영님이 회원님을 팔로우했어요!', text: '👤 새로운 팔로워가 생겼습니다.', time: '3시간 전', isUnread: false },
    ]);

    const [isFollowModalOpen, setIsFollowModalOpen] = useState(false);
    const [followModalTitle, setFollowModalTitle] = useState('');
    const [followUsers, setFollowUsers] = useState<FollowUser[]>([]);
    const [isFollowing, setIsFollowing] = useState(false);
    const [isProfileEditOpen, setIsProfileEditOpen] = useState(false);
    const [followingCount, setFollowingCount] = useState(0);
    const [followerCount, setFollowerCount] = useState(0);

    const [notifyFollowMeeting, setNotifyFollowMeeting] = useState(true);
    const [notifyFollowReview, setNotifyFollowReview] = useState(true);
    const [isPublic, setIsPublic] = useState(true);

    const badges = [
        { id: 1, icon: '🌟', name: '첫 모임', description: '첫 모임 참여 완료', isUnlocked: true },
        { id: 2, icon: '🔥', name: '열정러', description: '10회 모임 참여', isUnlocked: true },
        { id: 3, icon: '🏅', name: '마스터', description: '50회 모임 참여', isUnlocked: false },
    ];

    const activities = [
        { id: 1, date: '2026.01.02', title: '새해 첫 모임 신청!', description: '한강 선셋 피크닉 모임에 참여했어요', icon: '🎉' },
    ];

    const stats = useMemo(() => {
        const totalMeetings = completedMeetings.length + upcomingMeetings.length;
        const avgRating = myReviews.length > 0
            ? (myReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / myReviews.length).toFixed(1)
            : '0.0';
        return [
            { icon: '📅', value: totalMeetings, label: '총 참여 모임' },
            { icon: '⭐', value: avgRating, label: '평균 평점' },
        ];
    }, [completedMeetings.length, upcomingMeetings.length, myReviews]);

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

    const fetchFollowStatus = useCallback(async () => {
        if (!isMyPage) {
            try {
                const status = await followApi.checkFollowStatus(currentUserId, viewingUserId);
                setIsFollowing(status);
            } catch (e) {
                console.error('팔로우 상태 조회 실패:', e);
            }
        }
    }, [currentUserId, viewingUserId, isMyPage]);

    const fetchFollowCounts = useCallback(async () => {
        try {
            const [following, followers] = await Promise.all([
                followApi.getFollowing(viewingUserId).then(list => list.length),
                followApi.getFollowers(viewingUserId).then(list => list.length),
            ]);
            setFollowingCount(following);
            setFollowerCount(followers);
        } catch (e) {
            console.error('팔로우 수 조회 실패:', e);
        }
    }, [viewingUserId]);

    const fetchSettings = useCallback(async () => {
        try {
            const settings = await userSettingApi.getSetting(currentUserId);
            setNotifyFollowMeeting(settings.followMeetingNotification);
            setNotifyFollowReview(settings.followReviewNotification);
        } catch (e) {
            console.error('설정 조회 실패:', e);
        }
    }, [currentUserId]);

    const fetchUserProfile = useCallback(async () => {
        try {
            const response = await apiClient.get(`/api/users/${currentUserId}`);
            setIsPublic(response.data.isPublic ?? true);
        } catch (e) {
            console.error(e);
        }
    }, [currentUserId]);

    useEffect(() => {
        fetchAll();
        fetchFollowStatus();
        fetchFollowCounts();
        fetchSettings();
        fetchUserProfile();
    }, [fetchAll, fetchFollowStatus, fetchFollowCounts, fetchSettings, fetchUserProfile]);

    const handleToggleFollow = async () => {
        try {
            if (isFollowing) {
                await followApi.unfollow(currentUserId, viewingUserId);
                setFollowerCount(prev => Math.max(0, prev - 1));
            } else {
                await followApi.follow(currentUserId, viewingUserId);
                setFollowerCount(prev => prev + 1);
            }
            setIsFollowing(!isFollowing);
        } catch (e) {
            alert('팔로우 처리에 실패했습니다.');
        }
    };

    const handleShowFollowList = async (type: 'following' | 'follower') => {
        try {
            const users = type === 'following'
                ? await followApi.getFollowing(viewingUserId)
                : await followApi.getFollowers(viewingUserId);
            setFollowUsers(users);
            setFollowModalTitle(type === 'following' ? '팔로잉' : '팔로워');
            setIsFollowModalOpen(true);
        } catch (e) {
            alert('목록을 불러오는데 실패했습니다.');
        }
    };

    const handleToggleFollowUser = async (targetUserId: number) => {
        try {
            const targetUser = followUsers.find(u => u.userId === targetUserId);
            if (!targetUser) return;
            if (targetUser.isFollowing) {
                await followApi.unfollow(currentUserId, targetUserId);
            } else {
                await followApi.follow(currentUserId, targetUserId);
            }
            setFollowUsers(prev => prev.map(u => u.userId === targetUserId ? { ...u, isFollowing: !u.isFollowing } : u));
            await fetchFollowCounts();
        } catch (e) {
            alert('팔로우 처리에 실패했습니다.');
        }
    };

    const handleToggleFollowMeeting = async () => {
        try {
            await userSettingApi.updateSetting(currentUserId, { followMeetingNotification: !notifyFollowMeeting });
            setNotifyFollowMeeting(!notifyFollowMeeting);
        } catch (e) {
            alert('설정 저장에 실패했습니다.');
        }
    };

    const handleToggleFollowReview = async () => {
        try {
            await userSettingApi.updateSetting(currentUserId, { followReviewNotification: !notifyFollowReview });
            setNotifyFollowReview(!notifyFollowReview);
        } catch (e) {
            alert('설정 저장에 실패했습니다.');
        }
    };

    const handleTogglePublic = async () => {
        try {
            await apiClient.put(`/api/users/${currentUserId}`, { isPublic: !isPublic });
            setIsPublic(!isPublic);
        } catch (e) {
            alert('설정 변경 실패');
        }
    };

    const handleDeleteAccount = async () => {
        if (confirm('정말 계정을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) {
            if (confirm('삭제된 데이터는 복구할 수 없습니다. 정말 삭제하시겠습니까?')) {
                try {
                    await apiClient.delete(`/api/users/${currentUserId}`);
                    localStorage.clear();
                    alert('계정이 삭제되었습니다.');
                    window.location.href = '/';
                } catch (e) {
                    alert('계정 삭제 실패');
                }
            }
        }
    };

    const handleLogout = () => {
        if (confirm('정말 로그아웃 하시겠습니까?')) {
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
    };

    const handleProfileSave = async (newUsername: string) => {
        await apiClient.put(`/api/users/${currentUserId}`, { username: newUsername });
        window.location.reload();
    };

    const profile = useMemo(() => {
        const average = myReviews.length > 0
            ? myReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / myReviews.length
            : 0;
        return {
            username: user?.username || '사용자',
            email: user?.email || '',
            avatarEmoji: '👨‍💻',
            profileImageUrl: user?.profileImageUrl || '',
            bio: user?.bio || '',
            mbti: user?.mbti || '',
            address: user?.address || '',
            interests: user?.interests || '',
            stats: {
                followingCount,
                followerCount,
                meetingCount: upcomingMeetings.length + completedMeetings.length,
                badgeCount: 8,
                averageRating: average || 0,
            },
        };
    }, [user, myReviews, upcomingMeetings.length, completedMeetings.length, followingCount, followerCount]);

    return (
        <div className="mypage-root">
            <header className="mypage-header">
                <div className="mypage-header-content">
                    <button className="mypage-back-btn" type="button" onClick={() => window.history.back()}>←</button>
                    <h1 className="mypage-header-title">마이페이지</h1>
                    <div className="mypage-header-actions">
                        <button className="mypage-icon-btn" type="button" onClick={() => setIsNotificationOpen(!isNotificationOpen)}>
                            🔔
                            {notifications.filter(n => n.isUnread).length > 0 && (
                                <span className="mypage-badge">{notifications.filter(n => n.isUnread).length}</span>
                            )}
                        </button>
                        <button className="mypage-icon-btn" type="button" onClick={() => setActiveTab('settings')}>⚙️</button>
                    </div>
                </div>
            </header>

            <ProfileSection
                username={profile.username}
                email={profile.email}
                avatarEmoji={profile.avatarEmoji}
                profileImageUrl={profile.profileImageUrl}
                bio={profile.bio}
                mbti={profile.mbti}
                address={profile.address}
                interests={profile.interests}
                stats={profile.stats}
                isMyPage={isMyPage}
                isFollowing={isFollowing}
                onToggleFollow={handleToggleFollow}
                onClickFollowing={() => handleShowFollowList('following')}
                onClickFollower={() => handleShowFollowList('follower')}
            />

            <main className="mypage-container">
                <div className="mypage-tabs">
                    <button className={`mypage-tab ${activeTab === 'meetings' ? 'active' : ''}`} onClick={() => setActiveTab('meetings')}>📅 참여 모임</button>
                    <button className={`mypage-tab ${activeTab === 'archive' ? 'active' : ''}`} onClick={() => setActiveTab('archive')}>🏆 취미 아카이브</button>
                    <button className={`mypage-tab ${activeTab === 'stats' ? 'active' : ''}`} onClick={() => setActiveTab('stats')}>📊 활동 통계</button>
                    <button className={`mypage-tab ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>⚙️ 설정</button>
                </div>

                {loading && <div className="mypage-state">불러오는 중...</div>}
                {error && <div className="mypage-state error">{error}</div>}

                {!loading && !error && (
                    <>
                        {activeTab === 'meetings' && (
                            <>
                                <PendingReviews data={pendingReviews} onWriteReview={(id, title, date) => {
                                    setModalMeetingId(id);
                                    setModalMeetingTitle(title);
                                    setModalMeetingDateText(`${date} 참여`);
                                    setIsModalOpen(true);
                                }} />
                                <MyReviews data={myReviews} />
                                <MyMeetingsPage
                                    upcoming={upcomingMeetings}
                                    completed={completedMeetings}
                                    onOpenChat={(id) => alert(`톡방 이동 ${id}`)}
                                    onOpenReview={(id) => alert(`리뷰 보기 ${id}`)}
                                />
                            </>
                        )}
                        {activeTab === 'archive' && <ArchiveTab badges={badges} activities={activities} />}
                        {activeTab === 'stats' && <StatsTab stats={stats} />}
                        {activeTab === 'settings' && (
                            <SettingsTab
                                onProfileEdit={() => navigate('/profile/edit')}
                                onLogout={handleLogout}
                                notifyFollowMeeting={notifyFollowMeeting}
                                notifyFollowReview={notifyFollowReview}
                                onToggleFollowMeeting={handleToggleFollowMeeting}
                                onToggleFollowReview={handleToggleFollowReview}
                                isPublic={isPublic}
                                onTogglePublic={handleTogglePublic}
                                onDeleteAccount={handleDeleteAccount}
                            />
                        )}
                    </>
                )}
            </main>

            <ReviewModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                userId={viewingUserId}
                currentUserId={currentUserId}
                meetingId={modalMeetingId}
                meetingTitle={modalMeetingTitle}
                meetingDateText={modalMeetingDateText}
                onSubmitted={() => { fetchAll(); fetchFollowCounts(); }}
            />

            <NotificationDropdown
                isOpen={isNotificationOpen}
                notifications={notifications}
                onClose={() => setIsNotificationOpen(false)}
                onMarkAllRead={() => setNotifications(prev => prev.map(n => ({ ...n, isUnread: false })))}
                onNotificationClick={(id) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, isUnread: false } : n))}
            />

            <ProfileEditModal
                isOpen={isProfileEditOpen}
                onClose={() => setIsProfileEditOpen(false)}
                currentUsername={profile.username}
                onSave={handleProfileSave}
            />

            <FollowModal
                isOpen={isFollowModalOpen}
                title={followModalTitle}
                users={followUsers}
                onClose={() => setIsFollowModalOpen(false)}
                onToggleFollow={handleToggleFollowUser}
                onUserClick={(id) => navigate(`/profile/${id}`)}
            />
        </div>
    );
};

export default MyPage;