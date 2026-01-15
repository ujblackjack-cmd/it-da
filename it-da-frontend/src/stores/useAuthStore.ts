import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { authAPI } from "@/api/auth.api";
import type { SignupRequest } from "@/types/auth.types";
import {userPreferenceAPI} from "@/api/userPreference.api.ts";

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

  setUser: (user) => set({ user, isAuthenticated: !!user }),

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
    } catch (e) {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
  setSocialUser: async (userData: User) => {
      console.log("💾 setSocialUser 호출됨:", userData);

      localStorage.setItem("user", JSON.stringify(userData));

      set({
          user: userData,
          isAuthenticated: true,
          isLoading: false,
          error: null
      });
  },
  clearError: () => set({ error: null }),
}));
