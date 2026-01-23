package com.project.itda.domain.admin.dto.response;

import com.project.itda.domain.user.entity.User;
import com.project.itda.domain.user.enums.UserStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserManageResponse {
    private Long userId;
    private String email;
    private String username;
    private String nickname;
    private String phone;
    private String address;
    private UserStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime lastLoginAt;
    private Integer meetingCount;
    private Double rating;

    public static UserManageResponse from(User user) {
        return UserManageResponse.builder()
                .userId(user.getUserId())
                .email(user.getEmail())
                .username(user.getUsername())
                .nickname(user.getNickname())
                .phone(user.getPhone())
                .address(user.getAddress())
                .status(user.getStatus())
                .createdAt(user.getCreatedAt())
                .lastLoginAt(user.getLastLoginAt())
                .meetingCount(user.getMeetingCount() != null ? user.getMeetingCount() : 0)  // ✅ 기본값 0
                .rating(user.getRating() != null ? user.getRating() : 0.0)                  // ✅ 기본값 0.0
                .build();
    }
}