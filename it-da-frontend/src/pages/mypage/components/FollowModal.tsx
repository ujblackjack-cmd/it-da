import React from 'react';
import './FollowModal.css';

interface FollowUser {
    userId: number;
    username: string;
    email: string;
    isFollowing: boolean;
}

interface Props {
    isOpen: boolean;
    title: string;
    users: FollowUser[];
    onClose: () => void;
    onToggleFollow: (userId: number) => void;
    onUserClick: (userId: number) => void;
}

const FollowModal: React.FC<Props> = ({
                                          isOpen,
                                          title,
                                          users,
                                          onClose,
                                          onToggleFollow,
                                          onUserClick,
                                      }) => {
    if (!isOpen) return null;

    return (
        <div className="follow-modal-overlay" onClick={onClose}>
            <div className="follow-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="follow-modal-header">
                    <h2>{title}</h2>
                    <button className="follow-btn-close" onClick={onClose}>
                        ×
                    </button>
                </div>

                <div className="follow-modal-body">
                    {users.length === 0 ? (
                        <div className="follow-empty">사용자가 없습니다</div>
                    ) : (
                        users.map((user) => (
                            <div key={user.userId} className="user-list-item">
                                <div
                                    className="user-list-avatar"
                                    onClick={() => onUserClick(user.userId)}
                                >
                                    {user.username.charAt(0)}
                                </div>
                                <div
                                    className="user-list-info"
                                    onClick={() => onUserClick(user.userId)}
                                >
                                    <div className="user-list-name">{user.username}</div>
                                    <div className="user-list-email">{user.email}</div>
                                </div>
                                <button
                                    className={`btn-follow-small ${user.isFollowing ? 'following' : ''}`}
                                    onClick={() => onToggleFollow(user.userId)}
                                >
                                    {user.isFollowing ? '팔로잉' : '팔로우'}
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default FollowModal;