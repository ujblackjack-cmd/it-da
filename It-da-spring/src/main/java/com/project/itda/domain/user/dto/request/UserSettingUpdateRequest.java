package com.project.itda.domain.user.dto.request;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class UserSettingUpdateRequest {
    private Boolean notificationEnabled;
    private Boolean pushNotification;
    private Boolean locationTracking;
}