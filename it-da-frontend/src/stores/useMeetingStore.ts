// src/stores/useMeetingStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import axios from "axios";
import { MeetingDetail } from "@/types/meeting.types";

interface Meeting {
    meetingId: number;
    title: string;
    description: string;
    category: string;
    subcategory: string;
    locationName: string;
    locationAddress?: string;
    meetingTime: string;
    createdAt?: string;
    maxParticipants: number;
    currentParticipants: number;
    expectedCost: number;
    vibe: string;
    imageUrl?: string;
    avgRating?: number;
    organizerId: number;
    isFull?: boolean;
}

interface RecentItem {
    id: number;
    chatRoomId: number;
    icon: string;
    title: string;
    time: string;
    type: "chat" | "meeting";
    imageUrl?: string;
    category?: string;
}

interface MeetingStore {
    // 기존 상태
    meetings: Meeting[];
    recentItems: RecentItem[];
    aiRecommendation: Meeting | null;
    selectedCategory: string;
    searchQuery: string;
    isLoading: boolean;
    currentMeeting: MeetingDetail | null;
    error: string | null;

    // 무한스크롤 상태
    currentPage: number;
    hasMore: boolean;
    isLoadingMore: boolean;
    totalElements: number;

    // 기존 액션
    fetchMeetings: () => Promise<void>;
    fetchRecentItems: (userId?: number) => Promise<void>;
    fetchAIRecommendation: (userId: number) => Promise<void>;
    setCategory: (category: string) => void;
    setSearchQuery: (query: string) => void;
    searchMeetings: (query: string) => Promise<void>;
    fetchMeetingById: (id: number) => Promise<void>;
    fetchMeetingsByCategory: (category: string, subcategory?: string) => Promise<void>;

    // 무한스크롤 액션
    fetchMoreMeetings: () => Promise<void>;
    fetchMoreMeetingsByCategory: (category: string, subcategory?: string) => Promise<void>;
    resetPagination: () => void;
}

const API_BASE_URL = "http://localhost:8080/api";
const PAGE_SIZE = 20;

const normalizeMeeting = (m: Meeting): Meeting => {
    const max = m.maxParticipants ?? 0;
    const cur = m.currentParticipants ?? 0;

    return {
        meetingId: m.meetingId,
        title: m.title,
        description: m.description,
        category: m.category,
        subcategory: m.subcategory,
        locationName: m.locationName,
        locationAddress: m.locationAddress,
        meetingTime: m.meetingTime,
        createdAt: m.createdAt,
        maxParticipants: max,
        currentParticipants: cur,
        expectedCost: m.expectedCost,
        vibe: m.vibe,
        imageUrl: m.imageUrl,
        avgRating: m.avgRating,
        organizerId: m.organizerId,
        isFull: m.isFull ?? (max > 0 ? cur >= max : false),
    };
};

const getTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "방금 전";
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    if (diffDays === 1) return "어제";
    if (diffDays < 7) return `${diffDays}일 전`;
    return `${Math.floor(diffDays / 7)}주 전`;
};

export const useMeetingStore = create<MeetingStore>()(
    persist(
        (set, get) => ({
            // --------------------
            // State
            // --------------------
            meetings: [],
            recentItems: [],
            aiRecommendation: null,
            selectedCategory: "전체",
            searchQuery: "",
            isLoading: false,
            currentMeeting: null,
            error: null,

            // 무한스크롤 상태
            currentPage: 0,
            hasMore: true,
            isLoadingMore: false,
            totalElements: 0,

            // --------------------
            // Actions
            // --------------------

            // 페이지네이션 리셋
            resetPagination: () => {
                set({
                    meetings: [],
                    currentPage: 0,
                    hasMore: true,
                    isLoadingMore: false,
                    totalElements: 0,
                });
            },

            // 첫 페이지 로드
            fetchMeetings: async () => {
                set({ isLoading: true, error: null, currentPage: 0 });
                try {
                    const response = await axios.get(`${API_BASE_URL}/meetings`, {
                        params: { page: 0, size: PAGE_SIZE },
                    });

                    const data = response.data;
                    const meetingsData = data.meetings || data.content || [];
                    // ✅ totalCount 또는 totalElements 둘 다 지원
                    const totalElements = data.totalCount || data.totalElements || 0;
                    const hasMore = meetingsData.length >= PAGE_SIZE;

                    set({
                        meetings: Array.isArray(meetingsData)
                            ? meetingsData.map(normalizeMeeting)
                            : [],
                        isLoading: false,
                        currentPage: 0,
                        hasMore: hasMore,
                        totalElements: totalElements,
                    });

                    console.log(`✅ 첫 페이지 로드 완료: ${meetingsData.length}개, 전체: ${totalElements}개, hasMore: ${hasMore}`);
                } catch (error) {
                    console.error("❌ 모임 조회 실패:", error);
                    set({ meetings: [], isLoading: false, hasMore: false });
                }
            },

            // 추가 페이지 로드 (무한스크롤)
            fetchMoreMeetings: async () => {
                const { isLoadingMore, hasMore, currentPage, meetings } = get();

                if (isLoadingMore || !hasMore) {
                    console.log("⏸️ 추가 로드 스킵:", { isLoadingMore, hasMore });
                    return;
                }

                set({ isLoadingMore: true });

                try {
                    const nextPage = currentPage + 1;
                    console.log(`📦 페이지 ${nextPage} 로드 중...`);

                    const response = await axios.get(`${API_BASE_URL}/meetings`, {
                        params: { page: nextPage, size: PAGE_SIZE },
                    });

                    const data = response.data;
                    const newMeetings = data.meetings || data.content || [];
                    // ✅ totalCount 또는 totalElements 둘 다 지원
                    const totalElements = data.totalCount || data.totalElements || get().totalElements;
                    const hasMoreData = newMeetings.length >= PAGE_SIZE;

                    if (newMeetings.length > 0) {
                        const normalizedNew = newMeetings.map(normalizeMeeting);

                        // 중복 제거
                        const existingIds = new Set(meetings.map((m) => m.meetingId));
                        const uniqueNew = normalizedNew.filter(
                            (m: Meeting) => !existingIds.has(m.meetingId)
                        );

                        set({
                            meetings: [...meetings, ...uniqueNew],
                            currentPage: nextPage,
                            hasMore: hasMoreData,
                            isLoadingMore: false,
                            totalElements: totalElements,
                        });

                        console.log(`✅ 페이지 ${nextPage} 로드 완료: ${uniqueNew.length}개 추가, 총 ${meetings.length + uniqueNew.length}개`);
                    } else {
                        set({ hasMore: false, isLoadingMore: false });
                        console.log("🏁 모든 데이터 로드 완료");
                    }
                } catch (error) {
                    console.error("❌ 추가 모임 조회 실패:", error);
                    set({ isLoadingMore: false });
                }
            },

            // 카테고리별 첫 페이지 로드
            fetchMeetingsByCategory: async (category: string, subcategory?: string) => {
                set({ isLoading: true, error: null, currentPage: 0, selectedCategory: category });

                try {
                    const params: Record<string, string | number> = { page: 0, size: PAGE_SIZE };
                    if (category) params.category = category;
                    if (subcategory) params.subcategory = subcategory;

                    const response = await axios.get(`${API_BASE_URL}/meetings`, { params });

                    const data = response.data;
                    const meetingsData = data.meetings || data.content || [];
                    // ✅ totalCount 또는 totalElements 둘 다 지원
                    const totalElements = data.totalCount || data.totalElements || 0;
                    const hasMore = meetingsData.length >= PAGE_SIZE;

                    set({
                        meetings: Array.isArray(meetingsData)
                            ? meetingsData.map(normalizeMeeting)
                            : [],
                        isLoading: false,
                        currentPage: 0,
                        hasMore: hasMore,
                        totalElements: totalElements,
                    });

                    console.log(`✅ 카테고리 [${category}] 첫 페이지 로드: ${meetingsData.length}개, 전체: ${totalElements}개`);
                } catch (error) {
                    console.error("❌ 카테고리 모임 조회 실패:", error);
                    set({
                        error: "모임 목록을 불러오는데 실패했습니다.",
                        isLoading: false,
                        hasMore: false,
                    });
                }
            },

            // 카테고리별 추가 페이지 로드
            fetchMoreMeetingsByCategory: async (category: string, subcategory?: string) => {
                const { isLoadingMore, hasMore, currentPage, meetings } = get();

                if (isLoadingMore || !hasMore) return;

                set({ isLoadingMore: true });

                try {
                    const nextPage = currentPage + 1;
                    const params: Record<string, string | number> = { page: nextPage, size: PAGE_SIZE };
                    if (category) params.category = category;
                    if (subcategory) params.subcategory = subcategory;

                    const response = await axios.get(`${API_BASE_URL}/meetings`, { params });

                    const data = response.data;
                    const newMeetings = data.meetings || data.content || [];
                    // ✅ totalCount 또는 totalElements 둘 다 지원
                    const totalElements = data.totalCount || data.totalElements || get().totalElements;
                    const hasMoreData = newMeetings.length >= PAGE_SIZE;

                    if (newMeetings.length > 0) {
                        const normalizedNew = newMeetings.map(normalizeMeeting);
                        const existingIds = new Set(meetings.map((m) => m.meetingId));
                        const uniqueNew = normalizedNew.filter(
                            (m: Meeting) => !existingIds.has(m.meetingId)
                        );

                        set({
                            meetings: [...meetings, ...uniqueNew],
                            currentPage: nextPage,
                            hasMore: hasMoreData,
                            isLoadingMore: false,
                            totalElements: totalElements,
                        });
                    } else {
                        set({ hasMore: false, isLoadingMore: false });
                    }
                } catch (error) {
                    console.error("❌ 추가 카테고리 모임 조회 실패:", error);
                    set({ isLoadingMore: false });
                }
            },

            // 최근 조회 모임 로드
            fetchRecentItems: async () => {
                try {
                    const STORAGE_KEY = "recentViewedMeetings";
                    const stored = localStorage.getItem(STORAGE_KEY);

                    if (!stored) {
                        set({ recentItems: [] });
                        return;
                    }

                    const recentList = JSON.parse(stored);
                    const recentData: RecentItem[] = recentList
                        .slice(0, 4)
                        .map((item: RecentItem) => ({
                            id: item.id,
                            chatRoomId: item.chatRoomId,
                            icon: item.icon || "📅",
                            title: item.title,
                            time: getTimeAgo(item.time),
                            type: "meeting" as const,
                            imageUrl: item.imageUrl,
                            category: item.category,
                        }));

                    set({ recentItems: recentData });
                } catch (error) {
                    console.error("❌ 최근 조회 모임 로드 실패:", error);
                    set({ recentItems: [] });
                }
            },

            fetchAIRecommendation: async (userId: number) => {
                try {
                    const response = await axios.get(
                        `${API_BASE_URL}/ai/recommendations/personalized/${userId}`
                    );

                    if (!response.data?.success) {
                        set({ aiRecommendation: null });
                        return;
                    }

                    set({ aiRecommendation: normalizeMeeting(response.data) });
                } catch (error) {
                    console.error("❌ AI 추천 실패:", error);
                    set({ aiRecommendation: null });
                }
            },

            setCategory: (category: string) => set({ selectedCategory: category }),
            setSearchQuery: (query: string) => set({ searchQuery: query }),

            searchMeetings: async (query: string) => {
                set({ isLoading: true, searchQuery: query, currentPage: 0 });
                try {
                    const response = await axios.post(`${API_BASE_URL}/meetings/search`, {
                        keyword: query,
                        page: 0,
                        size: PAGE_SIZE,
                    });

                    const data = response.data;
                    const meetingsData = data.meetings || [];
                    // ✅ totalCount 또는 totalElements 둘 다 지원
                    const totalElements = data.totalCount || data.totalElements || 0;

                    set({
                        meetings: Array.isArray(meetingsData)
                            ? meetingsData.map(normalizeMeeting)
                            : [],
                        isLoading: false,
                        hasMore: meetingsData.length >= PAGE_SIZE,
                        totalElements: totalElements,
                    });
                } catch (error) {
                    console.error("❌ 모임 검색 실패:", error);
                    set({ meetings: [], isLoading: false, hasMore: false });
                }
            },

            fetchMeetingById: async (id: number) => {
                set({ isLoading: true, error: null });
                try {
                    const response = await axios.get(`${API_BASE_URL}/meetings/${id}`);
                    set({ currentMeeting: response.data, isLoading: false });
                } catch (error) {
                    set({
                        error: "모임 정보를 불러오는데 실패했습니다.",
                        isLoading: false,
                    });
                }
            },
        }),
        {
            name: "meeting-storage",
            partialize: (state) => ({
                recentItems: state.recentItems,
                selectedCategory: state.selectedCategory,
            }),
        }
    )
);