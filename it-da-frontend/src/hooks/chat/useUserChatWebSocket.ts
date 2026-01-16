import { useCallback, useEffect, useRef } from 'react';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useUserChatStore, UserChatMessage } from '@/stores/useUserChatStore';
import { useNotificationStore } from '@/stores/useNotificationStore';

const WS_URL = 'http://localhost:8080/ws';

interface UseUserChatWebSocketProps {
    userId?: number;
    roomId?: number;
    onNewMessage?: (message: UserChatMessage) => void;
    onMessagesRead?: (roomId: number, readerId: number) => void;
}

const useUserChatWebSocket = ({
                                  userId,
                                  roomId,
                                  onNewMessage,
                                  onMessagesRead,
                              }: UseUserChatWebSocketProps) => {
    const clientRef = useRef<Client | null>(null);
    const roomSubscriptionRef = useRef<StompSubscription | null>(null);

    const onNewMessageRef = useRef(onNewMessage);
    const onMessagesReadRef = useRef(onMessagesRead);

    useEffect(() => {
        onNewMessageRef.current = onNewMessage;
    }, [onNewMessage]);

    useEffect(() => {
        onMessagesReadRef.current = onMessagesRead;
    }, [onMessagesRead]);

    const {
        updateChatRoom,
        setNewMessageNotification,
        increaseTotalUnread,
    } = useUserChatStore();

    const subscribeToRoom = useCallback((client: Client, rId: number) => {
        if (roomSubscriptionRef.current) {
            roomSubscriptionRef.current.unsubscribe();
            roomSubscriptionRef.current = null;
        }

        const subscription = client.subscribe(`/topic/chat/${rId}`, (message: IMessage) => {
            try {
                const data = JSON.parse(message.body);
                console.log('📨 채팅방 메시지 수신:', data);

                if (data.type === 'MESSAGES_READ') {
                    console.log('👁 읽음 이벤트 수신! roomId:', data.roomId, 'readerId:', data.readerId);
                    onMessagesReadRef.current?.(Number(data.roomId) || rId, Number(data.readerId));
                    return;
                }

                const chatMessage: UserChatMessage = {
                    messageId: data.messageId,
                    roomId: Number(data.roomId) || rId,
                    senderId: data.senderId,
                    senderName: data.senderName || data.senderNickname,
                    senderProfileImage: data.senderProfileImage,
                    content: data.content,
                    createdAt: data.createdAt || data.sentAt,
                    isRead: data.isRead ?? false,
                    isMine: data.senderId === userId,
                };
                onNewMessageRef.current?.(chatMessage);
            } catch (e) {
                console.error('[ChatWS] 채팅방 메시지 파싱 에러:', e);
            }
        });

        roomSubscriptionRef.current = subscription;
        console.log(`📡 /topic/chat/${rId} 구독 완료`);
    }, [userId]);

    const connect = useCallback(() => {
        if (!userId) return;
        if (clientRef.current?.connected) {
            if (roomId) {
                subscribeToRoom(clientRef.current, roomId);
            }
            return;
        }

        const client = new Client({
            webSocketFactory: () => new SockJS(WS_URL),
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
            debug: (str) => console.log('[STOMP]', str),
            onConnect: () => {
                console.log('✅ [ChatWS] 연결됨, userId:', userId, 'roomId:', roomId);

                client.subscribe(`/topic/message/${userId}`, (message: IMessage) => {
                    try {
                        const data = JSON.parse(message.body);
                        console.log('🔔 새 메시지 알림:', data);

                        // ✅ 핵심: Number로 타입 통일해서 비교
                        const currentRoomId = useUserChatStore.getState().currentRoomId;
                        const messageRoomId = Number(data.roomId);

                        console.log('📍 현재 채팅방:', currentRoomId, '(타입:', typeof currentRoomId, ')');
                        console.log('📍 메시지 채팅방:', messageRoomId, '(타입:', typeof messageRoomId, ')');
                        console.log('📍 같은 방?:', currentRoomId === messageRoomId);

                        // ✅ 현재 보고 있는 채팅방이 아닐 때만 알림
                        if (currentRoomId === null || currentRoomId !== messageRoomId) {
                            // 채팅방 밖에 있거나 다른 채팅방에 있을 때만 알림
                            if (currentRoomId === null) {
                                console.log('🔔 알림 표시 (채팅방 밖에 있음)');
                                setNewMessageNotification({
                                    roomId: messageRoomId,
                                    senderName: data.senderName,
                                    senderProfileImage: data.senderProfileImage,
                                    content: data.content,
                                });

                                useNotificationStore.getState().addMessageNotification({
                                    roomId: messageRoomId,
                                    senderId: data.senderId,
                                    senderName: data.senderName,
                                    senderProfileImage: data.senderProfileImage,
                                    content: data.content,
                                });

                                increaseTotalUnread(1);
                            } else if (currentRoomId !== messageRoomId) {
                                console.log('🔔 알림 표시 (다른 채팅방에 있음)');
                                setNewMessageNotification({
                                    roomId: messageRoomId,
                                    senderName: data.senderName,
                                    senderProfileImage: data.senderProfileImage,
                                    content: data.content,
                                });

                                useNotificationStore.getState().addMessageNotification({
                                    roomId: messageRoomId,
                                    senderId: data.senderId,
                                    senderName: data.senderName,
                                    senderProfileImage: data.senderProfileImage,
                                    content: data.content,
                                });

                                increaseTotalUnread(1);
                            }
                        } else {
                            console.log('🔕 알림 표시 안함 (같은 채팅방에 있음)');
                        }

                        updateChatRoom(messageRoomId, {
                            lastMessage: data.content,
                            lastMessageAt: data.createdAt,
                            unreadCount: currentRoomId === messageRoomId ? 0 : data.unreadCount,
                        });
                    } catch (e) {
                        console.error('[ChatWS] 메시지 파싱 에러:', e);
                    }
                });

                client.subscribe(`/topic/chatlist/${userId}`, (message: IMessage) => {
                    try {
                        const data = JSON.parse(message.body);
                        const currentRoomId = useUserChatStore.getState().currentRoomId;
                        const messageRoomId = Number(data.roomId);
                        updateChatRoom(messageRoomId, {
                            lastMessage: data.lastMessage,
                            lastMessageAt: data.lastMessageAt,
                            unreadCount: currentRoomId === messageRoomId ? 0 : data.unreadCount,
                        });
                    } catch (e) {
                        console.error('[ChatWS] 채팅목록 파싱 에러:', e);
                    }
                });

                if (roomId) {
                    subscribeToRoom(client, roomId);
                }
            },
            onDisconnect: () => {
                console.log('🔌 [ChatWS] 연결 해제');
                roomSubscriptionRef.current = null;
            },
            onStompError: (frame) => {
                console.error('[ChatWS] STOMP 에러:', frame.headers['message']);
            },
        });

        client.activate();
        clientRef.current = client;
    }, [userId, roomId, updateChatRoom, setNewMessageNotification, increaseTotalUnread, subscribeToRoom]);

    const disconnect = useCallback(() => {
        if (roomSubscriptionRef.current) {
            roomSubscriptionRef.current.unsubscribe();
            roomSubscriptionRef.current = null;
        }
        if (clientRef.current) {
            clientRef.current.deactivate();
            clientRef.current = null;
        }
    }, []);

    useEffect(() => {
        if (userId) {
            connect();
        }
        return () => {};
    }, [userId, connect]);

    useEffect(() => {
        if (roomId && clientRef.current?.connected) {
            subscribeToRoom(clientRef.current, roomId);
        }

        return () => {
            if (roomSubscriptionRef.current) {
                roomSubscriptionRef.current.unsubscribe();
                roomSubscriptionRef.current = null;
            }
        };
    }, [roomId, subscribeToRoom]);

    return {
        isConnected: clientRef.current?.connected ?? false,
        disconnect,
    };
};

export default useUserChatWebSocket;