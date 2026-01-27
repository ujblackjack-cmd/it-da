// src/api/meeting.api.ts
import axios from 'axios';
import { Meeting, MeetingDetail, MeetingListResponse } from '@/types/meeting.types';

const API_BASE_URL = 'http://localhost:8080/api';

// Axios 인스턴스 (세션 쿠키 포함)
const axiosInstance = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
});

// ✅ 페이징 응답 타입
export interface PaginatedMeetingResponse {
    meetings: Meeting[];
    totalElements: number;
    totalPages: number;
    currentPage: number;
    hasNext: boolean;
    size: number;
}

export const meetingAPI = {
    /**
     * ✅ 전체 모임 조회 (페이징 지원)
     */
    getAllMeetings: async (page: number = 0, size: number = 20): Promise<PaginatedMeetingResponse> => {
        const response = await axiosInstance.get('/meetings', {
            params: { page, size },
        });

        // 백엔드 응답 구조에 맞게 변환
        const data = response.data;
        return {
            meetings: data.meetings || data.content || [],
            totalElements: data.totalElements || 0,
            totalPages: data.totalPages || 0,
            currentPage: data.currentPage ?? page,
            hasNext: data.hasNext ?? (page < (data.totalPages || 1) - 1),
            size: data.size || size,
        };
    },

    /**
     * 모임 상세 조회
     */
    getMeetingById: async (id: number): Promise<MeetingDetail> => {
        const response = await axiosInstance.get(`/meetings/${id}`);
        return response.data;
    },

    /**
     * ✅ 카테고리별 조회 (페이징 지원)
     */
    getMeetingsByCategory: async (
        category: string,
        page: number = 0,
        size: number = 20
    ): Promise<PaginatedMeetingResponse> => {
        const response = await axiosInstance.get('/meetings', {
            params: { category, page, size },
        });

        const data = response.data;
        return {
            meetings: data.meetings || data.content || [],
            totalElements: data.totalElements || 0,
            totalPages: data.totalPages || 0,
            currentPage: data.currentPage ?? page,
            hasNext: data.hasNext ?? (page < (data.totalPages || 1) - 1),
            size: data.size || size,
        };
    },

    /**
     * ✅ 카테고리 + 서브카테고리 조회 (페이징 지원)
     */
    getMeetingsByCategoryAndSubcategory: async (
        category: string,
        subcategory: string,
        page: number = 0,
        size: number = 20
    ): Promise<PaginatedMeetingResponse> => {
        const response = await axiosInstance.get('/meetings/search', {
            params: { category, subcategory, page, size },
        });

        const data = response.data;
        return {
            meetings: data.meetings || data.content || [],
            totalElements: data.totalElements || 0,
            totalPages: data.totalPages || 0,
            currentPage: data.currentPage ?? page,
            hasNext: data.hasNext ?? (page < (data.totalPages || 1) - 1),
            size: data.size || size,
        };
    },

    /**
     * 키워드 검색 (페이징 지원)
     */
    searchMeetings: async (
        keyword: string,
        page: number = 0,
        size: number = 20
    ): Promise<PaginatedMeetingResponse> => {
        const response = await axiosInstance.get('/meetings/search', {
            params: { keyword, page, size },
        });

        const data = response.data;
        return {
            meetings: data.meetings || data.content || [],
            totalElements: data.totalElements || 0,
            totalPages: data.totalPages || 0,
            currentPage: data.currentPage ?? page,
            hasNext: data.hasNext ?? (page < (data.totalPages || 1) - 1),
            size: data.size || size,
        };
    },
};