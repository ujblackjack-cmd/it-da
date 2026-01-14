import api from "./axios.config";
import type { SignupData, AuthResponse } from "@/types/auth.types";

export const authAPI = {
    signup: async (data: SignupData): Promise<AuthResponse> => {
        const res = await api.post("/auth/signup", data);
        return res.data;
    },
};
