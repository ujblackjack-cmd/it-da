// src/hooks/badge/UseBadgeWebSocket.ts
import { useEffect, useRef, useCallback, useState } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { useQueryClient } from "@tanstack/react-query";

interface BadgeUnlockedPayload {
    type: "BADGE_UNLOCKED";
    notificationId: number;
    notificationType: string;
    title: string;
    content: string;
    badgeId: number;
    badgeCode: string;
    badgeName: string;
    badgeIcon: string;
    badgeGrade: string;
    badgeCategory: string;
    badgeDescription: string;
    linkUrl: string;
    sentAt: string;
    isRead: boolean;
}

interface UseBadgeWebSocketOptions {
    userId: number | undefined;
    enabled?: boolean;
}

interface ToastState {
    visible: boolean;
    badge: BadgeUnlockedPayload | null;
}

/**
 * 배지 획득 실시간 알림 WebSocket 훅
 */
export function useBadgeWebSocket({ userId, enabled = true }: UseBadgeWebSocketOptions) {
    const clientRef = useRef<Client | null>(null);
    const queryClient = useQueryClient();

    const [isConnected, setIsConnected] = useState(false);
    const [toast, setToast] = useState<ToastState>({ visible: false, badge: null });

    const hideToast = useCallback(() => {
        setToast({ visible: false, badge: null });
    }, []);

    const handleBadgeUnlocked = useCallback((payload: BadgeUnlockedPayload) => {
        console.log("🏆 [BadgeWS] 배지 획득 알림 수신:", payload);

        // 1. 토스트 알림 표시
        setToast({ visible: true, badge: payload });

        // 5초 후 자동 닫기
        setTimeout(() => {
            setToast({ visible: false, badge: null });
        }, 5000);

        // 2. 배지 목록 새로고침
        void queryClient.invalidateQueries({ queryKey: ["badges"] });

        // 3. 알림 목록 새로고침 (알림벨에 표시)
        void queryClient.invalidateQueries({ queryKey: ["notifications"] });

    }, [queryClient]);

    useEffect(() => {
        if (!userId || !enabled) {
            return;
        }

        const wsUrl = import.meta.env?.VITE_WS_URL ?? "http://localhost:8080/ws";

        const client = new Client({
            webSocketFactory: () => new SockJS(wsUrl),
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,

            onConnect: () => {
                console.log("🏆 [BadgeWS] WebSocket 연결됨. userId:", userId);
                setIsConnected(true);

                // 배지 전용 채널 구독
                client.subscribe(`/topic/badge/${userId}`, (message) => {
                    try {
                        const payload = JSON.parse(message.body);

                        if (payload.type === "BADGE_UNLOCKED") {
                            handleBadgeUnlocked(payload as BadgeUnlockedPayload);
                        }
                    } catch (err) {
                        console.error("🏆 [BadgeWS] 메시지 파싱 오류:", err);
                    }
                });
            },

            onDisconnect: () => {
                console.log("🏆 [BadgeWS] WebSocket 연결 해제됨");
                setIsConnected(false);
            },

            onStompError: (frame) => {
                console.error("🏆 [BadgeWS] STOMP 에러:", frame);
                setIsConnected(false);
            },
        });

        client.activate();
        clientRef.current = client;

        return () => {
            if (clientRef.current) {
                void clientRef.current.deactivate();
            }
        };
    }, [userId, enabled, handleBadgeUnlocked]);

    return {
        isConnected,
        toast,
        hideToast,
    };
}