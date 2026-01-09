package com.project.itda.domain.user.dto.response;

import com.project.itda.domain.user.entity.User;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class UserProfileResponse {
    private Long userId;
    private String username;
    private String email;
    private String phone;

    public static UserProfileResponse from(User user) {
        return UserProfileResponse.builder()
                .userId(user.getUserId())
                .username(user.getUsername())
                .email(user.getEmail())
                .phone(user.getPhone())
                .build();
    }
}