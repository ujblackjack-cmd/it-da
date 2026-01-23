// 관리자 타입 정의

export interface AdminUser {
    adminId: number;
    name: string;
    email: string;
    role: 'SUPER_ADMIN' | 'MODERATOR' | 'SUPPORT';
    lastLoginAt: string | null;
}

export interface AdminDashboard {
    adminId: number;
    name: string;
    email: string;
    role: string;
    lastLoginAt: string | null;
    // 통계
    pendingReportsCount: number;
    todayAnnouncementsCount: number;
    activeUsersCount: number;
    totalUsersCount: number;
    totalMeetingsCount: number;
    todayJoinedUsersCount: number;
    activeMeetingsCount: number;
    userGrowthRate: number;
    meetingGrowthRate: number;
    pendingInquiriesCount: number;
}

export interface RecentUser {
    userId: number;
    username: string;
    email: string;
    createdAt: string;
    status: string;
}

export interface RecentMeeting {
    meetingId: number;
    title: string;
    categoryName: string;
    currentMembers: number;
    createdAt: string;
}

export interface DashboardResponse {
    dashboard: AdminDashboard;
    recentUsers: RecentUser[];
    recentMeetings: RecentMeeting[];
}


export interface AdminCheckResponse {
    isAuthenticated: boolean;
    adminId?: number;
    name?: string;
    email?: string;
    role?: string;
}

// ========== 회원 관리 관련 타입 ==========

export interface UserManageResponse {
    userId: number;
    email: string;
    username: string;
    nickname?: string;
    phone?: string;
    address?: string;
    status: string;
    createdAt: string;
    lastLoginAt?: string;
    meetingCount?: number;
    rating?: number;
}

export interface UserListResponse {
    users: UserManageResponse[];
    currentPage: number;
    totalPages: number;
    totalElements: number;
}

export interface UserStatusRequest {
    status: 'ACTIVE' | 'SUSPENDED' | 'DELETED';
}


// ========== 모임 관리 관련 타입 ==========

export interface MeetingItem {
    meetingId: number;
    title: string;
    categoryName: string;
    subcategoryName: string;
    leaderName: string;
    currentMembers: number;
    maxMembers: number;
    meetingDate: string;
    location: string;
    status: string;
    createdAt: string;
}

export interface MeetingListResponse {
    meetings: MeetingItem[];
    totalElements: number;
    totalPages: number;
    currentPage: number;
}

export interface MeetingManageResponse {
    meetingId: number;
    title: string;
    categoryName: string;
    subcategoryName: string;
    leaderName: string;
    leaderEmail: string;

    meetingDate: string;
    location: string;

    maxMembers: number;
    currentMembers: number;

    expectedCost: number | null;
    avgRating: number | null;
    reviewCount: number | null;

    status: string;
    createdAt: string;
}

export interface MeetingStatusRequest {
    status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'DELETED';
}