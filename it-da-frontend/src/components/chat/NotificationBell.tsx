import React, { useEffect, useRef } from 'react';
import { useNotificationStore, Notification } from '@/stores/useNotificationStore';
import './NotificationBell.css';

const NotificationBell: React.FC = () => {
    const {
        notifications,
        unreadCount,
        isOpen,
        toggleDropdown,
        closeDropdown,
        markAsRead,
        markAllAsRead,
        removeNotification
    } = useNotificationStore();

    const dropdownRef = useRef<HTMLDivElement>(null);

    // 외부 클릭 시 드롭다운 닫기
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                closeDropdown();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [closeDropdown]);

    const getProfileImageUrl = (url?: string) => {
        if (!url) return null;
        if (url.startsWith('http')) return url;
        return `http://localhost:8080${url}`;
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return '방금 전';
        if (diffMins < 60) return `${diffMins}분 전`;
        if (diffHours < 24) return `${diffHours}시간 전`;
        if (diffDays < 7) return `${diffDays}일 전`;
        return date.toLocaleDateString();
    };

    // ✅ 알림 클릭 핸들러 - 타입별로 다른 동작
    const handleNotificationClick = (notification: Notification) => {
        markAsRead(notification.id);

        if (notification.type === 'message' && notification.roomId) {
            // 메시지 알림 → 채팅방으로 이동
            window.location.href = `/user-chat/${notification.roomId}`;
        } else if (notification.fromUserId) {
            // 팔로우 알림 → 해당 유저 프로필로 이동
            window.location.href = `/users/${notification.fromUserId}`;
        }

        closeDropdown();
    };

    // ✅ 알림 아이콘 렌더링
    const renderNotificationIcon = (notification: Notification) => {
        if (notification.type === 'message') {
            return (
                <div className="notification-icon message-icon">
                    💬
                </div>
            );
        }
        return (
            <div className="notification-icon follow-icon">
                👤
            </div>
        );
    };

    // ✅ 알림 내용 렌더링
    const renderNotificationContent = (notification: Notification) => {
        if (notification.type === 'message') {
            return (
                <>
                    <span className="notification-sender">{notification.senderName}</span>
                    <span className="notification-text">님이 메시지를 보냈습니다</span>
                    <p className="notification-preview">{notification.content}</p>
                </>
            );
        }

        // ✅ message 속성 사용 (text도 가능)
        return (
            <span className="notification-text">{notification.message || notification.text}</span>
        );
    };

    // ✅ 프로필 이미지 가져오기
    const getNotificationProfile = (notification: Notification) => {
        if (notification.type === 'message') {
            return notification.senderProfileImage;
        }
        return notification.fromProfileImage;
    };

    const getNotificationName = (notification: Notification) => {
        if (notification.type === 'message') {
            return notification.senderName || '알 수 없음';
        }
        return notification.fromUsername || '알 수 없음';
    };

    return (
        <div className="notification-bell-container" ref={dropdownRef}>
            <button className="notification-bell-btn" onClick={toggleDropdown}>
                🔔
                {unreadCount > 0 && (
                    <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
                )}
            </button>

            {isOpen && (
                <div className="notification-dropdown">
                    <div className="notification-header">
                        <h3>알림</h3>
                        {notifications.length > 0 && (
                            <button className="mark-all-read-btn" onClick={markAllAsRead}>
                                모두 읽음
                            </button>
                        )}
                    </div>

                    <div className="notification-list">
                        {notifications.length === 0 ? (
                            <div className="notification-empty">
                                <span>🔕</span>
                                <p>새로운 알림이 없습니다</p>
                            </div>
                        ) : (
                            notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    className={`notification-item ${notification.type} ${!notification.isRead ? 'unread' : ''}`}
                                    onClick={() => handleNotificationClick(notification)}
                                >
                                    <div className="notification-avatar">
                                        {getProfileImageUrl(getNotificationProfile(notification)) ? (
                                            <img
                                                src={getProfileImageUrl(getNotificationProfile(notification))!}
                                                alt=""
                                            />
                                        ) : (
                                            <div className="avatar-placeholder">
                                                {getNotificationName(notification).charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        {renderNotificationIcon(notification)}
                                    </div>

                                    <div className="notification-content">
                                        {renderNotificationContent(notification)}
                                        <span className="notification-time">
                                            {formatTime(notification.createdAt)}
                                        </span>
                                    </div>

                                    <button
                                        className="notification-delete-btn"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removeNotification(notification.id);
                                        }}
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
