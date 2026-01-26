import { Gender, UserStatus } from "./enums";

// User 타입 (백엔드 User Entity 기반)
export interface User {
    userId: number;
    email: string;
    username: string;
    role?: "LEADER" | "MEMBER" | "ME";
    nickname?: string;
    phoneNumber?: string;
    birthDate?: string;
    gender?: Gender;
    profileImageUrl?: string;
    bio?: string;
    status: UserStatus;
    createdAt: string;
    updatedAt: string;

    // chatMemeberList 호환성 별칭
    id: number;        // userId의 별칭
    name: string;      // username의 별칭
    isFollowing?: boolean;
}

// 회원가입 요청
export interface SignupRequest {
    email: string;
    password: string;
    username: string;
    nickname?: string;
    address?: string;
    phone?: string;
}

// 로그인 요청
export interface LoginRequest {
    email: string;
    password: string;
}

// 로그인 응답 (Redis 세션 방식)
export interface LoginResponse {
    sessionId: string;       // ✅ 세션 ID
    userId: number;          // ✅ userId
    email: string;
    username: string;        // ✅ 이름
    nickname?: string;       // ✅ 별칭
}

// 세션 정보 응답
export interface SessionInfoResponse {
    userId: number;
    email: string;
    username: string;
    nickname?: string;
}

// ✅ 사용자 선호도
export interface UserPreference {
    id?: number;
    userId?: number;
    preferenceId?: number;  // ✅ 추가: 백엔드 응답 필드

    // 예시 필드들 (백엔드 스펙에 맞게 바꿔도 됨)
    preferredLocation?: string;
    preferredPurpose?: string;
    preferredTime?: string;
    budgetType?: string;
    energyType?: string;
    frequencyType?: string;

    // ✅ 추가: 백엔드 응답 필드들
    purposeType?: string;
    locationType?: string;
    leadershipType?: string;
    timePreference?: string;
    interests?: string;

    createdAt?: string;
    updatedAt?: string;
}

export interface UserPreferenceRequest {
    energyType?: string;
    purposeType?: string;
    frequencyType?: string;
    locationType?: string;
    budgetType?: string;
    leadershipType?: string;
    timePreference?: string;
    interests?: string;
}

// ✅ 사용자 설정
export interface UserSetting {
    id?: number;
    userId?: number;

    notificationEnabled?: boolean;
    emailNotificationEnabled?: boolean;
    profileVisibility?: string;

    createdAt?: string;
    updatedAt?: string;
}

export interface UserSettingRequest {
    notificationEnabled?: boolean;
    emailNotificationEnabled?: boolean;
    profileVisibility?: string;
}
