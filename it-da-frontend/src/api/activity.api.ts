// src/api/activity.api.ts
import apiClient from "./client";

export interface Activity {
    id: number;
    type: "PARTICIPATION" | "REVIEW" | "BADGE" | "MEETING_CREATED";
    title: string;
    description: string;
    icon: string;
    date: string;
    relatedId: number;
}

/**
 * 사용자 활동 기록 조회
 */
export async function getActivities(userId: number, limit: number = 20): Promise<Activity[]> {
    const response = await apiClient.get<Activity[]>(`/api/users/${userId}/activities`, {
        params: { limit },
    });
    return response.data;
}

export default {
    getActivities,
};