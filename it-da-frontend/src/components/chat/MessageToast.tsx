import React, { useEffect } from 'react';
import './MessageToast.css';

interface MessageNotification {
    roomId: number;
    senderName: string;
    senderProfileImage?: string;
    content: string;
}

interface MessageToastProps {
    notification: MessageNotification | null;
    onClose: () => void;
}

const MessageToast: React.FC<MessageToastProps> = ({ notification, onClose }) => {
    // ❌ useNavigate() 제거 - Router 컨텍스트 밖에서 사용 불가
    // const navigate = useNavigate();

    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => {
                onClose();
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [notification, onClose]);

    if (!notification) return null;

    const getProfileImageUrl = (url?: string) => {
        if (!url) return null;
        if (url.startsWith('http')) return url;
        return `http://localhost:8080${url}`;
    };

    const handleClick = () => {
        // ✅ useNavigate 대신 window.location 사용
        window.location.href = `/user-chat/${notification.roomId}`;
        onClose();
    };

    return (
        <div className="message-toast" onClick={handleClick}>
            <div className="message-toast-avatar">
                {getProfileImageUrl(notification.senderProfileImage) ? (
                    <img src={getProfileImageUrl(notification.senderProfileImage)!} alt="" />
                ) : (
                    <div className="avatar-placeholder">
                        {notification.senderName.charAt(0).toUpperCase()}
                    </div>
                )}
            </div>
            <div className="message-toast-content">
                <div className="message-toast-header">
                    <span className="message-toast-sender">{notification.senderName}</span>
                    <span className="message-toast-label">새 메시지</span>
                </div>
                <p className="message-toast-text">{notification.content}</p>
            </div>
            <button className="message-toast-close" onClick={(e) => { e.stopPropagation(); onClose(); }}>
                ✕
            </button>
        </div>
    );
};

export default MessageToast;
