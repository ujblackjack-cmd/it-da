package com.project.itda.domain.user.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum UserStatus {
    ACTIVE("활성", "Active"),
    INACTIVE("비활성", "Inactive"),
    SUSPENDED("정지", "Suspended"),
    DELETED("탈퇴", "Deleted");

    private final String korean;
    private final String english;

    public boolean isAvailable() {
        return this == ACTIVE;
    }

    public boolean canLogin() {
        return this == ACTIVE || this == INACTIVE;
    }
}