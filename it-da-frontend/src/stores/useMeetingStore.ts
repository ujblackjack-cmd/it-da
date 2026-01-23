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
  imageUrl?: string; // ✅ 이미지 URL 추가
  category?: string; // ✅ 카테고리 추가
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
  fetchRecentItems: (userId?: number) => Promise<void>;
  fetchAIRecommendation: (userId: number) => Promise<void>;
  setCategory: (category: string) => void;
  setSearchQuery: (query: string) => void;
  searchMeetings: (query: string) => Promise<void>;
  fetchMeetingById: (id: number) => Promise<void>;
  fetchMeetingsByCategory: (
    category: string,
    subcategory?: string,
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

// ✅ 시간 차이 계산 함수
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

      // ✅ 최근 조회 모임 로드 (localStorage 기반)
      fetchRecentItems: async (userId?: number) => {
        try {
          console.log("📂 최근 조회 모임 로드 시작");

          const STORAGE_KEY = "recentViewedMeetings";
          const stored = localStorage.getItem(STORAGE_KEY);

          if (!stored) {
            console.log("📂 저장된 조회 기록 없음");
            set({ recentItems: [] });
            return;
          }

          const recentList = JSON.parse(stored);
          console.log("📂 localStorage에서 로드:", recentList.length, "개");

          // RecentItem 형태로 변환
          const recentData: RecentItem[] = recentList
            .slice(0, 4)
            .map((item: any) => ({
              id: item.meetingId || item.id,
              icon: item.icon || "📅",
              title: item.title,
              time: getTimeAgo(item.time),
              type: "meeting" as const,
              imageUrl: item.imageUrl,
              category: item.category,
            }));

          set({ recentItems: recentData });
          console.log("✅ 최근 조회 모임 로드 완료:", recentData.length, "개");
        } catch (error) {
          console.error("❌ 최근 조회 모임 로드 실패:", error);
          set({ recentItems: [] });
        }
      },

      fetchAIRecommendation: async (userId: number) => {
        try {
          const response = await axios.get(
            `${API_BASE_URL}/ai/recommendations/personalized/${userId}`,
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
        subcategory?: string,
      ) => {
        set({ isLoading: true, error: null });
        try {
          const response = subcategory
            ? await meetingAPI.getMeetingsByCategoryAndSubcategory(
                category,
                subcategory,
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
    },
  ),
);
