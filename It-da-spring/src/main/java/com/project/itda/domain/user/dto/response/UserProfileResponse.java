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
    private String address;
    private String profileImageUrl;

    // 통계 정보
    private Long followingCount;
    private Long followerCount;
    private Long participatedMeetingsCount;
    private Long badgesCount;
    private Double averageRating;

    public static UserProfileResponse from(User user, Long followingCount, Long followerCount,
                                           Long participatedMeetingsCount, Long badgesCount,
                                           Double averageRating) {
        return UserProfileResponse.builder()
                .userId(user.getUserId())
                .username(user.getUsername())
                .email(user.getEmail())
                .phone(user.getPhone())
                .address(user.getAddress())
                .profileImageUrl(user.getProfileImageUrl())
                .followingCount(followingCount)
                .followerCount(followerCount)
                .participatedMeetingsCount(participatedMeetingsCount)
                .badgesCount(badgesCount)
                .averageRating(averageRating)
                .build();
    }
}