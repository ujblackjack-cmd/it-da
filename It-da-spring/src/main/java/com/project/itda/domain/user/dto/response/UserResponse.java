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
    private String profileImageUrl;
    private String bio;
    private String gender;
    private String address;

    public static UserResponse from(User user) {
        return UserResponse.builder()
                .userId(user.getUserId())
                .email(user.getEmail())
                .username(user.getUsername())
                .phone(user.getPhone())
                .profileImageUrl(user.getProfileImageUrl())
                .bio(user.getBio())
                .gender(user.getGender())
                .address(user.getAddress())
                .build();
    }
}