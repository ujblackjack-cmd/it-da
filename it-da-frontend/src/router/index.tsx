import { createBrowserRouter } from 'react-router-dom';
import HomePage from '@/pages/home/HomePage';
import LoginPage from '@/pages/auth/LoginPage';
import SignupPage from '@/pages/auth/SignupPage';
import OAuth2CallbackPage from '@/pages/auth/OAuth2CallbackPage';
import ProtectedRoute from './ProtectedRoute';
import PublicRoute from './PublicRoute';

export const router = createBrowserRouter([
    {
        path: '/',
        element: <HomePage />,
    },
    {
        path: '/login',
        element: (
            <PublicRoute>
                <LoginPage />
            </PublicRoute>
        ),
    },
    {
        path: '/signup',
        element: (
            <PublicRoute>
                <SignupPage />
            </PublicRoute>
        ),
    },
    {
        path: '/auth/callback/:provider',
        element: <OAuth2CallbackPage />,
    },
]);