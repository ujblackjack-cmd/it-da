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

    // ✅ 현재 userId를 number로 안전하게 가져오기
    const myUserId = user?.userId ? Number(user.userId) : null;

    const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior });
        }, 50);
    }, []);

    // ✅ 새 메시지 수신 핸들러
    const handleNewMessage = useCallback((message: UserChatMessage) => {
        console.log('📩 새 메시지 수신:', message);
        const currentUser = userRef.current;
        const currentUserId = currentUser?.userId ? Number(currentUser.userId) : null;
        const currentRoomId = roomId ? parseInt(roomId) : null;
        const messageSenderId = Number(message.senderId);

        // 내가 보낸 메시지인 경우 (optimistic update 대체)
        if (messageSenderId === currentUserId) {
            const messageKey = `${message.content}-${message.senderId}`;
            if (pendingMessagesRef.current.has(messageKey)) {
                pendingMessagesRef.current.delete(messageKey);
                setLocalMessages(prev => {
                    const tempIndex = prev.findIndex(m =>
                        m.content === message.content &&
                        Number(m.senderId) === messageSenderId &&
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
        } else {
            // ✅ 상대방이 메시지를 보냈다 = 상대방이 채팅방에 있다 = 내 이전 메시지들은 읽힌 것!
            setLocalMessages(prev => prev.map(msg =>
                Number(msg.senderId) === currentUserId ? { ...msg, isRead: true } : msg
            ));

            // ✅ 상대방 메시지 수신 시 자동 읽음 처리
            if (currentRoomId && currentUserId) {
                apiClient.post(`/api/user-chat/room/${currentRoomId}/read?userId=${currentUserId}`)
                    .catch(err => console.error('읽음 처리 실패:', err));
            }
        }

        // 메시지 추가 (중복 방지)
        setLocalMessages(prev => {
            if (prev.some(m => m.messageId === message.messageId)) {
                return prev;
            }
            return [...prev, message];
        });
    }, [roomId]);

    // ✅ 읽음 처리 핸들러 (상대방이 내 메시지를 읽었을 때)
    const handleMessagesRead = useCallback((rId: number, readerId: number) => {
        const currentUser = userRef.current;
        const currentUserId = currentUser?.userId ? Number(currentUser.userId) : null;
        const readerIdNum = Number(readerId);

        console.log('👁️ handleMessagesRead 호출:', {
            roomId: rId,
            readerId: readerIdNum,
            myUserId: currentUserId,
            isDifferent: readerIdNum !== currentUserId
        });

        // ✅ 상대방이 읽은 경우 (readerId가 나와 다름)
        if (currentUserId !== null && readerIdNum !== currentUserId) {
            console.log('✅ 상대방이 읽음! 내 메시지들 isRead: true로 변경');
            setLocalMessages(prev => {
                const updated = prev.map(msg => {
                    // ✅ 내가 보낸 메시지만 isRead: true로
                    if (Number(msg.senderId) === currentUserId) {
                        return { ...msg, isRead: true };
                    }
                    return msg;
                });
                console.log('📝 업데이트 완료, 내 메시지 개수:', updated.filter(m => Number(m.senderId) === currentUserId).length);
                return updated;
            });
        }
    }, []);

    // ✅ 웹소켓 연결
    useUserChatWebSocket({
        userId: user?.userId,
        roomId: roomId ? parseInt(roomId) : undefined,
        onNewMessage: handleNewMessage,
        onMessagesRead: handleMessagesRead,
    });

    // ✅ roomId 변경 시 상태 초기화
    useEffect(() => {
        setLocalMessages([]);
        setChatRoom(null);
        setLoading(true);
    }, [roomId]);

    // ✅ 채팅방 데이터 로드
    useEffect(() => {
        const fetchChatRoom = async () => {
            if (!roomId || !myUserId) return;

            setLoading(true);
            try {
                const roomResponse = await apiClient.get(`/api/user-chat/room/${roomId}?userId=${myUserId}`);
                const roomData = roomResponse.data;

                setChatRoom({
                    roomId: roomData.roomId,
                    otherUserId: roomData.otherUserId,
                    otherUsername: roomData.otherUsername,
                    otherProfileImage: roomData.otherProfileImage,
                });

                const messagesResponse = await apiClient.get(`/api/user-chat/room/${roomId}/messages?userId=${myUserId}`);
                const messagesData = messagesResponse.data;

                const messagesWithIsMine = (messagesData || []).map((msg: any) => ({
                    messageId: msg.messageId,
                    roomId: msg.roomId || parseInt(roomId),
                    senderId: Number(msg.senderId),  // ✅ 항상 Number로 변환
                    senderName: msg.senderName,
                    senderProfileImage: msg.senderProfileImage,
                    content: msg.content,
                    createdAt: msg.createdAt,
                    isRead: msg.isRead ?? false,
                    isMine: Number(msg.senderId) === myUserId,
                }));

                setLocalMessages(messagesWithIsMine);
                setCurrentRoomId(parseInt(roomId));

                setTimeout(() => {
                    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
                }, 100);

                // ✅ 채팅방 입장 시 읽음 처리
                await apiClient.post(`/api/user-chat/room/${roomId}/read?userId=${myUserId}`);

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
    }, [roomId, myUserId, setCurrentRoomId]);

    // ✅ 스크롤
    useEffect(() => {
        if (localMessages.length > 0 && !loading) {
            scrollToBottom('smooth');
        }
    }, [localMessages.length, loading, scrollToBottom]);

    // ✅ 메시지 전송
    const handleSend = async () => {
        if (!inputValue.trim() || !roomId || !myUserId || sending) return;

        const content = inputValue.trim();
        setInputValue('');
        setSending(true);

        const messageKey = `${content}-${myUserId}`;
        pendingMessagesRef.current.add(messageKey);

        const optimisticMessage: UserChatMessage = {
            messageId: Date.now(),
            roomId: parseInt(roomId),
            senderId: myUserId,
            senderName: user?.username || '',
            senderProfileImage: user?.profileImageUrl,
            content,
            createdAt: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
            isRead: false,
            isMine: true,
        };

        setLocalMessages(prev => [...prev, optimisticMessage]);

        try {
            await apiClient.post(`/api/user-chat/room/${roomId}/message?userId=${myUserId}`, { content });
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

    // ✅ 메시지가 내 것인지 확인하는 헬퍼 함수
    const isMyMessage = (senderId: number): boolean => {
        return myUserId !== null && Number(senderId) === myUserId;
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
                    localMessages.map((msg) => {
                        const isMine = isMyMessage(msg.senderId);
                        return (
                            <div key={msg.messageId} className={`message-wrapper ${isMine ? 'mine' : 'other'}`}>
                                {/* ✅ 상대방 메시지일 때만 아바타 표시 */}
                                {!isMine && (
                                    <div className="message-avatar" onClick={() => chatRoom && navigate(`/profile/id/${chatRoom.otherUserId}`)}>
                                        {getProfileImageUrl(msg.senderProfileImage) ? (
                                            <img src={getProfileImageUrl(msg.senderProfileImage)!} alt="" />
                                        ) : (
                                            <div className="avatar-placeholder">{msg.senderName?.charAt(0).toUpperCase() || '?'}</div>
                                        )}
                                    </div>
                                )}

                                <div className="message-content-wrapper">
                                    {!isMine && <span className="sender-name">{msg.senderName}</span>}

                                    <div className={`message-row ${isMine ? 'mine' : 'other'}`}>
                                        {/* ✅ 내 메시지: 왼쪽에 시간/읽음 표시 */}
                                        {isMine && (
                                            <div className="message-info mine">
                                                {!msg.isRead && <span className="unread-indicator">1</span>}
                                                <span className="message-time">{msg.createdAt.split(' ').pop() || msg.createdAt}</span>
                                            </div>
                                        )}

                                        <div className={`message-bubble ${isMine ? 'mine' : 'other'}`}>{msg.content}</div>

                                        {/* ✅ 상대 메시지: 오른쪽에 시간 표시 */}
                                        {!isMine && (
                                            <div className="message-info">
                                                <span className="message-time">{msg.createdAt.split(' ').pop() || msg.createdAt}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
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
