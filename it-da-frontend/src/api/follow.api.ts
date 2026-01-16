import { API_BASE_URL } from './config';
import type { FollowUser } from '../types/follow.types';

const followApi = {
    // 팔로우하기 - POST /api/users/{userId}/follow/{targetUserId}
    follow: async (currentUserId: number, targetUserId: number): Promise<void> => {
        const response = await fetch(
            `${API_BASE_URL}/api/users/${currentUserId}/follow/${targetUserId}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            }
        );
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || '팔로우에 실패했습니다');
        }
    },

    // 언팔로우하기 - DELETE /api/users/{userId}/follow/{targetUserId}
    unfollow: async (currentUserId: number, targetUserId: number): Promise<void> => {
        const response = await fetch(
            `${API_BASE_URL}/api/users/${currentUserId}/follow/${targetUserId}`,
            {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
            }
        );
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || '언팔로우에 실패했습니다');
        }
    },

    // ✅ 팔로잉 목록 - currentUserId 추가!
    getFollowing: async (userId: number, currentUserId?: number): Promise<FollowUser[]> => {
        const url = currentUserId
            ? `${API_BASE_URL}/api/users/${userId}/following?currentUserId=${currentUserId}`
            : `${API_BASE_URL}/api/users/${userId}/following`;

        const response = await fetch(url, {
            headers: { 'Content-Type': 'application/json' }
        });
        if (!response.ok) {
            throw new Error('팔로잉 목록을 불러오는데 실패했습니다');
        }
        const data = await response.json();
        return Array.isArray(data) ? data : [];
    },

    // ✅ 팔로워 목록 - currentUserId 추가!
    getFollowers: async (userId: number, currentUserId?: number): Promise<FollowUser[]> => {
        const url = currentUserId
            ? `${API_BASE_URL}/api/users/${userId}/followers?currentUserId=${currentUserId}`
            : `${API_BASE_URL}/api/users/${userId}/followers`;

        const response = await fetch(url, {
            headers: { 'Content-Type': 'application/json' }
        });
        if (!response.ok) {
            throw new Error('팔로워 목록을 불러오는데 실패했습니다');
        }
        const data = await response.json();
        return Array.isArray(data) ? data : [];
    },

    // 팔로우 상태 확인 - GET /api/users/{userId}/is-following/{targetUserId}
    checkFollowStatus: async (currentUserId: number, targetUserId: number): Promise<boolean> => {
        try {
            const response = await fetch(
                `${API_BASE_URL}/api/users/${currentUserId}/is-following/${targetUserId}`,
                { headers: { 'Content-Type': 'application/json' } }
            );
            if (!response.ok) return false;
            const data = await response.json();
            return data.isFollowing ?? false;
        } catch {
            return false;
        }
    },

    // 팔로우 요청 보내기 (비공개 계정용)
    sendFollowRequest: async (currentUserId: number, targetUserId: number): Promise<void> => {
        const response = await fetch(
            `${API_BASE_URL}/api/users/${currentUserId}/follow-request/${targetUserId}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            }
        );
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || '팔로우 요청에 실패했습니다');
        }
    },

    // 팔로우 요청 수락
    acceptFollowRequest: async (currentUserId: number, requesterId: number): Promise<void> => {
        const response = await fetch(
            `${API_BASE_URL}/api/users/${currentUserId}/follow-request/${requesterId}/accept`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            }
        );
        if (!response.ok) {
            throw new Error('팔로우 요청 수락에 실패했습니다');
        }
    },

    // 팔로우 요청 거절
    rejectFollowRequest: async (currentUserId: number, requesterId: number): Promise<void> => {
        const response = await fetch(
            `${API_BASE_URL}/api/users/${currentUserId}/follow-request/${requesterId}`,
            {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
            }
        );
        if (!response.ok) {
            throw new Error('팔로우 요청 거절에 실패했습니다');
        }
    },

    // 받은 팔로우 요청 목록
    getFollowRequests: async (userId: number): Promise<FollowUser[]> => {
        const response = await fetch(
            `${API_BASE_URL}/api/users/${userId}/follow-requests`,
            { headers: { 'Content-Type': 'application/json' } }
        );
        if (!response.ok) {
            throw new Error('팔로우 요청 목록을 불러오는데 실패했습니다');
        }
        const data = await response.json();
        return Array.isArray(data) ? data : [];
    },

    // 팔로우 요청 상태 확인
    checkFollowRequestStatus: async (
        currentUserId: number,
        targetUserId: number
    ): Promise<'none' | 'pending' | 'following'> => {
        try {
            const response = await fetch(
                `${API_BASE_URL}/api/users/${currentUserId}/follow-request-status/${targetUserId}`,
                { headers: { 'Content-Type': 'application/json' } }
            );
            if (!response.ok) return 'none';
            const data = await response.json();
            return data.status ?? 'none';
        } catch {
            return 'none';
        }
    },
};

export default followApi;
export type { FollowUser };