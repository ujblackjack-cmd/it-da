import api from './axios.config';
import { UserPreference, UserPreferenceRequest } from '../types/user.types';

export const userPreferenceAPI = {
    // 사용자 선호도 조회
    getUserPreference: async (userId: number): Promise<UserPreference> => {
        const response = await api.get(`/users/${userId}/preferences`);
        return response.data;
    },

    // 사용자 선호도 생성
    createUserPreference: async (
        userId: number,
        data: UserPreferenceRequest
    ): Promise<UserPreference> => {
        const response = await api.post(`/users/${userId}/preferences`, data);
        return response.data;
    },

    // 사용자 선호도 수정
    updateUserPreference: async (
        userId: number,
        data: UserPreferenceRequest
    ): Promise<UserPreference> => {
        const response = await api.put(`/users/${userId}/preferences`, data);
        return response.data;
    },

    // 사용자 선호도 삭제
    deleteUserPreference: async (userId: number): Promise<void> => {
        await api.delete(`/users/${userId}/preferences`);
    },
};