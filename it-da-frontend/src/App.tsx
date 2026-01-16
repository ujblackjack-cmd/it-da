import { RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { router } from "./router";
import "./App.css";
import { useCallback, useState } from "react";
import { useAuthStore } from "./stores/useAuthStore";
import { useFollowWebSocket, FollowNotification } from "./hooks/auth/useFollowWebSocket";
import { useNotificationStore } from "./stores/useNotificationStore";
import FollowToast from "./pages/mypage/components/FollowToast";

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            retry: 1,
            staleTime: 5 * 60 * 1000,
        },
    },
});

// 웹소켓 연결을 위한 내부 컴포넌트
function WebSocketProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuthStore();
    const [toastNotification, setToastNotification] = useState<FollowNotification | null>(null);
    const { addFollowNotification } = useNotificationStore();

    const handleNotification = useCallback((notification: FollowNotification) => {
        console.log('🔔 실시간 팔로우 알림 수신:', notification);

        // 1. 토스트 표시
        setToastNotification(notification);

        // 2. 알림 벨에 추가 (전역 store)
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
        onNotification: handleNotification,
    });

    return (
        <>
            {children}
            <FollowToast
                notification={toastNotification}
                onClose={() => setToastNotification(null)}
                currentUserId={user?.userId}  // ✅ 추가!
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
                    style: {
                        background: "#363636",
                        color: "#fff",
                    },
                    success: {
                        duration: 3000,
                        iconTheme: {
                            primary: "#4ade80",
                            secondary: "#fff",
                        },
                    },
                    error: {
                        duration: 4000,
                        iconTheme: {
                            primary: "#ef4444",
                            secondary: "#fff",
                        },
                    },
                }}
            />
        </QueryClientProvider>
    );
}

export default App;