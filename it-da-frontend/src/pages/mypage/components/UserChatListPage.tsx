import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';
import { useUserChatStore } from '@/stores/useUserChatStore';
import userChatApi from '@/api/userChat.api';
import useUserChatWebSocket from '@/hooks/chat/useUserChatWebSocket';
import './UserChatListPage.css';

const UserChatListPage: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const { chatRooms, setChatRooms, totalUnreadCount, setTotalUnreadCount } = useUserChatStore();
    const [loading, setLoading] = useState(true);

    useUserChatWebSocket({ userId: user?.userId });

    useEffect(() => {
        const loadChatRooms = async () => {
            if (!user?.userId) return;
            try {
                const [rooms, unreadCount] = await Promise.all([
                    userChatApi.getMyChatRooms(user.userId),
                    userChatApi.getUnreadCount(user.userId),
                ]);
                setChatRooms(rooms);
                setTotalUnreadCount(unreadCount);
            } catch (e) {
                console.error('채팅 목록 로드 실패:', e);
            } finally {
                setLoading(false);
            }
        };
        void loadChatRooms();
    }, [user?.userId, setChatRooms, setTotalUnreadCount]);

    const getProfileImageUrl = (url?: string) => {
        if (!url) return null;
        if (url.startsWith('http')) return url;
        return `http://localhost:8080${url}`;
    };

    if (loading) {
        return (
            <div className="chat-list-page">
                <div className="chat-list-loading">
                    <div className="loading-spinner"></div>
                    <p>불러오는 중...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="chat-list-page">
            <header className="chat-list-header">
                <button className="header-btn" onClick={() => navigate(-1)}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </button>
                <h1>
                    채팅
                    {totalUnreadCount > 0 && <span className="header-badge">{totalUnreadCount}</span>}
                </h1>
                <button className="header-btn" onClick={() => navigate('/mypage')}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M9 22V12H15V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </button>
            </header>

            <div className="chat-list">
                {chatRooms.length === 0 ? (
                    <div className="chat-list-empty">
                        <div className="empty-icon">💬</div>
                        <h3>아직 채팅이 없습니다</h3>
                        <p>프로필에서 메시지를 보내보세요!</p>
                        <button className="empty-btn" onClick={() => navigate('/mypage')}>마이페이지로 이동</button>
                    </div>
                ) : (
                    chatRooms.map((room) => (
                        <div
                            key={room.roomId}
                            className={`chat-room-card ${room.unreadCount > 0 ? 'has-unread' : ''}`}
                            onClick={() => navigate(`/user-chat/${room.roomId}`)}
                        >
                            <div className="room-avatar">
                                {getProfileImageUrl(room.otherProfileImage) ? (
                                    <img src={getProfileImageUrl(room.otherProfileImage)!} alt={room.otherUsername} />
                                ) : (
                                    <div className="avatar-placeholder">{room.otherUsername.charAt(0).toUpperCase()}</div>
                                )}
                                {room.unreadCount > 0 && <span className="online-dot"></span>}
                            </div>

                            <div className="room-content">
                                <div className="room-top">
                                    <span className="room-name">{room.otherUsername}</span>
                                    <span className="room-time">{room.lastMessageAt || ''}</span>
                                </div>
                                <div className="room-bottom">
                                    <p className="room-message">{room.lastMessage || '대화를 시작해보세요!'}</p>
                                    {room.unreadCount > 0 && (
                                        <span className="unread-count">{room.unreadCount > 99 ? '99+' : room.unreadCount}</span>
                                    )}
                                </div>
                            </div>

                            <div className="room-arrow">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                    <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default UserChatListPage;