import React, { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';
import apiClient from '../../api/client';
import userChatApi from '../../api/userChat.api';  // ✅ 추가
import mypageApi, { MyMeeting, MyReview } from '../../api/mypage.api';
import FollowModal from './components/FollowModal';
import MyMeetingsPage from './components/MyMeetingsPage';
import ArchiveTab from './components/ArchiveTab';
import StatsTab from './components/StatsTab';
import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import './UserProfile.css';

const WS_URL = 'http://localhost:8080/ws';

type TabKey = 'meetings' | 'archive' | 'stats';

interface UserProfileData {
    userId: number;
    username: string;
    email: string;
    emailPrefix?: string;
    profileImageUrl?: string;
    bio?: string;
    mbti?: string;
    address?: string;
    interests?: string;
    isPublic?: boolean;
    isMyProfile?: boolean;
    isFollowing?: boolean;
    public?: boolean;
    myProfile?: boolean;
    following?: boolean;
    followRequestStatus: string;
    canViewFullProfile: boolean;
    followerCount: number;
    followingCount: number;
}

interface FollowUser {
    userId: number;
    username: string;
    email: string;
    isFollowing?: boolean;
    following?: boolean;
}

interface ApiError {
    response?: {
        status?: number;
        data?: {
            message?: string;
        };
    };
}

const UserProfile: React.FC = () => {
    const { emailPrefix } = useParams<{ emailPrefix: string }>();
    const navigate = useNavigate();

    const { user, checkAuth } = useAuthStore();
    const [currentUserId, setCurrentUserId] = useState<number | null>(null);

    const [profile, setProfile] = useState<UserProfileData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [imageError, setImageError] = useState(false);

    const [isFollowModalOpen, setIsFollowModalOpen] = useState(false);
    const [followModalTitle, setFollowModalTitle] = useState('');
    const [followUsers, setFollowUsers] = useState<FollowUser[]>([]);
    const [followLoading, setFollowLoading] = useState(false);

    const [activeTab, setActiveTab] = useState<TabKey>('meetings');
    const [upcomingMeetings, setUpcomingMeetings] = useState<MyMeeting[]>([]);
    const [completedMeetings, setCompletedMeetings] = useState<MyMeeting[]>([]);
    const [myReviews, setMyReviews] = useState<MyReview[]>([]);
    const [tabLoading, setTabLoading] = useState(false);
    const [tabDataLoaded, setTabDataLoaded] = useState(false);

    const clientRef = useRef<Client | null>(null);

    const isFollowingUser = useCallback(() => {
        if (!profile) return false;
        return profile.isFollowing === true || profile.following === true;
    }, [profile]);

    const isPublicAccount = useCallback(() => {
        if (!profile) return true;
        return profile.isPublic === true || profile.public === true;
    }, [profile]);

    const canViewProfile = useCallback(() => {
        if (!profile) return false;
        return profile.canViewFullProfile === true;
    }, [profile]);

    useEffect(() => {
        const initAuth = async () => {
            try {
                await checkAuth();
            } catch (e) {
                console.log('Auth check failed');
            }
        };
        initAuth();
    }, [checkAuth]);

    useEffect(() => {
        if (user?.userId) {
            setCurrentUserId(user.userId);
        }
    }, [user]);

    const clearTabData = useCallback(() => {
        console.log('🔒 탭 데이터 초기화');
        setUpcomingMeetings([]);
        setCompletedMeetings([]);
        setMyReviews([]);
        setTabDataLoaded(false);
    }, []);

    const loadTabData = useCallback(async (targetUserId: number, canView: boolean) => {
        if (!canView) {
            console.log('🔒 비공개 계정 - 탭 데이터 로드 스킵');
            clearTabData();
            return;
        }

        if (!currentUserId) {
            console.log('❌ currentUserId 없음 - 탭 데이터 로드 스킵');
            return;
        }

        setTabLoading(true);
        try {
            console.log('📊 탭 데이터 로드 시작 - userId:', targetUserId);
            const [upcoming, completed, reviews] = await Promise.all([
                mypageApi.getUpcomingMeetings(targetUserId, currentUserId),
                mypageApi.getCompletedMeetings(targetUserId, currentUserId),
                mypageApi.getMyReviews(targetUserId, currentUserId),
            ]);
            console.log('📊 탭 데이터 로드 완료:', { upcoming, completed, reviews });
            setUpcomingMeetings(upcoming);
            setCompletedMeetings(completed);
            setMyReviews(reviews);
            setTabDataLoaded(true);
        } catch (e) {
            console.error('탭 데이터 로드 실패:', e);
            clearTabData();
        } finally {
            setTabLoading(false);
        }
    }, [currentUserId, clearTabData]);

    // 웹소켓 연결 (기존과 동일 - 생략)
    useEffect(() => {
        if (!profile?.userId || !currentUserId) return;
        if (clientRef.current?.connected) return;

        const client = new Client({
            webSocketFactory: () => new SockJS(WS_URL),
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
            debug: (str) => {
                if (str.includes('MESSAGE') || str.includes('SUBSCRIBE')) {
                    console.log('[ProfileWS]', str);
                }
            },
            onConnect: () => {
                console.log('✅ [ProfileWS] 웹소켓 연결됨');

                client.subscribe(`/topic/profile/${profile.userId}`, (message: IMessage) => {
                    try {
                        const data = JSON.parse(message.body);
                        console.log(`📊 [프로필 ${profile.userId}] 업데이트 수신:`, data);

                        if (data.type === 'PROFILE_INFO_UPDATE') {
                            setProfile(prev => {
                                if (!prev) return prev;
                                const newIsPublic = data.isPublic ?? prev.isPublic;
                                const isCurrentlyFollowing = prev.isFollowing || prev.following || false;
                                const newCanView = newIsPublic || isCurrentlyFollowing;
                                const prevCanView = prev.canViewFullProfile;

                                if (newCanView && !prevCanView) {
                                    setTimeout(() => loadTabData(prev.userId, true), 100);
                                } else if (!newCanView && prevCanView) {
                                    clearTabData();
                                }

                                return {
                                    ...prev,
                                    username: data.username || prev.username,
                                    profileImageUrl: data.profileImageUrl || prev.profileImageUrl,
                                    bio: data.bio ?? prev.bio,
                                    mbti: data.mbti ?? prev.mbti,
                                    address: data.address ?? prev.address,
                                    isPublic: newIsPublic,
                                    public: newIsPublic,
                                    canViewFullProfile: newCanView,
                                };
                            });
                            setImageError(false);
                        }

                        if (data.type === 'PROFILE_UPDATE') {
                            setProfile(prev => prev ? { ...prev, followerCount: data.newFollowerCount ?? prev.followerCount } : prev);
                        }

                        if (data.type === 'PROFILE_FOLLOWING_UPDATE') {
                            setProfile(prev => prev ? { ...prev, followingCount: data.newFollowerCount ?? prev.followingCount } : prev);
                        }
                    } catch (e) {
                        console.error('[ProfileWS] 파싱 에러:', e);
                    }
                });

                client.subscribe(`/topic/follow/${currentUserId}`, (message: IMessage) => {
                    try {
                        const data = JSON.parse(message.body);

                        if (data.type === 'FOLLOW_REJECTED') {
                            setProfile(prev => {
                                if (prev && data.fromUserId === prev.userId) {
                                    return { ...prev, followRequestStatus: 'none' };
                                }
                                return prev;
                            });
                            alert(`${data.fromUsername}님이 팔로우 요청을 거절했습니다.`);
                        }

                        if (data.type === 'FOLLOW_ACCEPTED') {
                            setProfile(prev => {
                                if (prev && data.fromUserId === prev.userId) {
                                    setTimeout(() => loadTabData(prev.userId, true), 100);
                                    return {
                                        ...prev,
                                        isFollowing: true,
                                        following: true,
                                        followRequestStatus: 'following',
                                        canViewFullProfile: true
                                    };
                                }
                                return prev;
                            });
                        }
                    } catch (e) {
                        console.error('[ProfileWS] 파싱 에러:', e);
                    }
                });
            },
            onDisconnect: () => {
                console.log('🔌 [ProfileWS] 웹소켓 연결 해제');
            },
        });

        client.activate();
        clientRef.current = client;

        return () => {
            if (clientRef.current) {
                clientRef.current.deactivate();
                clientRef.current = null;
            }
        };
    }, [profile?.userId, currentUserId, loadTabData, clearTabData]);

    const fetchProfile = useCallback(async () => {
        if (!emailPrefix) return;

        setLoading(true);
        setError(null);
        setImageError(false);
        setTabDataLoaded(false);

        try {
            const response = await apiClient.get(`/api/profile/${encodeURIComponent(emailPrefix)}`, {
                params: { currentUserId },
            });

            setProfile(response.data);

            if (response.data.isMyProfile || response.data.myProfile) {
                navigate('/mypage', { replace: true });
                return;
            }
        } catch (e: unknown) {
            const err = e as ApiError;
            if (err.response?.status === 404 || err.response?.status === 500) {
                setError('존재하지 않는 사용자입니다.');
            } else {
                setError('프로필을 불러오는데 실패했습니다.');
            }
        } finally {
            setLoading(false);
        }
    }, [emailPrefix, currentUserId, navigate]);

    useEffect(() => {
        if (emailPrefix) {
            fetchProfile();
        }
    }, [emailPrefix, currentUserId, fetchProfile]);

    useEffect(() => {
        if (profile?.userId && currentUserId && !tabDataLoaded) {
            if (profile.canViewFullProfile) {
                loadTabData(profile.userId, true);
            } else {
                clearTabData();
            }
        }
    }, [profile?.userId, profile?.canViewFullProfile, currentUserId, tabDataLoaded, loadTabData, clearTabData]);

    const stats = useMemo(() => {
        const totalMeetings = completedMeetings.length + upcomingMeetings.length;
        const avgRating = myReviews.length > 0
            ? (myReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / myReviews.length).toFixed(1)
            : '0.0';
        return [
            { icon: '📅', value: totalMeetings, label: '총 참여 모임' },
            { icon: '⭐', value: avgRating, label: '평균 평점' },
            { icon: '📝', value: myReviews.length, label: '작성한 리뷰' },
        ];
    }, [completedMeetings.length, upcomingMeetings.length, myReviews]);

    const badges = [
        { id: 1, icon: '🌟', name: '첫 모임', description: '첫 모임 참여 완료', isUnlocked: completedMeetings.length > 0 },
        { id: 2, icon: '🔥', name: '열정러', description: '10회 모임 참여', isUnlocked: completedMeetings.length >= 10 },
        { id: 3, icon: '🏅', name: '마스터', description: '50회 모임 참여', isUnlocked: completedMeetings.length >= 50 },
    ];

    const activities = completedMeetings.slice(0, 5).map((m, i) => ({
        id: i,
        date: new Date(m.dateTime).toLocaleDateString(),
        title: m.meetingTitle,
        description: `${m.location}에서 모임 참여`,
        icon: '📅',
    }));

    // ✅ 메시지 버튼 클릭 핸들러 추가
    const handleOpenChat = async () => {
        if (!profile || !currentUserId) {
            alert('로그인이 필요합니다.');
            navigate('/login');
            return;
        }

        try {
            const { canSend, message } = await userChatApi.canSendMessage(currentUserId, profile.userId);

            if (!canSend) {
                alert(message);
                return;
            }

            const room = await userChatApi.getOrCreateRoom(currentUserId, profile.userId);
            navigate(`/user-chat/${room.roomId}`);
        } catch (e: any) {
            console.error('채팅방 생성 실패:', e);
            alert(e.response?.data?.message || '채팅방을 열 수 없습니다.');
        }
    };

    const handleToggleFollow = async () => {
        if (!profile) return;

        const userId = currentUserId || user?.userId;
        if (!userId) {
            alert('로그인이 필요합니다.');
            navigate('/login');
            return;
        }

        try {
            if (isFollowingUser()) {
                await apiClient.delete(`/api/users/${userId}/follow/${profile.userId}`);
                const newCanView = profile.isPublic || profile.public || false;
                setProfile(prev => prev ? {
                    ...prev,
                    isFollowing: false,
                    following: false,
                    followRequestStatus: 'none',
                    canViewFullProfile: newCanView
                } : prev);
                if (!isPublicAccount()) {
                    clearTabData();
                }
                return;
            }

            if (profile.followRequestStatus === 'pending') {
                try {
                    await apiClient.delete(`/api/users/${userId}/follow-request/${profile.userId}/cancel`);
                    setProfile(prev => prev ? { ...prev, followRequestStatus: 'none' } : prev);
                } catch (cancelErr: unknown) {
                    const err = cancelErr as ApiError;
                    if (err.response?.status === 404) {
                        setProfile(prev => prev ? { ...prev, followRequestStatus: 'none' } : prev);
                        alert('팔로우 요청이 없습니다.');
                    } else {
                        throw cancelErr;
                    }
                }
                return;
            }

            if (isPublicAccount()) {
                await apiClient.post(`/api/users/${userId}/follow/${profile.userId}`);
                setProfile(prev => prev ? {
                    ...prev,
                    isFollowing: true,
                    following: true,
                    followRequestStatus: 'following',
                    canViewFullProfile: true
                } : prev);
                loadTabData(profile.userId, true);
            } else {
                await apiClient.post(`/api/users/${userId}/follow-request/${profile.userId}`);
                setProfile(prev => prev ? { ...prev, followRequestStatus: 'pending' } : prev);
                alert('팔로우 요청을 보냈습니다! 상대방이 승인하면 팔로우됩니다.');
            }
        } catch (e: unknown) {
            const err = e as ApiError;
            alert(err.response?.data?.message || '팔로우 처리에 실패했습니다.');
        }
    };

    const handleShowFollowList = async (type: 'following' | 'follower') => {
        if (!profile) return;

        if (!canViewProfile()) {
            alert('비공개 계정입니다. 팔로우 후 확인할 수 있습니다.');
            return;
        }

        setFollowLoading(true);
        setFollowModalTitle(type === 'following' ? '팔로잉' : '팔로워');
        setIsFollowModalOpen(true);

        try {
            const endpoint = type === 'following'
                ? `/api/users/${profile.userId}/following`
                : `/api/users/${profile.userId}/followers`;

            const response = await apiClient.get(endpoint, { params: { currentUserId } });
            setFollowUsers(response.data || []);
        } catch (e) {
            setFollowUsers([]);
        } finally {
            setFollowLoading(false);
        }
    };

    const handleToggleFollowUser = async (targetUserId: number) => {
        const userId = currentUserId || user?.userId;
        if (!userId) {
            alert('로그인이 필요합니다.');
            return;
        }

        const targetUser = followUsers.find(u => u.userId === targetUserId);
        if (!targetUser) return;

        const targetIsFollowing = targetUser.isFollowing || targetUser.following;

        try {
            if (targetIsFollowing) {
                await apiClient.delete(`/api/users/${userId}/follow/${targetUserId}`);
                setFollowUsers(prev => prev.map(u =>
                    u.userId === targetUserId ? { ...u, isFollowing: false, following: false } : u
                ));
            } else {
                await apiClient.post(`/api/users/${userId}/follow/${targetUserId}`);
                setFollowUsers(prev => prev.map(u =>
                    u.userId === targetUserId ? { ...u, isFollowing: true, following: true } : u
                ));
            }
        } catch (e: unknown) {
            const err = e as ApiError;
            if (err.response?.status === 403) {
                alert('비공개 계정입니다. 팔로우 요청을 보내세요.');
            } else {
                alert(err.response?.data?.message || '팔로우 처리에 실패했습니다.');
            }
        }
    };

    const handleUserClick = (userId: number) => {
        setIsFollowModalOpen(false);
        if (userId === currentUserId) {
            navigate('/mypage');
        } else {
            navigate(`/profile/id/${userId}`);
        }
    };

    const getFollowButtonText = () => {
        if (!profile) return '팔로우';
        if (isFollowingUser()) return '팔로잉';
        if (profile.followRequestStatus === 'pending') return '요청됨';
        return '팔로우';
    };

    const getFollowButtonClass = () => {
        if (!profile) return 'profile-follow-btn';
        if (isFollowingUser()) return 'profile-follow-btn following';
        if (profile.followRequestStatus === 'pending') return 'profile-follow-btn requested';
        return 'profile-follow-btn';
    };

    const getProfileImageUrl = () => {
        if (!profile?.profileImageUrl) return null;
        if (profile.profileImageUrl.startsWith('http')) return profile.profileImageUrl;
        return `http://localhost:8080${profile.profileImageUrl}`;
    };

    if (loading) {
        return (
            <div className="user-profile-container">
                <div className="user-profile-loading">
                    <div className="loading-spinner"></div>
                    <p>불러오는 중...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="user-profile-container">
                <div className="user-profile-error">
                    <div className="error-icon">😢</div>
                    <p>{error}</p>
                    <button onClick={() => navigate(-1)}>뒤로가기</button>
                </div>
            </div>
        );
    }

    if (!profile) return null;

    const profileImageUrl = getProfileImageUrl();

    return (
        <div className="user-profile-container">
            <header className="user-profile-header">
                <button className="back-button" onClick={() => navigate(-1)}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </button>
                <h1 className="header-username">{profile.username}</h1>
                <div className="header-spacer"></div>
            </header>

            <div className="profile-card">
                <div className="profile-avatar-section">
                    <div className="profile-avatar">
                        {profileImageUrl && !imageError ? (
                            <img
                                src={profileImageUrl}
                                alt={profile.username}
                                onError={() => setImageError(true)}
                            />
                        ) : (
                            <div className="avatar-placeholder">
                                {profile.username.charAt(0).toUpperCase()}
                            </div>
                        )}
                        {!isPublicAccount() && <span className="private-badge">🔒</span>}
                    </div>
                </div>

                <h2 className="profile-username">{profile.username}</h2>

                {canViewProfile() && profile.bio && (
                    <p className="profile-bio">{profile.bio}</p>
                )}

                <div className="profile-stats">
                    <div className="stat-item clickable" onClick={() => handleShowFollowList('follower')}>
                        <span className="stat-number">{profile.followerCount}</span>
                        <span className="stat-label">팔로워</span>
                    </div>
                    <div className="stat-item clickable" onClick={() => handleShowFollowList('following')}>
                        <span className="stat-number">{profile.followingCount}</span>
                        <span className="stat-label">팔로잉</span>
                    </div>
                </div>

                <div className="profile-actions">
                    <button className={getFollowButtonClass()} onClick={handleToggleFollow}>
                        {getFollowButtonText()}
                    </button>
                    {/* ✅ 메시지 버튼에 onClick 연결 */}
                    <button className="profile-message-btn" onClick={handleOpenChat}>
                        💬 메시지
                    </button>
                </div>

                {canViewProfile() && (
                    <div className="profile-tags">
                        {profile.mbti && <span className="profile-tag">🧠 {profile.mbti}</span>}
                        {profile.address && <span className="profile-tag">📍 {profile.address}</span>}
                    </div>
                )}
            </div>

            {canViewProfile() && (
                <div className="profile-tabs-section">
                    <div className="profile-tabs">
                        <button
                            className={`profile-tab ${activeTab === 'meetings' ? 'active' : ''}`}
                            onClick={() => setActiveTab('meetings')}
                        >
                            📅 참여 모임
                        </button>
                        <button
                            className={`profile-tab ${activeTab === 'archive' ? 'active' : ''}`}
                            onClick={() => setActiveTab('archive')}
                        >
                            🏆 취미 아카이브
                        </button>
                        <button
                            className={`profile-tab ${activeTab === 'stats' ? 'active' : ''}`}
                            onClick={() => setActiveTab('stats')}
                        >
                            📊 활동 통계
                        </button>
                    </div>

                    <div className="profile-tab-content">
                        {tabLoading ? (
                            <div className="tab-loading">불러오는 중...</div>
                        ) : (
                            <>
                                {activeTab === 'meetings' && (
                                    <MyMeetingsPage
                                        upcoming={upcomingMeetings}
                                        completed={completedMeetings}
                                        onOpenChat={(id) => alert(`톡방 이동 ${id}`)}
                                        onOpenReview={(id) => alert(`리뷰 보기 ${id}`)}
                                    />
                                )}
                                {activeTab === 'archive' && (
                                    <ArchiveTab badges={badges} activities={activities} />
                                )}
                                {activeTab === 'stats' && (
                                    <StatsTab stats={stats} />
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}

            {!canViewProfile() && (
                <div className="private-notice">
                    <div className="lock-icon">🔒</div>
                    <h3>비공개 계정입니다</h3>
                    <p>이 계정의 게시물을 보려면 팔로우하세요.</p>
                </div>
            )}

            <FollowModal
                isOpen={isFollowModalOpen}
                title={followModalTitle}
                users={followUsers}
                loading={followLoading}
                currentUserId={currentUserId || undefined}
                onClose={() => setIsFollowModalOpen(false)}
                onToggleFollow={handleToggleFollowUser}
                onUserClick={handleUserClick}
            />
        </div>
    );
};

export default UserProfile;