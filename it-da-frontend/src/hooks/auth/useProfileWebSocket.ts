import { useEffect, useRef, useCallback } from 'react';
import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const WS_URL = 'http://localhost:8080/ws';

export interface ProfileUpdate {
    type: string;
    fromUserId?: number;
    fromUsername?: string;
    fromProfileImage?: string;
    toUserId?: number;
    newFollowerCount?: number;
    userId?: number;
    username?: string;
    profileImageUrl?: string;
    bio?: string;
    mbti?: string;
    address?: string;
    isPublic?: boolean;
    // ✅ 참여 모임 카운트 등 동적 필드용 추가
    field?: string;
    value?: string | number | boolean;
    // ✅ 모임 완료 알림용 추가
    meetingId?: number;
    meetingTitle?: string;

    participationCount?: number;  // ✅ 추가
}

interface UseProfileWebSocketOptions {
    profileUserId?: number;
    currentUserId?: number;
    onProfileUpdate?: (update: ProfileUpdate) => void;
    onFollowRequest?: (update: ProfileUpdate) => void;
    onFollowAccepted?: (update: ProfileUpdate) => void;
    onFollowRejected?: (update: ProfileUpdate) => void;
}

export function useProfileWebSocket({
                                        profileUserId,
                                        currentUserId,
                                        onProfileUpdate,
                                        onFollowRequest,
                                        onFollowAccepted,
                                        onFollowRejected
                                    }: UseProfileWebSocketOptions) {
    const clientRef = useRef<Client | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleMessage = useCallback((data: ProfileUpdate) => {
        console.log('📊 [ProfileWS] 메시지 수신:', data);

        switch (data.type) {
            case 'PROFILE_UPDATE':
            case 'PROFILE_FOLLOWING_UPDATE':
            case 'PROFILE_INFO_UPDATE':
            case 'MEETING_COMPLETED':  // ✅ 모임 완료 타입 추가
            case 'MEETING_UPDATED':           // ✅ 추가!
            case 'PARTICIPATION_APPROVED':    // ✅ 추가!
                onProfileUpdate?.(data);
                break;

            case 'FOLLOW_REQUEST':
                console.log('🔔 팔로우 요청 알림:', data.fromUsername);
                onFollowRequest?.(data);
                break;

            case 'FOLLOW_ACCEPTED':
                console.log('🎉 팔로우 수락 알림:', data.fromUsername);
                onFollowAccepted?.(data);
                break;

            case 'FOLLOW_REJECTED':
                console.log('❌ 팔로우 거절 알림:', data.fromUsername);
                onFollowRejected?.(data);
                break;

            case 'FOLLOW':
                console.log('👤 새로운 팔로워:', data.fromUsername);
                onProfileUpdate?.(data);
                break;

            default:
                console.log('📦 알 수 없는 메시지 타입:', data.type);
                onProfileUpdate?.(data);
        }
    }, [onProfileUpdate, onFollowRequest, onFollowAccepted, onFollowRejected]);

    const connect = useCallback(() => {
        if (!profileUserId && !currentUserId) return;

        if (clientRef.current?.connected) {
            return;
        }

        const client = new Client({
            webSocketFactory: () => new SockJS(WS_URL),
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
            debug: (str) => {
                if (str.includes('SUBSCRIBE') || str.includes('MESSAGE')) {
                    console.log('[ProfileWS]', str);
                }
            },
            onConnect: () => {
                console.log('✅ [ProfileWS] 웹소켓 연결됨');

                if (profileUserId) {
                    client.subscribe(`/topic/profile/${profileUserId}`, (message: IMessage) => {
                        try {
                            const data: ProfileUpdate = JSON.parse(message.body);
                            handleMessage(data);
                        } catch (e) {
                            console.error('[ProfileWS] 파싱 에러:', e);
                        }
                    });
                    console.log(`📡 [ProfileWS] /topic/profile/${profileUserId} 구독`);
                }

                if (currentUserId && currentUserId !== profileUserId) {
                    client.subscribe(`/topic/profile/${currentUserId}`, (message: IMessage) => {
                        try {
                            const data: ProfileUpdate = JSON.parse(message.body);
                            handleMessage(data);
                        } catch (e) {
                            console.error('[ProfileWS] 파싱 에러:', e);
                        }
                    });
                    console.log(`📡 [ProfileWS] /topic/profile/${currentUserId} 구독 (내 알림)`);

                    client.subscribe(`/topic/follow/${currentUserId}`, (message: IMessage) => {
                        try {
                            const data: ProfileUpdate = JSON.parse(message.body);
                            handleMessage(data);
                        } catch (e) {
                            console.error('[ProfileWS] 파싱 에러:', e);
                        }
                    });
                    console.log(`📡 [ProfileWS] /topic/follow/${currentUserId} 구독 (팔로우 알림)`);
                }
            },
            onDisconnect: () => {
                console.log('🔌 [ProfileWS] 웹소켓 연결 해제');
            },
            onStompError: (frame) => {
                console.error('[ProfileWS] STOMP 에러:', frame.headers['message']);
                if (reconnectTimeoutRef.current) {
                    clearTimeout(reconnectTimeoutRef.current);
                }
                reconnectTimeoutRef.current = setTimeout(() => {
                    connect();
                }, 5000);
            },
        });

        client.activate();
        clientRef.current = client;
    }, [profileUserId, currentUserId, handleMessage]);

    useEffect(() => {
        connect();

        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            if (clientRef.current) {
                clientRef.current.deactivate();
                clientRef.current = null;
            }
        };
    }, [connect]);

    return {
        isConnected: clientRef.current?.connected ?? false,
    };
}

export default useProfileWebSocket;
