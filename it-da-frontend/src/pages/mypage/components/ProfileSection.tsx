import React from 'react';
import './ProfileSection.css';

interface ProfileSectionProps {
    username: string;
    email: string;
    avatarEmoji: string;
    profileImageUrl?: string;
    bio?: string;
    mbti?: string;
    address?: string;
    interests?: string;
    stats: {
        followingCount: number;
        followerCount: number;
        meetingCount: number;
        badgeCount: number;
        averageRating: number;
    };
    isMyPage: boolean;
    isFollowing: boolean;
    onToggleFollow: () => void;
    onClickFollowing: () => void;
    onClickFollower: () => void;
}

const ProfileSection: React.FC<ProfileSectionProps> = ({
                                                           username, email, avatarEmoji, profileImageUrl, bio, mbti, address, interests, stats,
                                                           isMyPage, isFollowing, onToggleFollow, onClickFollowing, onClickFollower,
                                                       }) => {
    const getImageSrc = (url?: string) => {
        if (!url) return '';
        if (url.startsWith('http')) return url;
        return `http://localhost:8080${url}`;
    };

    const interestList = interests ? interests.split(',').filter(i => i.trim()) : [];

    return (
        <div className="profile-section">
            <div className="profile-section-inner">
                <div className="profile-avatar-wrapper">
                    {profileImageUrl ? (
                        <img src={getImageSrc(profileImageUrl)} alt="프로필" className="profile-avatar-img" />
                    ) : (
                        <div className="profile-avatar-emoji">{avatarEmoji}</div>
                    )}
                </div>

                <h2 className="profile-username">{username}</h2>
                <p className="profile-email">{email}</p>

                {bio && <p className="profile-bio">{bio}</p>}

                {(mbti || address) && (
                    <div className="profile-tags">
                        {mbti && <span className="profile-tag">🧠 {mbti}</span>}
                        {address && <span className="profile-tag">📍 {address}</span>}
                    </div>
                )}

                {interestList.length > 0 && (
                    <div className="profile-interests">
                        {interestList.map((interest, idx) => (
                            <span key={idx} className="interest-tag">{interest}</span>
                        ))}
                    </div>
                )}

                <div className="profile-stats">
                    <div className="profile-stat" onClick={onClickFollowing}>
                        <span className="profile-stat-value">{stats.followingCount}</span>
                        <span className="profile-stat-label">팔로잉</span>
                    </div>
                    <div className="profile-stat" onClick={onClickFollower}>
                        <span className="profile-stat-value">{stats.followerCount}</span>
                        <span className="profile-stat-label">팔로워</span>
                    </div>
                    <div className="profile-stat">
                        <span className="profile-stat-value">{stats.meetingCount}</span>
                        <span className="profile-stat-label">참여 모임</span>
                    </div>
                    <div className="profile-stat">
                        <span className="profile-stat-value">{stats.badgeCount}</span>
                        <span className="profile-stat-label">획득 배지</span>
                    </div>
                    <div className="profile-stat">
                        <span className="profile-stat-value">{stats.averageRating.toFixed(1)}</span>
                        <span className="profile-stat-label">평균 평점</span>
                    </div>
                </div>

                {!isMyPage && (
                    <button className={`profile-follow-btn ${isFollowing ? 'following' : ''}`} onClick={onToggleFollow}>
                        {isFollowing ? '팔로잉' : '팔로우'}
                    </button>
                )}
            </div>
        </div>
    );
};

export default ProfileSection;