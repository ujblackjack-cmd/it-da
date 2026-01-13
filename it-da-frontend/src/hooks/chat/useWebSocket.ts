import { useEffect, useRef, useCallback } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import type { ChatMessage } from "../../types/chat.types";

export const useWebSocket = (
    roomId: number,
    onMessageReceived: (msg: ChatMessage) => void
) => {
    const stompClient = useRef<Client | null>(null);

    useEffect(() => {
        const socket = new SockJS("http://localhost:8080/ws");

        const client = new Client({
            webSocketFactory: () => socket as any,
            onConnect: () => {
                client.subscribe(`/topic/room/${roomId}`, (frame) => {
                    onMessageReceived(JSON.parse(frame.body));
                });
            },
        });

        stompClient.current = client;
        client.activate();

        return () => {
            // Promise 반환이라 void로 먹여서 타입 깔끔하게
            void client.deactivate();
        };
    }, [roomId, onMessageReceived]);

    const sendMessage = useCallback(
        (content: string, email: string) => {
            const client = stompClient.current;
            if (client?.connected) {
                client.publish({
                    destination: `/app/chat/send/${roomId}`,
                    body: JSON.stringify({ email, content }),
                });
            }
        },
        [roomId]
    );

    return { sendMessage };
};
