import {
  Gender,
  UserStatus,
  ProfileVisibility,
  BudgetType,
  EnergyType,
  FrequencyType,
  LeadershipType,
  LocationType,
  PurposeType,
  TimePreference,
} from "./enums";

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
