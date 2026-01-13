package com.project.itda.domain.user.dto.response;

import com.project.itda.domain.user.entity.User;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class FollowResponse {
    private Long userId;
    private String username;
    private String email;
    private String profileImageUrl;
    private Boolean isFollowing; // 내가 이 사람을 팔로우하는지

    public static FollowResponse from(User user, Boolean isFollowing) {
        return FollowResponse.builder()
                .userId(user.getUserId())
                .username(user.getUsername())
                .email(user.getEmail())
                .profileImageUrl(user.getProfileImageUrl())
                .isFollowing(isFollowing)
                .build();
    }
}