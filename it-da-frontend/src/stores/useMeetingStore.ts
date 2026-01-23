// src/stores/useMeetingStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import axios from "axios";
import { meetingAPI } from "@/api/meeting.api";
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
}

interface MeetingStore {
    meetings: Meeting[];
    recentItems: RecentItem[];
    aiRecommendation: Meeting | null;
    selectedCategory: string;
    searchQuery: string;
    isLoading: boolean;
    currentMeeting: MeetingDetail | null;
    error: string | null;

    fetchMeetings: () => Promise<void>;
    fetchRecentItems: (userId?: number) => Promise<void>;  // ✅ userId 파라미터 추가
    fetchAIRecommendation: (userId: number) => Promise<void>;
    setCategory: (category: string) => void;
    setSearchQuery: (query: string) => void;
    searchMeetings: (query: string) => Promise<void>;
    fetchMeetingById: (id: number) => Promise<void>;
    fetchMeetingsByCategory: (
        category: string,
        subcategory?: string
    ) => Promise<void>;
}

const API_BASE_URL = "http://localhost:8080/api";

const normalizeMeeting = (m: any): Meeting => {
    const max = m.maxParticipants ?? m.max_participants ?? 0;
    const cur = m.currentParticipants ?? m.current_participants ?? 0;

    return {
        meetingId: m.meetingId ?? m.meeting_id,
        title: m.title,
        description: m.description,
        category: m.category,
        subcategory: m.subcategory,
        locationName: m.locationName ?? m.location_name,
        locationAddress: m.locationAddress ?? m.location_address ?? m.address,
        meetingTime: m.meetingTime ?? m.meeting_time,
        createdAt: m.createdAt ?? m.created_at,
        maxParticipants: max,
        currentParticipants: cur,
        expectedCost: m.expectedCost ?? m.expected_cost,
        vibe: m.vibe,
        imageUrl: m.imageUrl ?? m.image_url,
        avgRating: m.avgRating ?? m.avg_rating,
        organizerId:
            m.organizerId ?? m.organizer?.user_id ?? m.organizer?.userId ?? 0,
        isFull: m.isFull ?? m.is_full ?? (max > 0 ? cur >= max : false),
    };
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

            // --------------------
            // Actions
            // --------------------
            fetchMeetings: async () => {
                set({ isLoading: true });
                try {
                    const response = await axios.get(`${API_BASE_URL}/meetings`);
                    const meetingsData = response.data.meetings || response.data || [];

                    set({
                        meetings: Array.isArray(meetingsData)
                            ? meetingsData.map(normalizeMeeting)
                            : [],
                        isLoading: false,
                    });
                } catch (error) {
                    console.error("❌ 모임 조회 실패:", error);
                    set({ meetings: [], isLoading: false });
                }
            },

            // ✅ 실데이터로 변경! 내가 참여 중인 모임 목록 조회
            fetchRecentItems: async (userId?: number) => {
                // userId가 없으면 빈 배열
                if (!userId) {
                    set({ recentItems: [] });
                    return;
                }

                try {
                    console.log("📂 최근 참여 모임 조회 시작 - userId:", userId);

                    const response = await axios.get(
                        `${API_BASE_URL}/participations/my-recent`,
                        {
                            params: { limit: 4 },
                            withCredentials: true,
                        }
                    );

                    console.log("✅ 최근 참여 모임 응답:", response.data);

                    // API 응답을 RecentItem 형태로 변환
                    const recentData: RecentItem[] = response.data.map((item: any) => ({
                        id: item.meetingId,
                        chatRoomId: item.chatRoomId,
                        icon: item.icon || "📅",
                        title: item.title,
                        time: item.timeAgo || "",
                        type: "chat" as const,
                    }));

                    set({ recentItems: recentData });
                } catch (error) {
                    console.error("❌ 최근 참여 모임 조회 실패:", error);
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

                    set({
                        aiRecommendation: normalizeMeeting(response.data),
                    });
                } catch (error) {
                    console.error("❌ AI 추천 실패:", error);
                    set({ aiRecommendation: null });
                }
            },

            setCategory: (category: string) => set({ selectedCategory: category }),
            setSearchQuery: (query: string) => set({ searchQuery: query }),

            searchMeetings: async (query: string) => {
                set({ isLoading: true, searchQuery: query });
                try {
                    const response = await axios.post(`${API_BASE_URL}/meetings/search`, {
                        keyword: query,
                        page: 0,
                        size: 50,
                    });

                    const meetingsData = response.data.meetings || [];
                    set({
                        meetings: Array.isArray(meetingsData)
                            ? meetingsData.map(normalizeMeeting)
                            : [],
                        isLoading: false,
                    });
                } catch (error) {
                    console.error("❌ 모임 검색 실패:", error);
                    set({ meetings: [], isLoading: false });
                }
            },

            fetchMeetingById: async (id: number) => {
                set({ isLoading: true, error: null });
                try {
                    const meeting = await meetingAPI.getMeetingById(id);
                    set({ currentMeeting: meeting, isLoading: false });
                } catch (error) {
                    set({
                        error: "모임 정보를 불러오는데 실패했습니다.",
                        isLoading: false,
                    });
                }
            },

            fetchMeetingsByCategory: async (
                category: string,
                subcategory?: string
            ) => {
                set({ isLoading: true, error: null });
                try {
                    const response = subcategory
                        ? await meetingAPI.getMeetingsByCategoryAndSubcategory(
                            category,
                            subcategory
                        )
                        : await meetingAPI.getMeetingsByCategory(category);

                    set({
                        meetings: response.meetings || [],
                        isLoading: false,
                    });
                } catch (error) {
                    set({
                        error: "모임 목록을 불러오는데 실패했습니다.",
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