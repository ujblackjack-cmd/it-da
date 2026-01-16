import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotificationStore } from '../../../stores/useNotificationStore';
import type { Notification } from '../../../stores/useNotificationStore';
import { useAuthStore } from '../../../stores/useAuthStore';
import apiClient from '../../../api/client';
import './NotificationDropdown.css';

interface Props {
    isOpen?: boolean;
    onClose?: () => void;
}

const NotificationDropdown: React.FC<Props> = ({ isOpen: propIsOpen, onClose: propOnClose }) => {
    const navigate = useNavigate();
    const { notifications, unreadCount, markAsRead, markAllAsRead, removeNotification } = useNotificationStore();
    const { user } = useAuthStore();
    const [loadingId, setLoadingId] = useState<string | null>(null);

    const [internalOpen, setInternalOpen] = useState(false);

    const isOpen = propIsOpen !== undefined ? propIsOpen : internalOpen;
    const onClose = propOnClose || (() => setInternalOpen(false));
    const onToggle = () => setInternalOpen(!internalOpen);

    // ✅ 팔로우 요청 수락
    const handleAcceptFollow = async (e: React.MouseEvent, notification: Notification) => {
        e.stopPropagation();
        if (!user?.userId || !notification.fromUserId) return;

        setLoadingId(notification.id);
        try {
            await apiClient.post(`/api/users/${user.userId}/follow-request/${notification.fromUserId}/accept`);
            removeNotification(notification.id);
            alert(`${notification.fromUsername}님의 팔로우 요청을 수락했습니다!`);
        } catch (error) {
            console.error('팔로우 요청 수락 실패:', error);
            alert('팔로우 요청 수락에 실패했습니다.');
        } finally {
            setLoadingId(null);
        }
    };

    // ✅ 팔로우 요청 거절
    const handleRejectFollow = async (e: React.MouseEvent, notification: Notification) => {
        e.stopPropagation();
        if (!user?.userId || !notification.fromUserId) return;

        setLoadingId(notification.id);
        try {
            await apiClient.post(`/api/users/${user.userId}/follow-request/${notification.fromUserId}/reject`);
            removeNotification(notification.id);
            alert(`${notification.fromUsername}님의 팔로우 요청을 거절했습니다.`);
        } catch (error) {
            console.error('팔로우 요청 거절 실패:', error);
            alert('팔로우 요청 거절에 실패했습니다.');
        } finally {
            setLoadingId(null);
        }
    };

    const handleNotificationClick = (notification: Notification) => {
        // 팔로우 요청은 클릭해도 이동 안 함 (버튼으로 처리)
        if (notification.type === 'follow_request') return;

        markAsRead(notification.id);

        if (notification.type === 'follow' && notification.fromUserId) {
            onClose();
            navigate(`/profile/id/${notification.fromUserId}`);
        }
    };

    // ✅ 프로필 이미지 렌더링 (수정)
    const getProfileImage = (notification: Notification) => {
        console.log('🖼️ 프로필 이미지 확인:', notification.fromProfileImage);

        if (notification.fromProfileImage) {
            const imgUrl = notification.fromProfileImage.startsWith('http')
                ? notification.fromProfileImage
                : `http://localhost:8080${notification.fromProfileImage}`;
            return <img src={imgUrl} alt="" className="notif-avatar-img" onError={(e) => {
                // 이미지 로드 실패 시 placeholder로
                (e.target as HTMLImageElement).style.display = 'none';
            }} />;
        }

        // placeholder
        const initial = notification.fromUsername?.charAt(0).toUpperCase() || '?';
        return <div className="notif-avatar-placeholder">{initial}</div>;
    };

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'follow': return '👤';
            case 'follow_request': return '📩';
            case 'meeting': return '📅';
            case 'review': return '⭐';
            default: return '🔔';
        }
    };

    return (
        <div className="notification-wrapper">
            {propIsOpen === undefined && (
                <button className="notification-bell" onClick={onToggle}>
                    🔔
                    {unreadCount > 0 && (
                        <span className="notification-badge">{unreadCount}</span>
                    )}
                </button>
            )}

            {isOpen && (
                <div className="notification-dropdown-overlay" onClick={onClose}>
                    <div className="notification-dropdown" onClick={(e) => e.stopPropagation()}>
                        <div className="notification-header">
                            <h3>알림</h3>
                            <button className="mark-all-read" onClick={markAllAsRead}>
                                모두 읽음
                            </button>
                        </div>

                        <div className="notification-list">
                            {notifications.length === 0 ? (
                                <div className="notification-empty">
                                    <span className="empty-icon">🔔</span>
                                    <p>새로운 알림이 없습니다</p>
                                </div>
                            ) : (
                                notifications.map((notif) => (
                                    <div
                                        key={notif.id}
                                        className={`notification-item ${notif.isUnread ? 'unread' : ''} ${notif.type}`}
                                        onClick={() => handleNotificationClick(notif)}
                                    >
                                        <div className="notif-avatar">
                                            {(notif.type === 'follow' || notif.type === 'follow_request') && notif.fromUsername ? (
                                                getProfileImage(notif)
                                            ) : (
                                                <span className="notif-icon">{getNotificationIcon(notif.type)}</span>
                                            )}
                                        </div>

                                        <div className="notif-content">
                                            <p className="notif-title">{notif.title}</p>
                                            <p className="notif-text">{notif.text}</p>

                                            {/* ✅ 팔로우 요청일 때 수락/거절 버튼 - 항상 표시 */}
                                            {notif.type === 'follow_request' ? (
                                                <div className="notif-actions">
                                                    <button
                                                        className="notif-accept-btn"
                                                        onClick={(e) => handleAcceptFollow(e, notif)}
                                                        disabled={loadingId === notif.id}
                                                    >
                                                        {loadingId === notif.id ? '처리중...' : '수락'}
                                                    </button>
                                                    <button
                                                        className="notif-reject-btn"
                                                        onClick={(e) => handleRejectFollow(e, notif)}
                                                        disabled={loadingId === notif.id}
                                                    >
                                                        {loadingId === notif.id ? '처리중...' : '거절'}
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="notif-time">{notif.time}</span>
                                            )}
                                        </div>

                                        {notif.isUnread && <div className="unread-dot" />}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationDropdown;