import { createBrowserRouter } from "react-router-dom";
import HomePage from "@/pages/home/HomePage";
import LoginPage from "@/pages/auth/LoginPage";
import SignupPage from "@/pages/auth/SignupPage";
import AIMatchingPage from "@/pages/ai/AiMatchingPage";
import ProtectedRoute from "./ProtectedRoute";
import PublicRoute from "./PublicRoute";
import OAuth2CallbackPage from "@/pages/auth/OAuth2CallbackPage";
import ChatRoomPage from "@/pages/chat/ChatRoomPage";

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
      path: "/ai-matching",
      element: <AIMatchingPage />,
    },
    // {
    //   path: "/auth/callback/:provider",
    //   element: <OAuth2CallbackPage />,
    // },
    // {
    //   path: "/chat/:roomId",
    //   element: (
    //     <ProtectedRoute>
    //       <ChatRoomPage />
    //     </ProtectedRoute>
    //   ),
    // },
  ],

  {
    future: {
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    },
  } as any
);
