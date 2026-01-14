import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

// API Base URL (환경변수로 관리)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

// Axios 인스턴스 생성
export const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    withCredentials: true,  // ✅ 세션 쿠키 전송 필수!
    headers: {
        'Content-Type': 'application/json',
    },
});

// -> redis 라서 JWT 토큰 불필요
// // 요청 인터셉터: JWT 토큰 자동 추가
// api.interceptors.request.use(
//     (config: InternalAxiosRequestConfig) => {
//         const token = localStorage.getItem('accessToken');
//         if (token && config.headers) {
//             config.headers.Authorization = `Bearer ${token}`;
//         }
//         return config;
//     },
//     (error: AxiosError) => {
//         return Promise.reject(error);
//     }
// );

// 응답 인터셉터: 에러 핸들링
api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        // 401 에러 (인증 실패) 처리
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            // 토큰 만료 시 로그아웃 처리
            localStorage.removeItem('accessToken');
            localStorage.removeItem('user');

            // 로그인 페이지로 리다이렉트
            window.location.href = '/login';
        }

        // 에러 메시지 포맷팅
        const errorMessage = error.response?.data || error.message || '알 수 없는 오류가 발생했습니다.';

        return Promise.reject(errorMessage);
    }
);

export default api;