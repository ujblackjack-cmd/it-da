package com.project.itda.domain.user.dto.response;

import com.project.itda.domain.user.entity.User;
import com.project.itda.domain.user.enums.UserStatus;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class UserDetailResponse {
    private Long userId;
    private String email;
    private String username;
    private String phone;
    private UserStatus status;
    private LocalDateTime createdAt;

    public static UserDetailResponse from(User user) {
        return UserDetailResponse.builder()
                .userId(user.getUserId())
                .email(user.getEmail())
                .username(user.getUsername())
                .phone(user.getPhone())
                .status(user.getStatus())
                .createdAt(user.getCreatedAt())
                .build();
    }
}