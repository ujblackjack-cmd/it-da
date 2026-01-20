// src/hooks/notification/useNotifications.ts

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { useNotificationStore } from '@/stores/useNotificationStore';
import notificationApi from '@/api/notification.api';

interface UseNotificationsOptions {
    /** 자동으로 조회할지 여부 (기본값: true) */
    autoFetch?: boolean;
    /** 폴링 간격 (ms, 0이면 비활성화, 기본값: 30000 = 30초) */
    pollingInterval?: number;
}

interface UseNotificationsReturn {
    /** 로딩 중 여부 */
    loading: boolean;
    /** 에러 */
    error: Error | null;
    /** 알림 목록 새로고침 */
    refresh: () => Promise<void>;
    /** 읽지 않은 개수만 조회 */
    fetchUnreadCount: () => Promise<number>;
}

export function useNotifications(options: UseNotificationsOptions = {}): UseNotificationsReturn {
    const { autoFetch = true, pollingInterval = 30000 } = options;
    const { user } = useAuthStore();
    const { fetchNotifications } = useNotificationStore();

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    // 알림 목록 새로고침
    const refresh = useCallback(async () => {
        if (!user?.userId) return;

        setLoading(true);
        setError(null);

        try {
            await fetchNotifications(user.userId);
            console.log('📋 알림 목록 새로고침 완료');
        } catch (err) {
            console.error('❌ 알림 목록 새로고침 실패:', err);
            setError(err as Error);
        } finally {
            setLoading(false);
        }
    }, [user?.userId, fetchNotifications]);

    // 읽지 않은 개수만 조회
    const fetchUnreadCount = useCallback(async (): Promise<number> => {
        if (!user?.userId) return 0;

        try {
            const count = await notificationApi.getUnreadCount(user.userId);
            console.log('🔢 읽지 않은 알림 개수:', count);
            return count;
        } catch (err) {
            console.error('❌ 읽지 않은 알림 개수 조회 실패:', err);
            return 0;
        }
    }, [user?.userId]);

    // 자동 조회 (컴포넌트 마운트 시)
    useEffect(() => {
        if (autoFetch && user?.userId) {
            refresh();
        }
    }, [autoFetch, user?.userId, refresh]);

    // 폴링 (주기적 조회)
    useEffect(() => {
        if (pollingInterval > 0 && user?.userId) {
            const intervalId = setInterval(() => {
                fetchUnreadCount();
            }, pollingInterval);

            return () => clearInterval(intervalId);
        }
    }, [pollingInterval, user?.userId, fetchUnreadCount]);

    return {
        loading,
        error,
        refresh,
        fetchUnreadCount,
    };
}

export default useNotifications;