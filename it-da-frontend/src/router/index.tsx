import { createBrowserRouter } from "react-router-dom";
import HomePage from "@/pages/home/HomePage";
import LoginPage from "@/pages/auth/LoginPage";
import SignupPage from "@/pages/auth/SignupPage";
import AIMatchingPage from "@/pages/ai/AiMatchingPage";
import MyPage from "@/pages/mypage/MyPage";
import ProfileEditPage from "@/pages/mypage/components/ProfileEditPage";
import UserProfile from "@/pages/mypage/UserProfile";
import UserProfileById from "@/pages/mypage/UserProfileById";
import ProtectedRoute from "./ProtectedRoute";
import PublicRoute from "./PublicRoute";
import OAuth2CallbackPage from "@/pages/auth/OAuth2CallbackPage";
import ChatRoomPage from "@/pages/chat/ChatRoomPage";
import TestChatPage from "@/pages/chat/TestChatPage.tsx";
// ✅ 1:1 DM 채팅 추가
import UserChatListPage from "@/pages/mypage/components/UserChatListPage";
import UserChatRoomPage from "@/pages/mypage/components/UserChatRoomPage";

export const router = createBrowserRouter(
    [
        {
            path: "/",
            element: <HomePage />,
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
            path: "/oauth2/callback",
            element: <OAuth2CallbackPage />,
        },
        {
            path: "/ai-matching",
            element: <AIMatchingPage />,
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
            path: "/profile/:emailPrefix",
            element: <UserProfile />,
        },
        {
            path: "/profile/id/:userId",
            element: <UserProfileById />,
        },
        // 모임 채팅 (기존)
        {
            path: "/chat/:roomId",
            element: (
                <ProtectedRoute>
                    <ChatRoomPage />
                </ProtectedRoute>
            ),
        },
        {
            path: "/test-chat",
            element: (
                <ProtectedRoute>
                    <TestChatPage />
                </ProtectedRoute>
            ),
        },
        // ✅ 1:1 DM 채팅 (새로 추가)
        {
            path: "/user-chat",
            element: (
                <ProtectedRoute>
                    <UserChatListPage />
                </ProtectedRoute>
            ),
        },
        {
            path: "/user-chat/:roomId",
            element: (
                <ProtectedRoute>
                    <UserChatRoomPage />
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