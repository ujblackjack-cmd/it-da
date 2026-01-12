import { create } from "zustand";
import { persist } from "zustand/middleware";
import { authAPI } from "../api";

interface User {
  id: number;
  email: string;
  username: string;
  nickname?: string;
  address: string;
  phone?: string;
}

interface Preferences {
  energyType: string;
  purposeType: string;
  frequencyType: string;
  locationType: string;
  budgetType: string;
  leadershipType: string;
  timePreference: string;
}

interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  signup: (data: {
    email: string;
    password: string;
    username: string;
    address: string;
    nickname?: string;
    phone?: string;
    preferences?: Preferences;
  }) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (credentials) => {
        set({ isLoading: true, error: null });
        try {
          const data = await authAPI.login(credentials);
          set({
            user: data.user,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error: any) {
          set({
            error: "로그인 실패",
            isLoading: false,
          });
          throw error;
        }
      },

      signup: async (signupData) => {
        set({ isLoading: true, error: null });
        try {
          await authAPI.signup(signupData);
          set({ isLoading: false });
        } catch (error: any) {
          set({
            error: "회원가입 실패",
            isLoading: false,
          });
          throw error;
        }
      },

      logout: async () => {
        try {
          await authAPI.logout();
          set({
            user: null,
            isAuthenticated: false,
          });
        } catch (error) {
          console.error("Logout error:", error);
        }
      },

      checkAuth: async () => {
        set({ isLoading: true });
        try {
          const data = await authAPI.me();
          set({
            user: data.user,
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
    }),
    { name: "auth-storage" }
  )
);
