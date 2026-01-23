package com.project.itda.domain.admin.dto.request;

import com.project.itda.domain.user.enums.UserStatus;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UserStatusRequest {
    private UserStatus status;
}