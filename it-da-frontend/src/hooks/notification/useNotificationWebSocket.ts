// src/hooks/useNotificationWebSocket.ts
import { useEffect, useRef } from 'react';
import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useAuthStore } from '@/stores/useAuthStore';
import { useNotificationStore } from '@/stores/useNotificationStore';
import toast from 'react-hot-toast';

// 환경변수 또는 하드코딩 (chat.api.ts와 동일하게)
const API_BASE_URL = "http://localhost:8080";

export const useNotificationWebSocket = () => {
    // 1. 현재 로그인한 유저 정보
    const user = useAuthStore((state) => state.user);
    // 2. 알림을 스토어에 넣는 함수
    const addNotification = useNotificationStore((state) => state.addNotificationFromBackend);

    const clientRef = useRef<Client | null>(null);

    useEffect(() => {
        // 로그인이 안 되어 있으면 연결하지 않음
        if (!user?.userId) return;

        // 웹소켓 클라이언트 설정
        const client = new Client({
            webSocketFactory: () => new SockJS(`${API_BASE_URL}/ws`),
            // debug: (str) => console.log(`🔔 [알림WS] ${str}`), // 디버깅 필요 시 주석 해제
            reconnectDelay: 5000, // 끊기면 5초 뒤 재연결 시도

            onConnect: () => {
                console.log(`✅ 알림 서버 연결 성공 (UserId: ${user.userId})`);

                /**
                 * 🔥 [핵심] 백엔드가 보내는 주소를 구독합니다.
                 * PushNotificationService.java에서 "/topic/notification/{userId}"로 보낸다고 가정합니다.
                 * 만약 백엔드 주소가 다르면 이 부분을 수정해야 합니다.
                 */
                client.subscribe(`/topic/notification/${user.userId}`, (message: IMessage) => {
                    if (message.body) {
                        try {
                            const newNotification = JSON.parse(message.body);
                            console.log("📨 실시간 알림 도착:", newNotification);

                            // 1. 스토어에 추가 (종 아이콘 빨간점 갱신)
                            addNotification(newNotification);

                            // 2. 화면에 토스트 팝업 띄우기
                            toast(newNotification.content || "새로운 알림이 도착했습니다!", {
                                icon: '🔔',
                                duration: 4000,
                                position: 'top-right',
                                style: {
                                    background: '#333',
                                    color: '#fff',
                                },
                            });
                        } catch (e) {
                            console.error("알림 데이터 파싱 에러:", e);
                        }
                    }
                });
            },
            onStompError: (frame) => {
                console.error('Broker reported error: ' + frame.headers['message']);
                console.error('Additional details: ' + frame.body);
            },
        });

        client.activate();
        clientRef.current = client;

        // 컴포넌트가 사라지거나 로그아웃 시 연결 해제
        return () => {
            if (client.connected) {
                console.log("🔌 알림 서버 연결 해제");
                client.deactivate();
            }
        };
    }, [user?.userId, addNotification]);
};