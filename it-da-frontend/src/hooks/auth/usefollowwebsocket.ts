import { useEffect, useRef, useCallback } from 'react';
import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useNotificationStore } from '../../stores/useNotificationStore';

const WS_URL = 'http://localhost:8080/ws';

export interface FollowNotification {
    type: 'FOLLOW' | 'FOLLOW_REQUEST' | 'PROFILE_INFO_UPDATE';
    fromUserId: number;
    fromUsername: string;
    fromProfileImage?: string;
    toUserId: number;
    newFollowerCount?: number;
    userId?: number;
    username?: string;
    profileImageUrl?: string;
}

interface UseFollowWebSocketOptions {
    userId?: number;
    onNotification?: (notification: FollowNotification) => void;
}

export function useFollowWebSocket({ userId, onNotification }: UseFollowWebSocketOptions) {
    const clientRef = useRef<Client | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const connect = useCallback(() => {
        if (!userId) {
            console.log('[WebSocket] userId 없음, 연결 스킵');
            return;
        }

        if (clientRef.current?.connected) {
            console.log('[WebSocket] 이미 연결됨');
            return;
        }

        console.log('[WebSocket] Opening Web Socket...');

        const client = new Client({
            webSocketFactory: () => new SockJS(WS_URL),
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
            debug: (str) => {
                if (str.includes('CONNECT') || str.includes('SUBSCRIBE') || str.includes('MESSAGE')) {
                    console.log('[WebSocket]', str);
                }
            },
            onConnect: () => {
                console.log('[WebSocket] Web Socket Opened...');

                // ✅ 팔로우 알림 구독
                client.subscribe(`/topic/follow/${userId}`, (message: IMessage) => {
                    try {
                        const data: FollowNotification = JSON.parse(message.body);
                        console.log('🔔 팔로우 알림 수신:', data);

                        if (data.type === 'FOLLOW') {
                            useNotificationStore.getState().addFollowNotification({
                                fromUserId: data.fromUserId,
                                fromUsername: data.fromUsername,
                                fromProfileImage: data.fromProfileImage,
                                toUserId: data.toUserId,
                                newFollowerCount: data.newFollowerCount,
                            });
                        }

                        if (data.type === 'FOLLOW_REQUEST') {
                            useNotificationStore.getState().addFollowRequestNotification({
                                fromUserId: data.fromUserId,
                                fromUsername: data.fromUsername,
                                fromProfileImage: data.fromProfileImage,
                                toUserId: data.toUserId,
                            });
                        }

                        if (onNotification && (data.type === 'FOLLOW' || data.type === 'FOLLOW_REQUEST')) {
                            onNotification(data);
                        }
                    } catch (e) {
                        console.error('[WebSocket] 메시지 파싱 에러:', e);
                    }
                });
                console.log(`[WebSocket] >>> SUBSCRIBE /topic/follow/${userId}`);

                // ✅ 전체 프로필 업데이트 구독 (알림창에서 닉네임/프로필 사진 실시간 반영)
                client.subscribe('/topic/profile/updates', (message: IMessage) => {
                    try {
                        const data = JSON.parse(message.body);
                        console.log('📡 전체 프로필 업데이트 수신:', data);

                        if (data.type === 'PROFILE_INFO_UPDATE' && data.userId) {
                            useNotificationStore.getState().updateUserProfile(data.userId, {
                                username: data.username,
                                profileImage: data.profileImageUrl,
                            });
                        }
                    } catch (e) {
                        console.error('[WebSocket] 프로필 업데이트 파싱 에러:', e);
                    }
                });
                console.log('[WebSocket] >>> SUBSCRIBE /topic/profile/updates');

                console.log('✅ WebSocket 연결됨');
            },
            onDisconnect: () => {
                console.log('[WebSocket] 연결 해제됨');
            },
            onStompError: (frame) => {
                console.error('[WebSocket] STOMP 에러:', frame.headers['message']);
                if (!reconnectTimeoutRef.current) {
                    reconnectTimeoutRef.current = setTimeout(() => {
                        reconnectTimeoutRef.current = null;
                        connect();
                    }, 5000);
                }
            },
            onWebSocketError: (event) => {
                console.error('[WebSocket] WebSocket 에러:', event);
            },
        });

        client.activate();
        clientRef.current = client;
    }, [userId, onNotification]);

    const disconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }

        if (clientRef.current) {
            console.log('[WebSocket] 연결 종료 중...');
            clientRef.current.deactivate();
            clientRef.current = null;
        }
    }, []);

    useEffect(() => {
        if (userId) {
            connect();
        }

        return () => {
            disconnect();
        };
    }, [userId, connect, disconnect]);

    return {
        isConnected: clientRef.current?.connected ?? false,
        disconnect,
        reconnect: connect,
    };
}

export default useFollowWebSocket;