
import axios from "axios";
import type { LoginRequest, LoginResponse, SignupRequest, SessionInfoResponse } from "@/types/auth.types";

const apiClient = axios.create({
    baseURL: "http://localhost:8080/api",
    timeout: 10000,
    headers: {
        "Content-Type": "application/json",
    },
    withCredentials: true,
});

apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            window.location.href = "/login";
        }
        return Promise.reject(error);
    }
);

export const authAPI = {
    login: async (credentials: LoginRequest): Promise<LoginResponse> => {
        const { data } = await apiClient.post("/auth/login", credentials);
        return data;
    },

    // ✅ /users/signup으로 변경!
    signup: async (signupData: SignupRequest): Promise<any> => {
        console.log("=" .repeat(50));
        console.log("🌐 API Client에서 서버로 전송하는 데이터:");
        console.log(JSON.stringify(signupData, null, 2));
        console.log("=" .repeat(50));

        const { data } = await apiClient.post("/users/signup", signupData);
        return data;
    },

    logout: async (): Promise<void> => {
        await apiClient.post("/auth/logout");
    },

    checkSession: async (): Promise<SessionInfoResponse> => {
        const { data } = await apiClient.get("/auth/session");
        return data;
    },
};

export default apiClient;