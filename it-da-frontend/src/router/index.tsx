import { createBrowserRouter } from "react-router-dom";
import HomePage from "@/pages/home/HomePage";
import LoginPage from "@/pages/auth/LoginPage";
import SignupPage from "@/pages/auth/SignupPage";
import AIMatchingPage from "@/pages/ai/AiMatchingPage";
import MyPage from "@/pages/mypage/MyPage";
import ProfileEditPage from "@/pages/mypage/components/ProfileEditPage";
import ProtectedRoute from "./ProtectedRoute";
import PublicRoute from "./PublicRoute";
import OAuth2CallbackPage from "@/pages/auth/OAuth2CallbackPage";
import ChatRoomPage from "@/pages/chat/ChatRoomPage";
import TestChatPage from "@/pages/chat/TestChatPage.tsx";
import {PreferenceGuard} from "@/components/auth/PreferenceGuard.tsx";
import UserPreferenceSetupPage from "@/pages/auth/UserPreferenceSetupPage.tsx";

export const router = createBrowserRouter(
  [
    {
      path: "/",
      element: (
          <PreferenceGuard>
              <HomePage />
          </PreferenceGuard>
        ),
    },
    {
      path: "/user-preference/setup",
      element: (
          <ProtectedRoute>
              <UserPreferenceSetupPage />
          </ProtectedRoute>
      ),
    },
    {
      path: "/login",
      element: (
        <PublicRoute>
          <LoginPage />
        </PublicRoute>
      ),
    },
    {
      path: "/signup",
      element: (
        <PublicRoute>
          <SignupPage />
        </PublicRoute>
      ),
    },
      {
          path: "/ai-matching",
          element: (
              <PreferenceGuard> {/* ✅ 매칭 서비스 이용 전 성향표 체크 */}
                  <ProtectedRoute>
                      <AIMatchingPage />
                  </ProtectedRoute>
              </PreferenceGuard>
          ),
      },
    {
      path: "/meetings",
      element: (
        <div
          style={{
            padding: "60px 40px",
            textAlign: "center",
            minHeight: "100vh",
            background: "#f8f9fa",
          }}
        >
          <h1 style={{ fontSize: "48px", marginBottom: "20px" }}>🔍</h1>
          <h2
            style={{ fontSize: "32px", marginBottom: "12px", color: "#212529" }}
          >
            모임 찾기
          </h2>
          <p style={{ fontSize: "16px", color: "#868e96" }}>
            전체 모임 목록 페이지 (구현 예정)
          </p>
        </div>
      ),
    },
    {
      path: "/my-meetings",
      element: <MyPage />,
    },
    {
      path: "/create",
      element: (
        <div
          style={{
            padding: "60px 40px",
            textAlign: "center",
            minHeight: "100vh",
            background: "#f8f9fa",
          }}
        >
          <h1 style={{ fontSize: "48px", marginBottom: "20px" }}>✨</h1>
          <h2
            style={{ fontSize: "32px", marginBottom: "12px", color: "#212529" }}
          >
            모임 만들기
          </h2>
          <p style={{ fontSize: "16px", color: "#868e96" }}>
            새 모임 생성 페이지 (구현 예정)
          </p>
        </div>
      ),
    },
    {
      path: "/mypage",
      element: <MyPage />,
    },
    {
      path: "/profile",
      element: <MyPage />,
    },
    {
      path: "/profile/edit",
      element: <ProfileEditPage />,
    },
    {
      path: "/auth/callback",
      element: <OAuth2CallbackPage />,
    },
    {
      path: "/chat/:roomId",
      element: (
        <ProtectedRoute>
          <ChatRoomPage />
        </ProtectedRoute>
      ),
    },
    {
      path: "/test-chat", // ✅ 추가
      element: (
        <ProtectedRoute>
          <TestChatPage />
        </ProtectedRoute>
      ),
    },
  ],
  {
    future: {
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    },
  } as any
);
