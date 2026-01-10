import api from './axios.config';
import { UserSetting, UserSettingRequest } from '../types/user.types';

export const userSettingAPI = {
    // 사용자 설정 조회
    getUserSetting: async (userId: number): Promise<UserSetting> => {
        const response = await api.get(`/users/${userId}/settings`);
        return response.data;
    },

    // 사용자 설정 수정
    updateUserSetting: async (
        userId: number,
        data: UserSettingRequest
    ): Promise<UserSetting> => {
        const response = await api.put(`/users/${userId}/settings`, data);
        return response.data;
    },

    // 알림 설정 토글
    toggleNotification: async (userId: number): Promise<UserSetting> => {
        const response = await api.patch(`/users/${userId}/settings/notification`);
        return response.data;
    },

    // 이메일 알림 설정 토글
    toggleEmailNotification: async (userId: number): Promise<UserSetting> => {
        const response = await api.patch(`/users/${userId}/settings/email-notification`);
        return response.data;
    },
};