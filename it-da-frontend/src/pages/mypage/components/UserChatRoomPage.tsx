import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';
import { useUserChatStore, UserChatMessage } from '@/stores/useUserChatStore';
import useUserChatWebSocket from '@/hooks/chat/useUserChatWebSocket';
import apiClient from '@/api/client';
import './UserChatRoomPage.css';

interface ChatRoomInfo {
    roomId: number;
    otherUserId: number;
    otherUsername: string;
    otherProfileImage?: string;
}

const UserChatRoomPage: React.FC = () => {
    const { roomId } = useParams<{ roomId: string }>();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const { setCurrentRoomId } = useUserChatStore();

    const [chatRoom, setChatRoom] = useState<ChatRoomInfo | null>(null);
    const [localMessages, setLocalMessages] = useState<UserChatMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const pendingMessagesRef = useRef<Set<string>>(new Set());

    const userRef = useRef(user);
    useEffect(() => {
        userRef.current = user;
    }, [user]);

    const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior });
        }, 50);
    }, []);

    const handleNewMessage = useCallback((message: UserChatMessage) => {
        console.log('📩 새 메시지 수신:', message);
        const currentUser = userRef.current;
        const currentRoomId = roomId ? parseInt(roomId) : null;

        if (message.senderId === currentUser?.userId) {
            const messageKey = `${message.content}-${message.senderId}`;
            if (pendingMessagesRef.current.has(messageKey)) {
                pendingMessagesRef.current.delete(messageKey);
                setLocalMessages(prev => {
                    const tempIndex = prev.findIndex(m =>
                        m.content === message.content &&
                        m.senderId === message.senderId &&
                        m.messageId > 1000000000000
                    );
                    if (tempIndex !== -1) {
                        const newMessages = [...prev];
                        newMessages[tempIndex] = message;
                        return newMessages;
                    }
                    return prev;
                });
                return;
            }
            // handleNewMessage 함수 내 else 블록 (상대방 메시지 수신 시) 수정
        } else {
            // ✅ 상대방이 메시지를 보냈다 = 내 메시지들을 이미 읽었다!
            setLocalMessages(prev => prev.map(msg =>
                msg.senderId === currentUser?.userId ? { ...msg, isRead: true } : msg
            ));

            if (currentRoomId && currentUser?.userId) {
                console.log('📖 상대방 메시지 수신 - 자동 읽음 처리');
                apiClient.post(`/api/user-chat/room/${currentRoomId}/read?userId=${currentUser.userId}`)
                    .then(() => console.log('✅ 자동 읽음 처리 완료'))
                    .catch(err => console.error('읽음 처리 실패:', err));
            }
        }

        setLocalMessages(prev => {
            if (prev.some(m => m.messageId === message.messageId)) {
                return prev;
            }
            return [...prev, message];
        });
    }, [roomId]);

    const handleMessagesRead = useCallback((rId: number, readerId: number) => {
        const currentUser = userRef.current;
        console.log('👁 handleMessagesRead 호출됨:', { rId, readerId, myUserId: currentUser?.userId });

        if (currentUser && readerId !== currentUser.userId) {
            console.log('✅ 상대방이 읽음 - 내 메시지들 isRead: true로 변경');
            setLocalMessages(prev => {
                const updated = prev.map(msg => {
                    if (msg.senderId === currentUser.userId) {
                        return { ...msg, isRead: true };
                    }
                    return msg;
                });
                return updated;
            });
        }
    }, []);

    useUserChatWebSocket({
        userId: user?.userId,
        roomId: roomId ? parseInt(roomId) : undefined,
        onNewMessage: handleNewMessage,
        onMessagesRead: handleMessagesRead,
    });

    // ✅ roomId가 바뀔 때 상태 초기화 (fetchChatRoom useEffect 앞에 추가)
    useEffect(() => {
        setLocalMessages([]);
        setChatRoom(null);
        setLoading(true);
    }, [roomId]);

    useEffect(() => {
        const fetchChatRoom = async () => {
            if (!roomId || !user?.userId) return;

            setLoading(true);
            try {
                const roomResponse = await apiClient.get(`/api/user-chat/room/${roomId}?userId=${user.userId}`);
                const roomData = roomResponse.data;

                setChatRoom({
                    roomId: roomData.roomId,
                    otherUserId: roomData.otherUserId,
                    otherUsername: roomData.otherUsername,
                    otherProfileImage: roomData.otherProfileImage,
                });

                const messagesResponse = await apiClient.get(`/api/user-chat/room/${roomId}/messages?userId=${user.userId}`);
                const messagesData = messagesResponse.data;

                const messagesWithIsMine = (messagesData || []).map((msg: any) => ({
                    messageId: msg.messageId,
                    roomId: msg.roomId || parseInt(roomId),
                    senderId: msg.senderId,
                    senderName: msg.senderName,
                    senderProfileImage: msg.senderProfileImage,
                    content: msg.content,
                    createdAt: msg.createdAt,
                    isRead: msg.isRead ?? false,
                    isMine: msg.senderId === user.userId,
                }));

                setLocalMessages(messagesWithIsMine);
                setCurrentRoomId(parseInt(roomId));

                setTimeout(() => {
                    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
                }, 100);

                await apiClient.post(`/api/user-chat/room/${roomId}/read?userId=${user.userId}`);

            } catch (error) {
                console.error('채팅방 정보 로드 실패:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchChatRoom();

        return () => {
            setCurrentRoomId(null);
        };
    }, [roomId, user?.userId, setCurrentRoomId]);

    useEffect(() => {
        if (localMessages.length > 0 && !loading) {
            scrollToBottom('smooth');
        }
    }, [localMessages.length, loading, scrollToBottom]);

    const handleSend = async () => {
        if (!inputValue.trim() || !roomId || !user?.userId || sending) return;

        const content = inputValue.trim();
        setInputValue('');
        setSending(true);

        const messageKey = `${content}-${user.userId}`;
        pendingMessagesRef.current.add(messageKey);

        const optimisticMessage: UserChatMessage = {
            messageId: Date.now(),
            roomId: parseInt(roomId),
            senderId: user.userId,
            senderName: user.username || '',
            senderProfileImage: user.profileImageUrl,
            content,
            createdAt: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
            isRead: false,
            isMine: true,
        };

        setLocalMessages(prev => [...prev, optimisticMessage]);

        try {
            await apiClient.post(`/api/user-chat/room/${roomId}/message?userId=${user.userId}`, { content });
        } catch (error) {
            console.error('메시지 전송 실패:', error);
            pendingMessagesRef.current.delete(messageKey);
            setLocalMessages(prev => prev.filter(m => m.messageId !== optimisticMessage.messageId));
            setInputValue(content);
        } finally {
            setSending(false);
            inputRef.current?.focus();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            void handleSend();
        }
    };

    const getProfileImageUrl = (url?: string) => {
        if (!url) return null;
        if (url.startsWith('http')) return url;
        return `http://localhost:8080${url}`;
    };

    if (loading) {
        return (
            <div className="user-chat-room">
                <div className="chat-loading">불러오는 중...</div>
            </div>
        );
    }

    return (
        <div className="user-chat-room">
            <header className="chat-header">
                <button className="back-btn" onClick={() => navigate(-1)}>←</button>

                <div className="header-center">
                    <div className="header-avatar">
                        {getProfileImageUrl(chatRoom?.otherProfileImage) ? (
                            <img src={getProfileImageUrl(chatRoom?.otherProfileImage)!} alt="" />
                        ) : (
                            <div className="avatar-placeholder">
                                {chatRoom?.otherUsername?.charAt(0).toUpperCase() || '?'}
                            </div>
                        )}
                    </div>
                    <span className="header-name">{chatRoom?.otherUsername}</span>
                </div>

                <div className="header-actions">
                    <button className="header-icon-btn" onClick={() => navigate('/user-chat')} title="채팅 목록">💬</button>
                    <button className="header-icon-btn" onClick={() => navigate('/mypage')} title="마이페이지">🏠</button>
                    <button className="header-icon-btn" onClick={() => chatRoom && navigate(`/profile/id/${chatRoom.otherUserId}`)} title="상대방 프로필">👤</button>
                </div>
            </header>

            <div className="messages-container">
                {localMessages.length === 0 ? (
                    <div className="empty-messages"><p>대화를 시작해보세요!</p></div>
                ) : (
                    localMessages.map((msg) => (
                        <div key={msg.messageId} className={`message-wrapper ${msg.senderId === user?.userId ? 'mine' : 'other'}`}>
                            {msg.senderId !== user?.userId && (
                                <div className="message-avatar" onClick={() => chatRoom && navigate(`/profile/id/${chatRoom.otherUserId}`)}>
                                    {getProfileImageUrl(msg.senderProfileImage) ? (
                                        <img src={getProfileImageUrl(msg.senderProfileImage)!} alt="" />
                                    ) : (
                                        <div className="avatar-placeholder">{msg.senderName?.charAt(0).toUpperCase() || '?'}</div>
                                    )}
                                </div>
                            )}

                            <div className="message-content-wrapper">
                                {msg.senderId !== user?.userId && <span className="sender-name">{msg.senderName}</span>}

                                <div className={`message-row ${msg.senderId === user?.userId ? 'mine' : 'other'}`}>
                                    {msg.senderId === user?.userId && (
                                        <div className="message-info mine">
                                            {!msg.isRead && <span className="unread-indicator">1</span>}
                                            <span className="message-time">{msg.createdAt.split(' ').pop() || msg.createdAt}</span>
                                        </div>
                                    )}

                                    <div className={`message-bubble ${msg.senderId === user?.userId ? 'mine' : 'other'}`}>{msg.content}</div>

                                    {msg.senderId !== user?.userId && (
                                        <div className="message-info">
                                            <span className="message-time">{msg.createdAt.split(' ').pop() || msg.createdAt}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="chat-input-container">
                <div className="input-wrapper">
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="메시지를 입력하세요"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={sending}
                    />
                </div>
                <button
                    className={`send-btn ${inputValue.trim() ? 'active' : ''}`}
                    onClick={() => void handleSend()}
                    disabled={!inputValue.trim() || sending}
                >➤</button>
            </div>
        </div>
    );
};

export default UserChatRoomPage;