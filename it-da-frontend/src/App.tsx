import { RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { router } from "./router";
import "./App.css";
import { useCallback, useState } from "react";
import { useAuthStore } from "./stores/useAuthStore";
import { useFollowWebSocket, FollowNotification } from "./hooks/auth/useFollowWebSocket";
import { useNotificationStore } from "./stores/useNotificationStore";
import { useUserChatStore } from "./stores/useUserChatStore";
import FollowToast from "./pages/mypage/components/FollowToast";
import MessageToast from "./components/chat/MessageToast";
import useUserChatWebSocket from "./hooks/chat/useUserChatWebSocket";

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            retry: 1,
            staleTime: 5 * 60 * 1000,
        },
    },
});

function WebSocketProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuthStore();
    const [toastNotification, setToastNotification] = useState<FollowNotification | null>(null);
    const { addFollowNotification } = useNotificationStore();
    const { newMessageNotification, clearNewMessageNotification } = useUserChatStore();

    const handleFollowNotification = useCallback((notification: FollowNotification) => {
        console.log('🔔 실시간 팔로우 알림 수신:', notification);
        setToastNotification(notification);
        addFollowNotification({
            fromUserId: notification.fromUserId,
            fromUsername: notification.fromUsername,
            fromProfileImage: notification.fromProfileImage,
            toUserId: notification.toUserId,
            newFollowerCount: notification.newFollowerCount,
        });
    }, [addFollowNotification]);

    useFollowWebSocket({
        userId: user?.userId,
        onNotification: handleFollowNotification,
    });

    useUserChatWebSocket({
        userId: user?.userId,
    });

    return (
        <>
            {children}
            <FollowToast
                notification={toastNotification}
                onClose={() => setToastNotification(null)}
                currentUserId={user?.userId}
            />
            <MessageToast
                notification={newMessageNotification}
                onClose={clearNewMessageNotification}
            />
        </>
    );
}

function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <WebSocketProvider>
                <RouterProvider router={router} />
            </WebSocketProvider>
            <Toaster
                position="top-center"
                toastOptions={{
                    duration: 3000,
                    style: { background: "#363636", color: "#fff" },
                    success: { duration: 3000, iconTheme: { primary: "#4ade80", secondary: "#fff" } },
                    error: { duration: 4000, iconTheme: { primary: "#ef4444", secondary: "#fff" } },
                }}
            />
        </QueryClientProvider>
    );
}

export default App;