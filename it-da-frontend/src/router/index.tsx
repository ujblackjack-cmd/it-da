import React from "react";
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
import ChatRoomSuccess from "@/pages/chat/ChatRoomSuccess.tsx";
import ChatRoomListPage from "@/pages/chat/ChatRoomListPage.tsx";
import AdminMeetingDetailPage from "@/pages/admin/AdminMeetingDetailPage";

// 👇 관리자 페이지 import 추가
import AdminLayout from "@/pages/admin/AdminLayout";
import AdminDashboardPage from "@/pages/admin/AdminDashboardPage";
import UserManagePage from "@/pages/admin/UserManagePage";
import AdminMeetingManagePage from "@/pages/admin/AdminMeetingManagePage";
import ReportManagePage from "@/pages/admin/ReportManagePage";
import NoticeManagePage from "@/pages/admin/NoticeManagePage";
import SettingsPage from "@/pages/admin/SettingsPage";
import InquiryManagePage from "@/pages/admin/InquiryManagePage.tsx";
import AdminUserDetailPage from "@/pages/admin/AdminUserDetailPage";
import MyBadgesPage from "@/pages/mypage/MyBadgesPage";
import BadgeCatalogPage from "@/pages/badge/BadgeCatalogPage";

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
    // {
    //     path: "/meeting/:id",
    //     element: <MeetingDetailPage />,
    // },
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
      path: "/social/chat/success", // CreateChatRoom에서 이동하는 경로와 일치
      element: (
        <ProtectedRoute>
          <ChatRoomSuccess />
        </ProtectedRoute>
      ),
    },
    {
      path: "/social/rooms",
      element: <ChatRoomListPage />,
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
    {
      path: "/mypage/badges",
      element: <MyBadgesPage />,
    },
    {
      path: "/badges",
      element: <BadgeCatalogPage />,
    },
    // 👇 관리자 라우트 추가
    {
      path: "/admin",
      element: <AdminLayout />,
      children: [
        {
          path: "dashboard",
          element: <AdminDashboardPage />,
        },
        {
          path: "users",
          element: <UserManagePage />,
        },
        {
          path: "users/:userId",
          element: <AdminUserDetailPage />,
        },
        {
          path: "meetings",
          element: <AdminMeetingManagePage />,
        },
        {
          path: "meetings/:meetingId",
          element: <AdminMeetingDetailPage />,
        },
        {
          path: "reports",
          element: <ReportManagePage />,
        },
        {
          path: "inquiries",
          element: <InquiryManagePage />,
        },
        {
          path: "notices",
          element: <NoticeManagePage />,
        },
        {
          path: "settings",
          element: <SettingsPage />,
        },
      ],
    },
  ],

  {
    future: {
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    },
  } as Parameters<typeof createBrowserRouter>[1],
);
