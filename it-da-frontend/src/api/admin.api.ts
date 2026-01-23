import client from './client';
import type {
    AdminCheckResponse,
    DashboardResponse,
    UserListResponse,
    UserManageResponse,
    UserStatusRequest,
    MeetingListResponse,
    MeetingManageResponse,
    MeetingStatusRequest,
} from '../types/admin.types';

const BASE_URL = '/api/admin';

/**
 * 관리자 로그아웃
 */
export const adminLogout = async (): Promise<void> => {
    await client.post(`${BASE_URL}/logout`);
};

/**
 * 관리자 세션 체크
 */
export const checkAdminSession = async (): Promise<AdminCheckResponse> => {
    const response = await client.get<AdminCheckResponse>(`${BASE_URL}/check`);
    return response.data;
};

/**
 * 대시보드 데이터 조회
 */
export const getDashboard = async (): Promise<DashboardResponse> => {
    const response = await client.get<DashboardResponse>(`${BASE_URL}/dashboard`);
    return response.data;
};


// ========== 회원 관리 ==========

/**
 * 회원 목록 조회
 */
export const getUserList = async (
    page: number = 0,
    size: number = 10,
    search?: string
): Promise<UserListResponse> => {
    const params = new URLSearchParams({
        page: page.toString(),
        size: size.toString(),
    });
    if (search) {
        params.append('search', search);
    }

    const response = await client.get<UserListResponse>(
        `${BASE_URL}/users?${params.toString()}`
    );
    return response.data;
};

/**
 * 회원 상세 조회
 */
export const getUserDetail = async (userId: number): Promise<UserManageResponse> => {
    const response = await client.get<UserManageResponse>(`${BASE_URL}/users/${userId}`);
    return response.data;
};

/**
 * 회원 상태 변경
 */
export const updateUserStatus = async (
    userId: number,
    status: UserStatusRequest
): Promise<string> => {
    const response = await client.patch<string>(`${BASE_URL}/users/${userId}/status`, status);
    return response.data;
};


// ========== 모임 관리 ==========

/**
 * 모임 목록 조회
 */
export const getMeetingList = async (
    page: number = 0,
    size: number = 10,
    search?: string,
    category?: string,
    status?: string
): Promise<MeetingListResponse> => {
    const params = new URLSearchParams({
        page: page.toString(),
        size: size.toString(),
    });

    if (search) params.append('search', search);
    if (category) params.append('category', category);
    if (status) params.append('status', status);

    const response = await client.get<MeetingListResponse>(
        `${BASE_URL}/meetings?${params.toString()}`
    );
    return response.data;
};

/**
 * 모임 상세 조회
 */
export const getMeetingDetail = async (meetingId: number): Promise<MeetingManageResponse> => {
    const response = await client.get<MeetingManageResponse>(
        `${BASE_URL}/meetings/${meetingId}`
    );
    return response.data;
};

/**
 * 모임 상태 변경
 */
export const updateMeetingStatus = async (
    meetingId: number,
    request: MeetingStatusRequest
): Promise<string> => {
    const response = await client.patch<string>(
        `${BASE_URL}/meetings/${meetingId}/status`,
        request
    );
    return response.data;
};