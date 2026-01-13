import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotificationStore, Notification } from '@/stores/useNotificationStore';
import './NotificationDropdown.css';

const NotificationDropdown = () => {
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const { 
    notifications, 
    unreadCount, 
    isOpen,
    markAsRead,
    markAllAsRead,
    toggleDropdown,
    closeDropdown 
  } = useNotificationStore();

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        closeDropdown();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, closeDropdown]);

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }
    
    if (notification.link) {
      navigate(notification.link);
    }
    
    closeDropdown();
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'join':
        return '👥';
      case 'message':
        return '💬';
      case 'reminder':
        return '⏰';
      case 'system':
        return '🔔';
      default:
        return '📢';
    }
  };

  return (
    <div className="notification-container" ref={dropdownRef}>
      <button 
        className="notification-btn"
        onClick={toggleDropdown}
        aria-label="알림"
      >
        🔔
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h3>알림</h3>
            {unreadCount > 0 && (
              <button 
                className="mark-all-read"
                onClick={markAllAsRead}
              >
                모두 읽음
              </button>
            )}
          </div>

          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="notification-empty">
                <p>알림이 없습니다</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`notification-item ${!notification.isRead ? 'unread' : ''}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="notification-icon">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="notification-content">
                    <div className="notification-title">
                      {notification.title}
                    </div>
                    <div className="notification-text">
                      {notification.content}
                    </div>
                    <div className="notification-time">
                      {notification.time}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;