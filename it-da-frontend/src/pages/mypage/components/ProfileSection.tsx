import React from 'react';
import './ProfileSection.css';

export interface ProfileStats {
    followingCount: number;
    followerCount: number;
    meetingCount: number;
    badgeCount: number;
    averageRating: number;
}

interface Props {
    username: string;
    email: string;
    avatarEmoji?: string; // 예: "👨‍💻"
    stats: ProfileStats;

    // 내 페이지인지 / 남의 페이지인지 구분 (남의 페이지면 팔로우 버튼 노출)
    isMyPage: boolean;

    isFollowing?: boolean;
    onToggleFollow?: () => void;

    onClickFollowing?: () => void;
    onClickFollower?: () => void;
}

const ProfileSection: React.FC<Props> = ({
                                             username,
                                             email,
                                             avatarEmoji = '👨‍💻',
                                             stats,
                                             isMyPage,
                                             isFollowing = false,
                                             onToggleFollow,
                                             onClickFollowing,
                                             onClickFollower,
                                         }) => {
    return (
        <section className="mypage-profile-section">
            <div className="mypage-profile-content">
                <div className="mypage-profile-avatar">{avatarEmoji}</div>

                <div className="mypage-profile-info">
                    <div className="mypage-profile-name-row">
                        <h2 className="mypage-profile-name">{username}</h2>

                        {!isMyPage && (
                            <button
                                className={`mypage-btn-follow ${isFollowing ? 'following' : ''}`}
                                onClick={onToggleFollow}
                                type="button"
                            >
                                {isFollowing ? '팔로잉' : '팔로우'}
                            </button>
                        )}
                    </div>

                    <p className="mypage-profile-email">{email}</p>

                    <div className="mypage-profile-stats">
                        <div className="mypage-stat-item" onClick={onClickFollowing} role="button" tabIndex={0}>
                            <div className="mypage-stat-value">{stats.followingCount}</div>
                            <div className="mypage-stat-label">팔로잉</div>
                        </div>

                        <div className="mypage-stat-item" onClick={onClickFollower} role="button" tabIndex={0}>
                            <div className="mypage-stat-value">{stats.followerCount}</div>
                            <div className="mypage-stat-label">팔로워</div>
                        </div>

                        <div className="mypage-stat-item">
                            <div className="mypage-stat-value">{stats.meetingCount}</div>
                            <div className="mypage-stat-label">참여 모임</div>
                        </div>

                        <div className="mypage-stat-item">
                            <div className="mypage-stat-value">{stats.badgeCount}</div>
                            <div className="mypage-stat-label">획득 배지</div>
                        </div>

                        <div className="mypage-stat-item">
                            <div className="mypage-stat-value">{stats.averageRating.toFixed(1)}</div>
                            <div className="mypage-stat-label">평균 평점</div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default ProfileSection;
