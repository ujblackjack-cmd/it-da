import React from 'react';
import './NotificationDropdown.css';

interface Notification {
    id: number;
    title: string;
    text: string;
    time: string;
    isUnread: boolean;
}

interface Props {
    isOpen: boolean;
    notifications: Notification[];
    onClose: () => void;
    onMarkAllRead: () => void;
    onNotificationClick: (id: number) => void;
}

const NotificationDropdown: React.FC<Props> = ({
                                                   isOpen,
                                                   notifications,
                                                   onClose,
                                                   onMarkAllRead,
                                                   onNotificationClick,
                                               }) => {
    if (!isOpen) return null;

    return (
        <>
            <div className="notification-overlay" onClick={onClose} />
            <div className="notification-dropdown">
                <div className="notification-header">
                    <h3>알림</h3>
                    <button className="mark-all-read" onClick={onMarkAllRead}>
                        모두 읽음
                    </button>
                </div>

                <div className="notification-list">
                    {notifications.length === 0 ? (
                        <div className="notification-empty">알림이 없습니다</div>
                    ) : (
                        notifications.map((notif) => (
                            <div
                                key={notif.id}
                                className={`notification-item ${notif.isUnread ? 'unread' : ''}`}
                                onClick={() => onNotificationClick(notif.id)}
                            >
                                <div className="notification-content">
                                    <div className="notification-title">{notif.title}</div>
                                    <div className="notification-text">{notif.text}</div>
                                    <div className="notification-time">{notif.time}</div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </>
    );
};

export default NotificationDropdown;