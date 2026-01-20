// src/api/notification.api.ts

import apiClient from './client';
import { NotificationListResponseDTO } from '@/types/notification.types';

const notificationApi = {
    /**
     * 알림 목록 조회 (페이징)
     */
    getNotifications: async (userId: number, page: number = 0, size: number = 20): Promise<NotificationListResponseDTO> => {
        const response = await apiClient.get('/api/notifications', {
            params: { userId, page, size },
        });
        return response.data;
    },

    /**
     * 모든 알림 조회 (페이징 없음)
     */
    getAllNotifications: async (userId: number): Promise<NotificationListResponseDTO> => {
        const response = await apiClient.get('/api/notifications/all', {
            params: { userId },
        });
        return response.data;
    },

    /**
     * 읽지 않은 알림 개수 조회
     */
    getUnreadCount: async (userId: number): Promise<number> => {
        const response = await apiClient.get('/api/notifications/unread/count', {
            params: { userId },
        });
        return response.data.unreadCount;
    },

    /**
     * 단일 알림 읽음 처리
     */
    markAsRead: async (notificationId: number): Promise<void> => {
        await apiClient.patch(`/api/notifications/${notificationId}/read`);
    },

    /**
     * 모든 알림 읽음 처리
     */
    markAllAsRead: async (userId: number): Promise<number> => {
        const response = await apiClient.patch('/api/notifications/read-all', null, {
            params: { userId },
        });
        return response.data.count;
    },

    /**
     * 알림 삭제
     */
    deleteNotification: async (notificationId: number): Promise<void> => {
        await apiClient.delete(`/api/notifications/${notificationId}`);
    },

    /**
     * 모든 알림 삭제
     */
    deleteAllNotifications: async (userId: number): Promise<void> => {
        await apiClient.delete('/api/notifications/all', {
            params: { userId },
        });
    },
};

export default notificationApi;