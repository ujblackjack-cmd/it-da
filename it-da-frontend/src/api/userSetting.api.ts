import apiClient from "./client";

export interface UserSettingResponse {
    settingId: number;
    notificationEnabled: boolean;
    pushNotification: boolean;
    locationTracking: boolean;
    followMeetingNotification: boolean;
    followReviewNotification: boolean;
}

export interface UserSettingUpdateRequest {
    notificationEnabled?: boolean;
    pushNotification?: boolean;
    locationTracking?: boolean;
    followMeetingNotification?: boolean;
    followReviewNotification?: boolean;
}

const userSettingApi = {
    async getSetting(userId: number): Promise<UserSettingResponse> {
        const response = await apiClient.get(`/api/users/${userId}/setting`);
        return response.data;
    },

    async updateSetting(userId: number, request: UserSettingUpdateRequest): Promise<UserSettingResponse> {
        const response = await apiClient.put(`/api/users/${userId}/setting`, request);
        return response.data;
    },
};

export default userSettingApi;