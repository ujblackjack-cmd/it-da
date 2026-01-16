package com.project.itda.domain.user.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FollowNotificationDto {

    private String type;           // FOLLOW, UNFOLLOW, FOLLOWING_UPDATE, UNFOLLOWING_UPDATE, PROFILE_UPDATE
    private Long fromUserId;       // 팔로우 한 사람
    private String fromUsername;   // 팔로우 한 사람 이름
    private String fromProfileImage; // 팔로우 한 사람 프로필 이미지
    private Long toUserId;         // 팔로우 받은 사람
    private int newFollowerCount;  // 새 팔로워 수 (또는 팔로잉 수)

    /**
     * 팔로우 알림 생성
     */
    public static FollowNotificationDto follow(Long fromUserId, String fromUsername,
                                               String fromProfileImage, Long toUserId, int newFollowerCount) {
        return FollowNotificationDto.builder()
                .type("FOLLOW")
                .fromUserId(fromUserId)
                .fromUsername(fromUsername)
                .fromProfileImage(fromProfileImage)
                .toUserId(toUserId)
                .newFollowerCount(newFollowerCount)
                .build();
    }

    /**
     * 언팔로우 알림 생성
     */
    public static FollowNotificationDto unfollow(Long fromUserId, String fromUsername,
                                                 String fromProfileImage, Long toUserId, int newFollowerCount) {
        return FollowNotificationDto.builder()
                .type("UNFOLLOW")
                .fromUserId(fromUserId)
                .fromUsername(fromUsername)
                .fromProfileImage(fromProfileImage)
                .toUserId(toUserId)
                .newFollowerCount(newFollowerCount)
                .build();
    }
}