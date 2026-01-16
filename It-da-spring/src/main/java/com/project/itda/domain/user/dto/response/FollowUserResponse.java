package com.project.itda.domain.user.dto.response;

import com.project.itda.domain.user.entity.User;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FollowUserResponse {

    private Long userId;
    private String username;
    private String profileImageUrl;
    private String email;
    private Boolean isFollowing;

    /**
     * User 엔티티로부터 FollowUserResponse 생성 (isFollowing 포함)
     */
    public static FollowUserResponse from(User user, Boolean isFollowing) {
        return FollowUserResponse.builder()
                .userId(user.getUserId())
                .username(user.getUsername())
                .profileImageUrl(user.getProfileImageUrl())
                .email(user.getEmail())
                .isFollowing(isFollowing)
                .build();
    }

    /**
     * User 엔티티로부터 FollowUserResponse 생성 (isFollowing 없음 - 기본 false)
     */
    public static FollowUserResponse from(User user) {
        return from(user, false);
    }
}