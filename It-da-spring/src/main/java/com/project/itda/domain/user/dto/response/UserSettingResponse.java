package com.project.itda.domain.user.dto.response;

import com.project.itda.domain.user.entity.UserSetting;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class UserSettingResponse {
    private Long settingId;
    private Long userId;
    private Boolean notificationEnabled;
    private Boolean pushNotification;
    private Boolean locationTracking;

    public static UserSettingResponse from(UserSetting setting) {
        return UserSettingResponse.builder()
                .settingId(setting.getSettingId())
                .userId(setting.getUser().getUserId())
                .notificationEnabled(setting.getNotificationEnabled())
                .pushNotification(setting.getPushNotification())
                .locationTracking(setting.getLocationTracking())
                .build();
    }
}