import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';

interface Meeting {
  meetingId: number;
  title: string;
  description: string;
  category: string;
  subcategory: string;
  locationName: string;
  meetingTime: string;
  maxParticipants: number;
  currentParticipants: number;
  expectedCost: number;
  vibe: string;
  imageUrl?: string;
  avgRating?: number;
  organizerId: number;
}

interface RecentItem {
  id: number;
  icon: string;
  title: string;
  time: string;
  type: 'chat' | 'meeting';
}

interface MeetingStore {
  // State
  meetings: Meeting[];
  recentItems: RecentItem[];
  aiRecommendation: Meeting | null;
  selectedCategory: string;
  searchQuery: string;
  isLoading: boolean;

  // Actions
  fetchMeetings: () => Promise<void>;
  fetchRecentItems: () => Promise<void>;
  fetchAIRecommendation: (userId: number) => Promise<void>;
  setCategory: (category: string) => void;
  setSearchQuery: (query: string) => void;
  searchMeetings: (query: string) => Promise<void>;
}

const API_BASE_URL = 'http://localhost:8080/api';

export const useMeetingStore = create<MeetingStore>()(
  persist(
    (set, get) => ({
      // Initial State
      meetings: [],
      recentItems: [],
      aiRecommendation: null,
      selectedCategory: '전체',
      searchQuery: '',
      isLoading: false,

      // Fetch all meetings
      fetchMeetings: async () => {
        set({ isLoading: true });
        try {
          const response = await axios.get(`${API_BASE_URL}/meetings`);
          
          // ✅ Spring Boot 응답 구조 처리
          // { success, message, meetings: [...], totalCount }
          const meetingsData = response.data.meetings || response.data || [];
          
          console.log('📦 API Response:', response.data);
          console.log('✅ Meetings 추출:', meetingsData);
          
          set({ 
            meetings: Array.isArray(meetingsData) ? meetingsData : [],
            isLoading: false 
          });
        } catch (error) {
          console.error('❌ 모임 조회 실패:', error);
          set({ meetings: [], isLoading: false });
        }
      },

      // Fetch recent items (최근 접속한 채팅방/캐시글)
      fetchRecentItems: async () => {
        try {
          // TODO: 실제 API 연동
          const mockData: RecentItem[] = [
            { id: 1, icon: '🌅', title: '한강 선셋 피크닉', time: '2시간 전', type: 'chat' },
            { id: 2, icon: '🏃', title: '주말 등산 모임', time: '어제', type: 'chat' },
            { id: 3, icon: '📚', title: '독서 토론회', time: '3일 전', type: 'meeting' },
            { id: 4, icon: '🎨', title: '수채화 그리기', time: '1주일 전', type: 'meeting' },
          ];
          set({ recentItems: mockData });
        } catch (error) {
          console.error('❌ 최근 항목 조회 실패:', error);
        }
      },

      // Fetch AI recommendation
      fetchAIRecommendation: async (userId: number) => {
        try {
          const response = await axios.get(
            `${API_BASE_URL}/ai/recommendations/meetings?user_id=${userId}&top_n=1`
          );
          
          if (response.data.recommended_meetings.length > 0) {
            const recommendedId = response.data.recommended_meetings[0].meeting_id;
            
            // 모임 상세 정보 조회
            const meetingResponse = await axios.get(`${API_BASE_URL}/meetings/${recommendedId}`);
            set({ aiRecommendation: meetingResponse.data });
          }
        } catch (error) {
          console.error('❌ AI 추천 조회 실패:', error);
        }
      },

      // Set category filter
      setCategory: (category: string) => {
        set({ selectedCategory: category });
      },

      // Set search query
      setSearchQuery: (query: string) => {
        set({ searchQuery: query });
      },

      // Search meetings
      searchMeetings: async (query: string) => {
        set({ isLoading: true, searchQuery: query });
        try {
          const response = await axios.get(`${API_BASE_URL}/meetings/search`, {
            params: { keyword: query }
          });
          
          // ✅ 검색 결과도 동일하게 처리
          const meetingsData = response.data.meetings || response.data || [];
          
          set({ 
            meetings: Array.isArray(meetingsData) ? meetingsData : [],
            isLoading: false 
          });
        } catch (error) {
          console.error('❌ 모임 검색 실패:', error);
          set({ meetings: [], isLoading: false });
        }
      },
    }),
    {
      name: 'meeting-storage', // localStorage key
      partialize: (state) => ({ 
        recentItems: state.recentItems,
        selectedCategory: state.selectedCategory 
      }),
    }
  )
);