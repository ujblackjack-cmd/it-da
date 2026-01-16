import React, { useEffect, useState } from 'react';
import { router } from '../../../router';
import type { FollowNotification } from '../../../hooks/auth/useFollowWebSocket';
import './FollowToast.css';

interface Props {
    notification: FollowNotification | null;
    onClose: () => void;
    currentUserId?: number;
}

const FollowToast: React.FC<Props> = ({ notification, onClose, currentUserId }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (notification) {
            setIsVisible(true);
            // ✅ 모든 알림 5초 후 자동 사라짐 (팔로우 요청 포함)
            const timer = setTimeout(() => {
                setIsVisible(false);
                setTimeout(onClose, 300);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [notification, onClose]);

    if (!notification) return null;

    const handleClick = () => {
        router.navigate(`/profile/id/${notification.fromUserId}`);
        onClose();
    };

    const getProfileImage = () => {
        if (notification.fromProfileImage) {
            const imgUrl = notification.fromProfileImage.startsWith('http')
                ? notification.fromProfileImage
                : `http://localhost:8080${notification.fromProfileImage}`;
            return <img src={imgUrl} alt="" className="toast-avatar-img" />;
        }
        const initial = notification.fromUsername?.charAt(0).toUpperCase() || '?';
        return <div className="toast-avatar-placeholder">{initial}</div>;
    };

    const isFollowRequest = notification.type === 'FOLLOW_REQUEST';

    return (
        <div className={`follow-toast ${isVisible ? 'show' : 'hide'}`} onClick={handleClick}>
            <div className="toast-avatar">
                {getProfileImage()}
            </div>
            <div className="toast-content">
                <p className="toast-title">
                    {isFollowRequest ? '📩 새로운 팔로우 요청!' : '👤 새로운 팔로워!'}
                </p>
                <p className="toast-message">
                    <strong>{notification.fromUsername}</strong>님이
                    {isFollowRequest ? ' 팔로우를 요청했습니다' : ' 회원님을 팔로우했습니다'}
                </p>
                {/* ✅ 토스트에서는 버튼 제거 - 알림벨에서 처리 */}
                {isFollowRequest && (
                    <p className="toast-hint">🔔 알림에서 수락/거절하세요</p>
                )}
            </div>
            <button className="toast-close" onClick={(e) => { e.stopPropagation(); onClose(); }}>
                ✕
            </button>
        </div>
    );
};

export default FollowToast;