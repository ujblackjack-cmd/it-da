import { apiClient } from "./client";
// @ts-ignore
import type { LoginCredentials, SignupData, User } from "@/types/auth.types";

export const authAPI = {
  // login: async (credentials: LoginCredentials) => {
  //     const { data } = await apiClient.post('/api/users/login', credentials);
  //     return data;
  // },

  signup: async (signupData: SignupData) => {
    const { data } = await apiClient.post("/api/users/signup", signupData);
    return data;
  },

  // logout: async () => {
  //     const { data } = await apiClient.post('/api/users/logout');
  //     return data;
  // },

  me: async (): Promise<{ user: User }> => {
    const { data } = await apiClient.get("/api/users/me");
    return data;
  },

  // oauth2Login: async (provider: string, code: string) => {
  //     const { data } = await apiClient.post(`/auth/oauth2/${provider}/callback`, { code });
  //     return data;
  // },
  //
  // changePassword: async (currentPassword: string, newPassword: string) => {
  //     const { data } = await apiClient.put('/auth/password', {
  //         currentPassword,
  //         newPassword,
  //     });
  //     return data;
  // },
  //
  // updateProfile: async (updates: Partial<User>) => {
  //     const { data } = await apiClient.put('/auth/profile', updates);
  //     return data;
  // },
};
