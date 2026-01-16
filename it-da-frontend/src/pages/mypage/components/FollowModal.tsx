import React from 'react';
import './FollowModal.css';

interface FollowUser {
    userId: number;
    username: string;
    email: string;
    isFollowing?: boolean;  // ✅ optional로 변경
    following?: boolean;    // ✅ 백엔드에서 이 이름으로 올 수도 있음
}

interface Props {
    isOpen: boolean;
    title: string;
    users: FollowUser[];
    loading?: boolean;
    currentUserId?: number;
    onClose: () => void;
    onToggleFollow: (userId: number) => void;
    onUserClick: (userId: number) => void;
}

const FollowModal: React.FC<Props> = ({
                                          isOpen,
                                          title,
                                          users,
                                          loading = false,
                                          currentUserId,
                                          onClose,
                                          onToggleFollow,
                                          onUserClick,
                                      }) => {
    if (!isOpen) return null;

    // ✅ 헬퍼 함수: 팔로우 상태 확인
    const checkIsFollowing = (user: FollowUser): boolean => {
        return user.isFollowing === true || user.following === true;
    };

    return (
        <div className="follow-modal-overlay" onClick={onClose}>
            <div className="follow-modal-container" onClick={(e) => e.stopPropagation()}>
                <div className="follow-modal-header">
                    <div className="header-spacer"></div>
                    <h2>{title}</h2>
                    <button className="close-btn" onClick={onClose}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                    </button>
                </div>

                <div className="follow-modal-body">
                    {loading ? (
                        <div className="follow-modal-loading">
                            <div className="loading-spinner-small"></div>
                            <p>불러오는 중...</p>
                        </div>
                    ) : users.length === 0 ? (
                        <div className="follow-modal-empty">
                            <p>사용자가 없습니다</p>
                        </div>
                    ) : (
                        users.map((user) => (
                            <div key={user.userId} className="follow-user-item">
                                <div
                                    className="follow-user-avatar"
                                    onClick={() => onUserClick(user.userId)}
                                >
                                    {user.username.charAt(0).toUpperCase()}
                                </div>

                                <div
                                    className="follow-user-info"
                                    onClick={() => onUserClick(user.userId)}
                                >
                                    <span className="follow-user-name">{user.username}</span>
                                    <span className="follow-user-email">{user.email}</span>
                                </div>

                                {currentUserId !== user.userId && (
                                    <button
                                        className={`follow-toggle-btn ${checkIsFollowing(user) ? 'following' : ''}`}
                                        onClick={() => onToggleFollow(user.userId)}
                                    >
                                        {checkIsFollowing(user) ? '팔로잉' : '팔로우'}
                                    </button>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default FollowModal;