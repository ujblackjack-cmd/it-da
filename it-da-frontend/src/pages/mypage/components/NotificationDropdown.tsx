import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useNotificationStore, Notification } from '@/stores/useNotificationStore';
import { useAuthStore } from '@/stores/useAuthStore';
import apiClient from '@/api/client';
import './NotificationDropdown.css';

interface NotificationDropdownProps {
    isOpen?: boolean;
    onClose?: () => void;
}

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ isOpen: propIsOpen, onClose: propOnClose }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuthStore();
    const {
        notifications,
        isOpen: storeIsOpen,
        closeDropdown: storeCloseDropdown,
        markAsRead,
        markAllAsRead,
        removeNotification
    } = useNotificationStore();

    const [loadingId, setLoadingId] = useState<string | null>(null);

    const isOpen = propIsOpen !== undefined ? propIsOpen : storeIsOpen;
    const onClose = propOnClose || storeCloseDropdown;

    if (!isOpen) return null;

    const getProfileImageUrl = (url?: string) => {
        if (!url) return null;
        if (url.startsWith('http')) return url;
        return `http://localhost:8080${url}`;
    };

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
        onClose();

        // ✅ 메시지 알림 클릭 시 채팅방으로 이동
        if (notification.type === 'message' && notification.roomId) {
            const targetPath = `/user-chat/${notification.roomId}`;
            if (location.pathname === targetPath) {
                window.location.reload();
            } else {
                navigate(targetPath);
            }
        } else if (notification.fromUserId) {
            const targetPath = `/profile/id/${notification.fromUserId}`;
            if (location.pathname === targetPath) {
                window.location.reload();
            } else {
                navigate(targetPath);
            }
        }
    };

    const getProfileInfo = (notification: Notification) => {
        if (notification.type === 'message') {
            return {
                image: notification.senderProfileImage,
                name: notification.senderName || '알 수 없음'
            };
        }
        return {
            image: notification.fromProfileImage,
            name: notification.fromUsername || '알 수 없음'
        };
    };

    const getNotificationIcon = (notification: Notification) => {
        switch (notification.type) {
            case 'message': return '💬';
            case 'follow': return '👤';
            case 'follow_request': return '🔔';
            case 'follow_accept': return '✅';
            default: return '🔔';
        }
    };

    return (
        <>
            <div className="notification-overlay" onClick={onClose} />
            <div className="notification-dropdown">
                <div className="notification-header">
                    <h3>알림</h3>
                    {notifications.filter(n => n.isUnread).length > 0 && (
                        <button className="mark-all-read-btn" onClick={() => markAllAsRead()}>모두 읽음</button>
                    )}
                </div>

                <div className="notification-list">
                    {notifications.length === 0 ? (
                        <div className="notification-empty">
                            <span className="empty-icon">🔔</span>
                            <p>알림이 없습니다</p>
                        </div>
                    ) : (
                        notifications.map((notification) => {
                            const profile = getProfileInfo(notification);
                            return (
                                <div
                                    key={notification.id}
                                    className={`notification-item ${notification.type} ${notification.isUnread ? 'unread' : ''}`}
                                    onClick={() => handleNotificationClick(notification)}
                                >
                                    <div className="notification-avatar">
                                        {getProfileImageUrl(profile.image) ? (
                                            <img src={getProfileImageUrl(profile.image)!} alt={profile.name} />
                                        ) : (
                                            <div className="avatar-placeholder">{profile.name.charAt(0).toUpperCase()}</div>
                                        )}
                                        <span className="notification-type-icon">{getNotificationIcon(notification)}</span>
                                    </div>

                                    <div className="notification-content">
                                        <div className="notification-title">{notification.title}</div>
                                        <div className="notification-text">{notification.text}</div>

                                        {/* ✅ 팔로우 요청일 때만 수락/거절 버튼 표시 */}
                                        {notification.type === 'follow_request' && (
                                            <div className="notif-actions">
                                                <button
                                                    className="notif-accept-btn"
                                                    onClick={(e) => handleAcceptFollow(e, notification)}
                                                    disabled={loadingId === notification.id}
                                                >
                                                    {loadingId === notification.id ? '...' : '수락'}
                                                </button>
                                                <button
                                                    className="notif-reject-btn"
                                                    onClick={(e) => handleRejectFollow(e, notification)}
                                                    disabled={loadingId === notification.id}
                                                >
                                                    {loadingId === notification.id ? '...' : '거절'}
                                                </button>
                                            </div>
                                        )}

                                        <div className="notification-time">{notification.time}</div>
                                    </div>

                                    <button
                                        className="notification-delete-btn"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removeNotification(notification.id);
                                        }}
                                    >✕</button>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </>
    );
};

export default NotificationDropdown;