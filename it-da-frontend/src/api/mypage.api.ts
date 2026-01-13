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
    createdAt: string; // ✅ createdAt로 통일
    sentiment?: "positive" | "negative" | "neutral" | string;
}

export interface PendingReview {
    meetingId: number;
    meetingTitle: string;
    meetingDateText: string; // "2026-01-03 참여"
}

/** 후기 작성 요청 (payload) */
export interface ReviewCreateRequest {
    rating: number;
    content: string;
}

/** ========== MOCK HELPERS ========== */
const mockDelay = (ms: number) => new Promise((r) => setTimeout(r, ms));

const mockPending: PendingReview[] = [
    { meetingId: 3, meetingTitle: "독서 모임", meetingDateText: "2026-01-03 참여" },
];

const mockReviews: MyReview[] = [
    {
        reviewId: 10,
        meetingId: 2,
        meetingTitle: "클라이밍",
        rating: 5,
        content: "완전 재밌었어요!",
        createdAt: new Date().toISOString(),
        sentiment: "positive",
    },
];

const mockUpcoming: MyMeeting[] = [
    {
        meetingId: 1,
        meetingTitle: "러닝 크루",
        dateTime: new Date(Date.now() + 86400000).toISOString(),
        location: "서울",
        statusText: "예정",
        averageRating: 4.6,
        hasMyReview: false,
    },
];

const mockCompleted: MyMeeting[] = [
    {
        meetingId: 2,
        meetingTitle: "클라이밍",
        dateTime: new Date(Date.now() - 86400000 * 3).toISOString(),
        location: "성수",
        statusText: "완료",
        averageRating: 4.9,
        hasMyReview: true,
    },
];

/** ========== API ========== */
/**
 * ✅ 지금 프론트(MyPage.tsx)가 기대하는 형태:
 * mypageApi.getPendingReviews(viewingUserId, currentUserId)
 * mypageApi.getMyReviews(viewingUserId, currentUserId)
 * mypageApi.getUpcomingMeetings(viewingUserId, currentUserId)
 * mypageApi.getCompletedMeetings(viewingUserId, currentUserId)
 * mypageApi.createReview(userId, meetingId, payload)
 */
const mypageApi = {
    async getPendingReviews(userId: number, currentUserId: number): Promise<PendingReview[]> {
        void userId;
        void currentUserId;
        // 백엔드 붙이면:
        // return (await apiClient.get(`/api/mypage/${userId}/pending-reviews`, { params: { currentUserId } })).data;
        await mockDelay(150);
        return mockPending;
    },

    async getMyReviews(userId: number, currentUserId: number): Promise<MyReview[]> {
        void userId;
        void currentUserId;
        // 백엔드 붙이면:
        // return (await apiClient.get(`/api/mypage/${userId}/reviews`, { params: { currentUserId } })).data;
        await mockDelay(150);
        return mockReviews;
    },

    async getUpcomingMeetings(userId: number, currentUserId: number): Promise<MyMeeting[]> {
        void userId;
        void currentUserId;
        // 백엔드 붙이면:
        // return (await apiClient.get(`/api/mypage/${userId}/meetings/upcoming`, { params: { currentUserId } })).data;
        await mockDelay(150);
        return mockUpcoming;
    },

    async getCompletedMeetings(userId: number, currentUserId: number): Promise<MyMeeting[]> {
        void userId;
        void currentUserId;
        // 백엔드 붙이면:
        // return (await apiClient.get(`/api/mypage/${userId}/meetings/completed`, { params: { currentUserId } })).data;
        await mockDelay(150);
        return mockCompleted;
    },

    async createReview(userId: number, meetingId: number, req: ReviewCreateRequest): Promise<void> {
        void userId;
        void meetingId;
        // 백엔드 붙이면:
        // await apiClient.post(`/api/mypage/${userId}/meetings/${meetingId}/reviews`, req);
        await mockDelay(150);

        // mock이라도 “쓴 것처럼” 보이게 completed에 hasMyReview 반영하고 리뷰 추가하는 흉내
        const idx = mockCompleted.findIndex((m) => m.meetingId === meetingId);
        if (idx >= 0) mockCompleted[idx] = { ...mockCompleted[idx], hasMyReview: true };

        mockReviews.unshift({
            reviewId: Math.floor(Math.random() * 1000000),
            meetingId,
            meetingTitle: mockCompleted.find((m) => m.meetingId === meetingId)?.meetingTitle ?? "모임",
            rating: req.rating,
            content: req.content,
            createdAt: new Date().toISOString(),
            sentiment: "neutral",
        });
    },
};

export default mypageApi;
export { mypageApi };
