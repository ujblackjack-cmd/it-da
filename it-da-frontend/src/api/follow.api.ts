import { API_BASE_URL } from './config';
import type { FollowUser, FollowStatusResponse } from '../types/follow.types';

const followApi = {
    // 팔로우하기
    follow: async (currentUserId: number, targetUserId: number): Promise<void> => {
        try {
            const response = await fetch(
                `${API_BASE_URL}/api/users/${targetUserId}/follow?currentUserId=${currentUserId}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                }
            );
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || '팔로우에 실패했습니다');
            }
        } catch (error) {
            console.error('Follow error:', error);
            throw error;
        }
    },

    // 언팔로우하기
    unfollow: async (currentUserId: number, targetUserId: number): Promise<void> => {
        try {
            const response = await fetch(
                `${API_BASE_URL}/api/users/${targetUserId}/follow?currentUserId=${currentUserId}`,
                {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                }
            );
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || '언팔로우에 실패했습니다');
            }
        } catch (error) {
            console.error('Unfollow error:', error);
            throw error;
        }
    },

    // 팔로잉 목록
    getFollowing: async (userId: number, currentUserId?: number): Promise<FollowUser[]> => {
        try {
            const url = currentUserId
                ? `${API_BASE_URL}/api/users/${userId}/following?currentUserId=${currentUserId}`
                : `${API_BASE_URL}/api/users/${userId}/following?currentUserId=${userId}`;
            const response = await fetch(url, {
                headers: { 'Content-Type': 'application/json' },
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || '팔로잉 목록을 불러오는데 실패했습니다');
            }
            const data = await response.json();
            return Array.isArray(data) ? data : [];
        } catch (error) {
            console.error('Get following error:', error);
            throw error;
        }
    },

    // 팔로워 목록
    getFollowers: async (userId: number, currentUserId?: number): Promise<FollowUser[]> => {
        try {
            const url = currentUserId
                ? `${API_BASE_URL}/api/users/${userId}/followers?currentUserId=${currentUserId}`
                : `${API_BASE_URL}/api/users/${userId}/followers?currentUserId=${userId}`;
            const response = await fetch(url, {
                headers: { 'Content-Type': 'application/json' },
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || '팔로워 목록을 불러오는데 실패했습니다');
            }
            const data = await response.json();
            return Array.isArray(data) ? data : [];
        } catch (error) {
            console.error('Get followers error:', error);
            throw error;
        }
    },

    // 팔로우 상태 확인
    checkFollowStatus: async (
        currentUserId: number,
        targetUserId: number
    ): Promise<boolean> => {
        try {
            const response = await fetch(
                `${API_BASE_URL}/api/users/${targetUserId}/follow-status?currentUserId=${currentUserId}`,
                {
                    headers: { 'Content-Type': 'application/json' },
                }
            );
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || '팔로우 상태 확인에 실패했습니다');
            }
            const data = await response.json();
            return data.isFollowing ?? data ?? false;
        } catch (error) {
            console.error('Check follow status error:', error);
            return false;
        }
    },
};

export default followApi;
export type { FollowUser };