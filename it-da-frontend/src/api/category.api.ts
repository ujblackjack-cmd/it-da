// src/api/category.api.ts
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_ORIGIN ?? 'http://localhost:8080';

// Axios 인스턴스 (세션 쿠키 포함)
const axiosInstance = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
});

// 카테고리 통계 타입 (단순)
export interface CategoryStats {
    [category: string]: number;  // "스포츠": 142, "맛집": 98, ...
}

// 카테고리 상세 통계 타입
export interface CategoryDetailStatsItem {
    meetings: number;
    members: number;
    rating: number;
}

export interface CategoryDetailStats {
    [category: string]: CategoryDetailStatsItem;
}

export const categoryAPI = {
    /**
     * ✅ 카테고리별 모임 개수 조회
     * GET /api/meetings/category-stats
     */
    getCategoryStats: async (): Promise<CategoryStats> => {
        const response = await axiosInstance.get('/api/meetings/category-stats');
        return response.data;
    },

    /**
     * ✅ 카테고리별 상세 통계 조회 (모임 수, 참여 멤버, 평균 평점)
     * GET /api/meetings/category-stats/detail
     */
    getCategoryDetailStats: async (): Promise<CategoryDetailStats> => {
        const response = await axiosInstance.get('/api/meetings/category-stats/detail');
        return response.data;
    },
};

export default categoryAPI;