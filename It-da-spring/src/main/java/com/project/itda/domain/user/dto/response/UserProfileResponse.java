package com.project.itda.domain.user.dto.response;

import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserProfileResponse {
    private Long userId;
    private String username;
    private String email;
    private String emailPrefix;
    private String profileImageUrl;
    private String bio;
    private String mbti;
    private String address;
    private String interests;

    private Boolean isPublic;  // ✅ 추가
    private boolean isMyProfile;
    private boolean isFollowing;
    private String followRequestStatus;  // ✅ 추가: "none", "pending", "following"
    private boolean canViewFullProfile;  // ✅ 추가

    private int followerCount;
    private int followingCount;
}