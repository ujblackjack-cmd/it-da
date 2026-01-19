package com.project.itda.domain.user.controller;

import com.project.itda.domain.user.dto.response.ProfileLookupResponse;
import com.project.itda.domain.user.dto.response.UserCandidateResponse;
import com.project.itda.domain.user.dto.response.UserProfileResponse;
import com.project.itda.domain.user.entity.User;
import com.project.itda.domain.user.repository.UserRepository;
import com.project.itda.domain.user.service.UserFollowService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/profile")
@RequiredArgsConstructor
public class ProfileController {

    private final UserRepository userRepository;
    private final UserFollowService userFollowService;

    /**
     * 이메일 prefix로 프로필 조회
     */
    @GetMapping("/lookup/{emailPrefix}")
    public ResponseEntity<ProfileLookupResponse> getProfileByEmailPrefix(
            @PathVariable String emailPrefix,
            @RequestParam(required = false) Long currentUserId) {

        List<User> users = userRepository.findAllByEmailPrefix(emailPrefix);

        if (users.isEmpty()) {
            throw new IllegalArgumentException("사용자를 찾을 수 없습니다");
        }

        // ✅ 2명 이상이면 후보 리스트 반환
        if (users.size() > 1) {
            List<UserCandidateResponse> candidates = users.stream()
                    .limit(20)
                    .map(u -> UserCandidateResponse.builder()
                            .userId(u.getUserId())
                            .username(u.getUsername())
                            .email(u.getEmail())
                            .profileImageUrl(u.getProfileImageUrl())
                            .isPublic(u.getIsPublic())
                            .build())
                    .toList();

            return ResponseEntity.ok(ProfileLookupResponse.builder()
                    .type("multiple")
                    .candidates(candidates)
                    .build());
        }

        // ✅ 1명일 때만 기존 로직 그대로 프로필 반환
        User user = users.get(0);

        boolean isMyProfile = currentUserId != null && currentUserId.equals(user.getUserId());
        boolean isFollowing = false;
        String followRequestStatus = "none";

        if (currentUserId != null && !isMyProfile) {
            isFollowing = userFollowService.isFollowing(currentUserId, user.getUserId());
            followRequestStatus = userFollowService.getFollowRequestStatus(currentUserId, user.getUserId());
        }

        int followerCount = userFollowService.getFollowerCount(user.getUserId());
        int followingCount = userFollowService.getFollowingCount(user.getUserId());

        boolean canViewFullProfile = user.getIsPublic() || isFollowing || isMyProfile;

        UserProfileResponse profile = UserProfileResponse.builder()
                .userId(user.getUserId())
                .username(user.getUsername())
                .email(user.getEmail())
                .profileImageUrl(user.getProfileImageUrl())
                .bio(user.getBio())
                .mbti(user.getMbti())
                .address(user.getAddress())
                .interests(user.getInterests())
                .isPublic(user.getIsPublic())
                .isMyProfile(isMyProfile)
                .isFollowing(isFollowing)
                .followRequestStatus(followRequestStatus)
                .canViewFullProfile(canViewFullProfile)
                .followerCount(followerCount)
                .followingCount(followingCount)
                .build();

        return ResponseEntity.ok(ProfileLookupResponse.builder()
                .type("single")
                .profile(profile)
                .build());
    }


    /**
     * userId로 프로필 조회
     */
    @GetMapping("/id/{userId}")
    public ResponseEntity<UserProfileResponse> getProfileById(
            @PathVariable Long userId,
            @RequestParam(required = false) Long currentUserId) {

        log.info("🔍 프로필 조회 요청 (ID): userId={}, currentUserId={}", userId, currentUserId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다"));

        boolean isMyProfile = currentUserId != null && currentUserId.equals(user.getUserId());

        boolean isFollowing = false;
        String followRequestStatus = "none";

        if (currentUserId != null && !isMyProfile) {
            isFollowing = userFollowService.isFollowing(currentUserId, user.getUserId());
            // ✅ 팔로우 요청 상태 확인
            followRequestStatus = userFollowService.getFollowRequestStatus(currentUserId, user.getUserId());
        }

        int followerCount = userFollowService.getFollowerCount(user.getUserId());
        int followingCount = userFollowService.getFollowingCount(user.getUserId());

        String emailPrefix = user.getEmail().split("@")[0];

        // ✅ 프로필 볼 수 있는지 확인
        boolean canViewFullProfile = user.getIsPublic() || isFollowing || isMyProfile;

        UserProfileResponse response = UserProfileResponse.builder()
                .userId(user.getUserId())
                .username(user.getUsername())
                .email(user.getEmail())
                .emailPrefix(emailPrefix)
                .profileImageUrl(user.getProfileImageUrl())
                .bio(user.getBio())
                .mbti(user.getMbti())
                .address(user.getAddress())
                .interests(user.getInterests())
                .isPublic(user.getIsPublic())  // ✅ 추가
                .isMyProfile(isMyProfile)
                .isFollowing(isFollowing)
                .followRequestStatus(followRequestStatus)  // ✅ 추가
                .canViewFullProfile(canViewFullProfile)  // ✅ 추가
                .followerCount(followerCount)
                .followingCount(followingCount)
                .build();

        return ResponseEntity.ok(response);
    }
}