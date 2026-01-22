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
import TestChatPage from "@/pages/chat/TestChatPage";
import UserChatListPage from "@/pages/mypage/components/UserChatListPage";
import UserChatRoomPage from "@/pages/mypage/components/UserChatRoomPage";
import MeetingCreatePage from "@/pages/meeting/MeetingCreatePage";
import MeetingDetailPage from "@/pages/meeting/MeetingDetailPage";
import { PreferenceGuard } from "@/components/auth/PreferenceGuard";
import UserPreferenceSetupPage from "@/pages/auth/UserPreferenceSetupPage";
import CategoryListPage from "@/pages/category/CategoryListPage";
import CategoryDetailPage from "@/pages/category/CategoryDetailPage";
import MeetingListPage from "@/pages/meeting/MeetingListPage";
import UserProfile from "@/pages/mypage/UserProfile";
import UserProfileById from "@/pages/mypage/UserProfileById";
import ChatPreviewPage from "@/pages/meeting/ChatPreviewPage";
import MeetingManagePage from "@/pages/meeting/MeetingManagePage";
import MeetingEditPage from "@/pages/meeting/MeetingEditPage";
import MyMeetingsListPage from "@/pages/mypage/MyMeetingsListPage";

console.log("ROUTER LOADED ✅");
console.log("ROUTER VERSION ✅", "2026-01-22 주최 모임 기능 추가");

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
            path: "/category",
            element: <CategoryListPage />,
        },
        {
            path: "/category/:category",
            element: <CategoryDetailPage />,
        },
        {
            path: "/meetings",
            element: <MeetingListPage />,
        },
        {
            path: "/meeting/:id",
            element: <MeetingDetailPage />,
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
                <PreferenceGuard>
                    <ProtectedRoute>
                        <AIMatchingPage />
                    </ProtectedRoute>
                </PreferenceGuard>
            ),
        },
        {
            path: "/my-meetings",
            element: (
                <ProtectedRoute>
                    <MyMeetingsListPage />
                </ProtectedRoute>
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
            path: "/profile/id/:userId",
            element: <UserProfileById />,
        },
        {
            path: "/:emailPrefix",
            element: <UserProfile />,
        },
        {
            path: "/auth/callback",
            element: <OAuth2CallbackPage />,
        },
        {
            path: "/auth/callBack",
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
            path: "/test-chat",
            element: (
                <ProtectedRoute>
                    <TestChatPage />
                </ProtectedRoute>
            ),
        },
        {
            path: "/meetings/create",
            element: (
                <ProtectedRoute>
                    <MeetingCreatePage />
                </ProtectedRoute>
            ),
        },
        {
            path: "/meetings/:meetingId",
            element: <MeetingDetailPage />,
        },
        {
            path: "/meetings/:meetingId/chat-preview",
            element: <ChatPreviewPage />,
        },
        {
            path: "/meetings/:meetingId/manage",
            element: <MeetingManagePage />,
        },
        {
            path: "/meetings/:meetingId/edit",
            element: <MeetingEditPage />,
        },
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
    } as Parameters<typeof createBrowserRouter>[1]
);
