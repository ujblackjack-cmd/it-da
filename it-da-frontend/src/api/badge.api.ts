// src/api/badge.api.ts
import axios, { type InternalAxiosRequestConfig } from "axios";
import type { UserBadgeDto } from "@/types/badge";
export type { UserBadgeDto, BadgeCategory, BadgeGrade } from "@/types/badge";

// ✅ Badge 타입 export (useMyBadges.ts 호환용)
export type Badge = UserBadgeDto;

const http = axios.create({
    baseURL: import.meta.env?.VITE_API_BASE_URL ?? "http://localhost:8080",
    withCredentials: true,
    headers: { "Content-Type": "application/json" },
});

/**
 * ✅ 유저 ID 가져오기 (우선순위)
 * 1. localStorage "user" → userId
 * 2. localStorage "devUserId"
 * 3. 기본값 "1"
 */
function getUserId(): string {
    // 1. 실제 로그인한 유저 확인
    const userStr = localStorage.getItem("user");
    if (userStr) {
        try {
            const user = JSON.parse(userStr);
            if (user?.userId) {
                return String(user.userId);
            }
        } catch {
            // JSON 파싱 실패 시 무시
        }
    }

    // 2. devUserId 확인
    const devUserId = localStorage.getItem("devUserId");
    if (devUserId && devUserId.trim() !== "") {
        return devUserId;
    }

    // 3. 기본값
    return "1";
}

// ✅ 모든 요청에 X-User-Id 헤더 자동 추가
http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const userId = getUserId();
    config.headers.set("X-User-Id", userId);
    console.log("🔑 Badge API 요청 - userId:", userId); // 디버깅용
    return config;
});

/**
 * 전체 배지 조회 (획득 + 미획득)
 */
export async function getUserBadges(): Promise<UserBadgeDto[]> {
    const res = await http.get<UserBadgeDto[]>("/api/badges");
    console.log("📦 Badge API 응답:", res.data); // 디버깅용
    return res.data;
}

/**
 * ✅ 획득한 배지만 조회
 */
export async function getUnlockedBadges(_userId?: number): Promise<UserBadgeDto[]> {
    const res = await http.get<UserBadgeDto[]>("/api/badges/unlocked");
    return res.data;
}

/**
 * 모든 배지 진행도 업데이트 (중요!)
 * - user_badges 테이블에 레코드가 없으면 이 API를 먼저 호출해야 함
 */
export async function updateAllBadges(): Promise<unknown> {
    const res = await http.post("/api/badges/update-all");
    return res.data;
}

/**
 * 특정 배지 진행도 업데이트
 */
export async function updateBadgeProgress(badgeCode: string): Promise<unknown> {
    const res = await http.post(`/api/badges/${encodeURIComponent(badgeCode)}/update`);
    return res.data;
}