import { create } from "zustand";
import { authAPI } from "@/api/auth.api";
import type { SignupRequest } from "@/types/auth.types";

interface User {
    userId: number;
    email: string;
    username: string;
    nickname?: string;
}

interface AuthStore {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
    login: (credentials: { email: string; password: string }) => Promise<void>;
    signup: (data: SignupRequest) => Promise<void>;  // ✅ SignupRequest 타입
    logout: () => Promise<void>;
    checkAuth: () => Promise<void>;
    clearError: () => void;
}

export const useAuthStore = create<AuthStore>()((set) => ({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,

    login: async (credentials) => {
        set({ isLoading: true, error: null });
        try {
            const response = await authAPI.login(credentials);

            set({
                user: {
                    userId: response.userId,
                    email: response.email,
                    username: response.username,
                    nickname: response.nickname,
                },
                isAuthenticated: true,
                isLoading: false,
            });
        } catch (error: any) {
            set({
                error: error?.message || "로그인 실패",
                isLoading: false,
            });
            throw error;
        }
    },

    signup: async (signupData) => {
        set({ isLoading: true, error: null });
        try {
            console.log("=" .repeat(50));
            console.log("📤 AuthStore에서 API로 전송하는 데이터:");
            console.log(JSON.stringify(signupData, null, 2));
            console.log("=" .repeat(50));

            await authAPI.signup(signupData);
            set({ isLoading: false });
        } catch (error: any) {
            set({
                error: error?.message || "회원가입 실패",
                isLoading: false,
            });
            throw error;
        }
    },

    logout: async () => {
        set({ isLoading: true });
        try {
            await authAPI.logout();
            set({
                user: null,
                isAuthenticated: false,
                isLoading: false,
            });
        } catch (error) {
            console.error("Logout error:", error);
            set({ isLoading: false });
        }
    },

    checkAuth: async () => {
        set({ isLoading: true });
        try {
            const data = await authAPI.checkSession();
            set({
                user: {
                    userId: data.userId,
                    email: data.email,
                    username: data.username,
                    nickname: data.nickname,
                },
                isAuthenticated: true,
                isLoading: false,
            });
        } catch {
            set({
                user: null,
                isAuthenticated: false,
                isLoading: false,
            });
        }
    },

    clearError: () => set({ error: null }),
}));