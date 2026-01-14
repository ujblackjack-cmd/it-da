import apiClient from "./client";

/** ========== Types ========== */
export interface MyMeeting {
    meetingId: number;
    meetingTitle: string;
    dateTime: string;
    location: string;
    statusText: string;
    averageRating?: number;
    hasMyReview?: boolean;
}

export interface MyReview {
    reviewId: number;
    meetingId: number;
    meetingTitle: string;
    rating: number;
    content: string;
    createdAt: string;
    sentiment?: "positive" | "negative" | "neutral" | string;
}

export interface PendingReview {
    meetingId: number;
    meetingTitle: string;
    meetingDateText: string;
}

/** 후기 작성 요청 (payload) */
export interface ReviewCreateRequest {
    rating: number;
    content: string;
}

/** ========== API ========== */
const mypageApi = {
    // 후기 작성 대기 목록
    async getPendingReviews(userId: number, currentUserId: number): Promise<PendingReview[]> {
        try {
            const response = await apiClient.get(`/api/users/${userId}/pending-reviews`, {
                params: { currentUserId }
            });
            return response.data || [];
        } catch (error) {
            console.error('getPendingReviews error:', error);
            return [];
        }
    },

    // 내가 작성한 후기 목록
    async getMyReviews(userId: number, currentUserId: number): Promise<MyReview[]> {
        try {
            const response = await apiClient.get(`/api/users/${userId}/my-reviews`, {
                params: { currentUserId }
            });
            return response.data || [];
        } catch (error) {
            console.error('getMyReviews error:', error);
            return [];
        }
    },

    // 예정된 모임 목록
    async getUpcomingMeetings(userId: number, currentUserId: number): Promise<MyMeeting[]> {
        try {
            const response = await apiClient.get(`/api/users/${userId}/upcoming-meetings`, {
                params: { currentUserId }
            });
            return response.data || [];
        } catch (error) {
            console.error('getUpcomingMeetings error:', error);
            return [];
        }
    },

    // 완료된 모임 목록
    async getCompletedMeetings(userId: number, currentUserId: number): Promise<MyMeeting[]> {
        try {
            const response = await apiClient.get(`/api/users/${userId}/completed-meetings`, {
                params: { currentUserId }
            });
            return response.data || [];
        } catch (error) {
            console.error('getCompletedMeetings error:', error);
            return [];
        }
    },

    // 후기 작성
    async createReview(userId: number, meetingId: number, req: ReviewCreateRequest): Promise<void> {
        await apiClient.post(`/api/users/${userId}/meetings/${meetingId}/reviews`, req);
    },
};

export default mypageApi;
export { mypageApi };