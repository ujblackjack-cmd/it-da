// src/hooks/notification/useMarkAsRead.ts

import { useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { useNotificationStore } from '@/stores/useNotificationStore';
import notificationApi from '@/api/notification.api';

interface UseMarkAsReadReturn {
    /** 단일 알림 읽음 처리 */
    markAsRead: (notificationId: number) => Promise<boolean>;
    /** 모든 알림 읽음 처리 */
    markAllAsRead: () => Promise<number>;
    /** 알림 삭제 */
    deleteNotification: (notificationId: number) => Promise<boolean>;
    /** 모든 알림 삭제 */
    deleteAllNotifications: () => Promise<boolean>;
    /** 로딩 중 여부 */
    loading: boolean;
    /** 에러 */
    error: Error | null;
}

export function useMarkAsRead(): UseMarkAsReadReturn {
    const { user } = useAuthStore();
    const store = useNotificationStore();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    // 단일 알림 읽음 처리
    const markAsRead = useCallback(async (notificationId: number): Promise<boolean> => {
        setLoading(true);
        setError(null);

        try {
            await notificationApi.markAsRead(notificationId);
            // 스토어에서도 읽음 처리 (id로 찾아서)
            const notification = store.notifications.find(n => n.notificationId === notificationId);
            if (notification) {
                store.markAsRead(notification.id);
            }
            console.log('✅ 알림 읽음 처리:', notificationId);
            return true;
        } catch (err) {
            console.error('❌ 알림 읽음 처리 실패:', err);
            setError(err as Error);
            return false;
        } finally {
            setLoading(false);
        }
    }, [store]);

    // 모든 알림 읽음 처리
    const markAllAsRead = useCallback(async (): Promise<number> => {
        if (!user?.userId) return 0;

        setLoading(true);
        setError(null);

        try {
            const count = await notificationApi.markAllAsRead(user.userId);
            store.markAllAsRead();
            console.log('✅ 모든 알림 읽음 처리:', count, '개');
            return count;
        } catch (err) {
            console.error('❌ 모든 알림 읽음 처리 실패:', err);
            setError(err as Error);
            return 0;
        } finally {
            setLoading(false);
        }
    }, [user?.userId, store]);

    // 알림 삭제
    const deleteNotification = useCallback(async (notificationId: number): Promise<boolean> => {
        setLoading(true);
        setError(null);

        try {
            await notificationApi.deleteNotification(notificationId);
            // 스토어에서도 삭제
            const notification = store.notifications.find(n => n.notificationId === notificationId);
            if (notification) {
                store.removeNotification(notification.id);
            }
            console.log('🗑️ 알림 삭제:', notificationId);
            return true;
        } catch (err) {
            console.error('❌ 알림 삭제 실패:', err);
            setError(err as Error);
            return false;
        } finally {
            setLoading(false);
        }
    }, [store]);

    // 모든 알림 삭제
    const deleteAllNotifications = useCallback(async (): Promise<boolean> => {
        if (!user?.userId) return false;

        setLoading(true);
        setError(null);

        try {
            await notificationApi.deleteAllNotifications(user.userId);
            store.clearAll();
            console.log('🗑️ 모든 알림 삭제');
            return true;
        } catch (err) {
            console.error('❌ 모든 알림 삭제 실패:', err);
            setError(err as Error);
            return false;
        } finally {
            setLoading(false);
        }
    }, [user?.userId, store]);

    return {
        markAsRead,
        markAllAsRead,
        deleteNotification,
        deleteAllNotifications,
        loading,
        error,
    };
}

export default useMarkAsRead;