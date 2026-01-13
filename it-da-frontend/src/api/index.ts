import axios from "axios";

const apiClient = axios.create({
    baseURL: "http://localhost:8080/api",
    timeout: 10000,
    headers: {
        "Content-Type": "application/json",
    },
    withCredentials: true,  // ✅ 이미 있음!
});

apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // ❌ localStorage 제거 (세션은 쿠키에 자동 저장)
            window.location.href = "/login";
        }
        return Promise.reject(error);
    }
);

export const authAPI = {
    // ✅ 로그인 (엔드포인트 변경: /users/login → /auth/login)
    login: async (credentials: { email: string; password: string }) => {
        const { data } = await apiClient.post("/auth/login", credentials);
        // ❌ localStorage 제거 (세션 쿠키로 자동 관리)
        return data;
    },

    // ✅ 회원가입 (엔드포인트 변경: /users/signup → /auth/signup)
    signup: async (signupData: {
        email: string;
        password: string;
        username: string;
        nickname?: string;
        phone?: string;
    }) => {
        const { data } = await apiClient.post("/auth/signup", signupData);
        return data;
    },

    // ✅ 로그아웃 (엔드포인트 변경: /users/logout → /auth/logout)
    logout: async () => {
        await apiClient.post("/auth/logout");
        // ❌ localStorage 제거
    },

    // ✅ 세션 확인 (새로 추가: /auth/session)
    checkSession: async () => {
        const { data } = await apiClient.get("/auth/session");
        return data;
    },
};

export default apiClient;