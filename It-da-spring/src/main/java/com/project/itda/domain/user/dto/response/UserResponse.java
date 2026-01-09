package com.project.itda.domain.user.dto.response;

import com.project.itda.domain.user.entity.User;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class UserResponse {
    private Long userId;
    private String email;
    private String username;
    private String phone;

    public static UserResponse from(User user) {
        return UserResponse.builder()
                .userId(user.getUserId())
                .email(user.getEmail())
                .username(user.getUsername())
                .phone(user.getPhone())
                .build();
    }
}