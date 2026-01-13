// src/types/auth.types.ts

// 로그인 요청
export interface LoginRequest {
    email: string;
    password: string;
}

// 로그인 응답 (Redis 세션 방식)
export interface LoginResponse {
    sessionId: string;
    userId: number;
    email: string;
    username: string;
    nickname?: string;
}

// ✅ UserPreference 타입
export interface UserPreferenceRequest {
    energyType: string;
    purposeType: string;
    frequencyType: string;
    locationType: string;
    budgetType: string;
    leadershipType: string;
    timePreference: string;
    interests: string;  // JSON 문자열
}

// ✅ 회원가입 요청 (백엔드 스펙 완전 일치)
export interface SignupRequest {
    email: string;
    password: string;
    username: string;
    phone?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    preferences?: UserPreferenceRequest;
    nickname?: string;
}

// 세션 정보 응답
export interface SessionInfoResponse {
    userId: number;
    email: string;
    username: string;
    nickname?: string;
}

// User 타입 (Store용)
export interface User {
    userId: number;
    email: string;
    username: string;
    nickname?: string;
}