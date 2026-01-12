import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';
import './App.css';

// QueryClient 설정
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            retry: 1,
            staleTime: 5 * 60 * 1000, // 5분
        },
    },
});

// 로그인 체크 함수
const isAuthenticated = () => {
    return !!localStorage.getItem('accessToken');
};

// Protected Route 컴포넌트
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    return isAuthenticated() ? <>{children}</> : <Navigate to="/login" />;
};

function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <BrowserRouter>
                <Routes>
                    {/* 인증 페이지 */}
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/signup" element={<SignupPage />} />

                    {/* 메인 페이지 (임시) */}
                    <Route
                        path="/"
                        element={
                            <ProtectedRoute>
                                <div style={{ padding: '40px', textAlign: 'center' }}>
                                    <h1>IT-DA 메인 페이지</h1>
                                    <p>로그인 성공!</p>
                                    <button
                                        onClick={() => {
                                            localStorage.clear();
                                            window.location.href = '/login';
                                        }}
                                        style={{
                                            padding: '10px 20px',
                                            background: '#667eea',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            marginTop: '20px',
                                        }}
                                    >
                                        로그아웃
                                    </button>
                                </div>
                            </ProtectedRoute>
                        }
                    />

                    {/* 404 페이지 */}
                    <Route path="*" element={<Navigate to="/" />} />
                </Routes>
            </BrowserRouter>

            {/* Toast 알림 */}
            <Toaster
                position="top-center"
                toastOptions={{
                    duration: 3000,
                    style: {
                        background: '#363636',
                        color: '#fff',
                    },
                    success: {
                        duration: 3000,
                        iconTheme: {
                            primary: '#4ade80',
                            secondary: '#fff',
                        },
                    },
                    error: {
                        duration: 4000,
                        iconTheme: {
                            primary: '#ef4444',
                            secondary: '#fff',
                        },
                    },
                }}
            />
        </QueryClientProvider>
    );
}

export default App;