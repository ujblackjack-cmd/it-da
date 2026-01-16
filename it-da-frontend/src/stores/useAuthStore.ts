import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { authAPI } from "@/api/auth.api";
import type { SignupRequest } from "@/types/auth.types";

interface User {
    userId: number;
    email: string;
    username: string;
    nickname?: string;
    bio?: string;
    gender?: string;
    address?: string;
    profileImageUrl?: string;
    mbti?: string;
    interests?: string;
    isPublic?: boolean;
}

interface AuthStore {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
    login: (credentials: { email: string; password: string }) => Promise<void>;
    signup: (data: SignupRequest) => Promise<void>;
    logout: () => Promise<void>;
    checkAuth: () => Promise<void>;
    clearError: () => void;
    setUser: (user: User | null) => void;
    setSocialUser: (userData: User) => void;
}

const storedUser = localStorage.getItem("user");
const initialUser = storedUser ? JSON.parse(storedUser) : null;
console.log("💾 localStorage user:", storedUser);

export const useAuthStore = create<AuthStore>()((set) => ({
    user: initialUser,
    isAuthenticated: !!initialUser,
    isLoading: false,
    error: null,

    setUser: (user) => {
        if (user) {
            localStorage.setItem("user", JSON.stringify(user));
        } else {
            localStorage.removeItem("user");
        }
        set({ user, isAuthenticated: !!user });
    },

    login: async (credentials) => {
        set({ isLoading: true, error: null });
        try {
            const response = await authAPI.login(credentials);
            const userData = {
                userId: response.userId,
                email: response.email,
                username: response.username,
                nickname: response.nickname,
            };

            // ✅ localStorage에 저장!
            localStorage.setItem("user", JSON.stringify(userData));
            console.log("✅ 로그인 성공, localStorage 저장:", userData);

            set({
                user: userData,
                isAuthenticated: true,
                isLoading: false,
            });
        } catch (error: any) {
            set({ error: error?.message || "로그인 실패", isLoading: false });
            throw error;
        }
    },

    signup: async (signupData) => {
        set({ isLoading: true, error: null });
        try {
            await authAPI.signup(signupData);
            set({ isLoading: false });
        } catch (error: any) {
            set({ error: error?.message || "회원가입 실패", isLoading: false });
            throw error;
        }
    },

    logout: async () => {
        set({ isLoading: true });
        try {
            await authAPI.logout();
            localStorage.removeItem("user");
            console.log("✅ 로그아웃, localStorage 삭제");
            set({
                user: null,
                isAuthenticated: false,
                isLoading: false,
            });
        } catch (error) {
            console.error("Logout error:", error);
            localStorage.removeItem("user");
            set({
                user: null,
                isAuthenticated: false,
                isLoading: false
            });
        }
    },

    checkAuth: async () => {
        set({ isLoading: true });
        try {
            const data = await authAPI.checkSession();
            const userData = {
                userId: data.userId,
                email: data.email,
                username: data.username,
                nickname: data.nickname,
            };

            // ✅ checkAuth 성공 시에도 localStorage 업데이트
            localStorage.setItem("user", JSON.stringify(userData));

            set({
                user: userData,
                isAuthenticated: true,
                isLoading: false,
            });
        } catch (e) {
            // 세션 없으면 localStorage도 정리
            localStorage.removeItem("user");
            set({ user: null, isAuthenticated: false, isLoading: false });
        }
    },

    setSocialUser: (userData: User) => {
        console.log("💾 setSocialUser 호출됨:", userData);
        localStorage.setItem("user", JSON.stringify(userData));
        set({
            user: userData,
            isAuthenticated: true,
            isLoading: false,
            error: null,
        });
        console.log("✅ 스토어 업데이트 완료:", useAuthStore.getState());
    },

    clearError: () => set({ error: null }),
}));