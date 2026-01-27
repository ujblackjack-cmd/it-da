// src/App.tsx
import { RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { useCallback, useState, useEffect } from "react";
import { router } from "./router/index";
import { useAuthStore } from "./stores/useAuthStore";
import {
  useFollowWebSocket,
  FollowNotification,
} from "./hooks/auth/usefollowwebsocket";
import { useNotificationStore } from "./stores/useNotificationStore";
import { useUserChatStore } from "./stores/useUserChatStore";
import useUserChatWebSocket from "./hooks/chat/useUserChatWebSocket";
import FollowToast from "./pages/mypage/components/FollowToast";
import MessageToast from "./components/chat/MessageToast";

// PWA 관련 (vite-plugin-pwa가 자동 생성)
import { useRegisterSW } from "virtual:pwa-register/react";

import "./App.css";

import { useNotificationWebSocket } from "./hooks/notification/useNotificationWebSocket";
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
});

// PWA 업데이트 알림 컴포넌트
function PWAUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log("✅ PWA: Service Worker 등록 완료");
    },
    onRegisterError(error) {
      console.error("❌ PWA: Service Worker 등록 실패", error);
    },
  });

  if (!needRefresh) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "20px",
        left: "50%",
        transform: "translateX(-50%)",
        background: "#4F46E5",
        color: "white",
        padding: "16px 24px",
        borderRadius: "8px",
        boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        gap: "12px",
      }}
    >
      <span>🎉 새 버전이 있습니다!</span>
      <button
        onClick={() => updateServiceWorker(true)}
        style={{
          background: "white",
          color: "#4F46E5",
          border: "none",
          padding: "8px 16px",
          borderRadius: "4px",
          cursor: "pointer",
          fontWeight: 600,
        }}
      >
        업데이트
      </button>
      <button
        onClick={() => setNeedRefresh(false)}
        style={{
          background: "transparent",
          color: "white",
          border: "1px solid white",
          padding: "8px 16px",
          borderRadius: "4px",
          cursor: "pointer",
        }}
      >
        나중에
      </button>
    </div>
  );
}

// WebSocket Provider
function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  const [toastNotification, setToastNotification] =
    useState<FollowNotification | null>(null);
  const { addFollowNotification } = useNotificationStore();
  const { newMessageNotification, clearNewMessageNotification } =
    useUserChatStore();

  const handleFollowNotification = useCallback(
    (notification: FollowNotification) => {
      console.log("🔔 실시간 팔로우 알림 수신:", notification);
      setToastNotification(notification);
      addFollowNotification({
        fromUserId: notification.fromUserId,
        fromUsername: notification.fromUsername,
        fromProfileImage: notification.fromProfileImage,
        toUserId: notification.toUserId,
        newFollowerCount: notification.newFollowerCount,
      });
    },
    [addFollowNotification],
  );

  useFollowWebSocket({
    userId: user?.userId,
    onNotification: handleFollowNotification,
  });

  useUserChatWebSocket({
    userId: user?.userId,
  });
  useNotificationWebSocket();

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

        {/* PWA 업데이트 알림 */}
        <PWAUpdatePrompt />
      </WebSocketProvider>

      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: { background: "#363636", color: "#fff" },
          success: {
            duration: 3000,
            iconTheme: { primary: "#4ade80", secondary: "#fff" },
          },
          error: {
            duration: 4000,
            iconTheme: { primary: "#ef4444", secondary: "#fff" },
          },
        }}
      />
    </QueryClientProvider>
  );
}

export default App;
