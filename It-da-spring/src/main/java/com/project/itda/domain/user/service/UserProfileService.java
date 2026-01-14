package com.project.itda.domain.user.service;

import com.project.itda.domain.user.dto.response.FollowUserResponse;
import com.project.itda.domain.user.dto.response.UserProfileResponse;
import com.project.itda.domain.user.entity.User;
import com.project.itda.domain.user.entity.UserFollow;
import com.project.itda.domain.user.repository.UserFollowRepository;
import com.project.itda.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserProfileService {

    private final UserRepository userRepository;
    private final UserFollowRepository userFollowRepository;

    public UserProfileResponse getUserProfile(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다"));

        Long followingCount = userFollowRepository.countByFollower(user);
        Long followerCount = userFollowRepository.countByFollowing(user);

        Long participatedMeetingsCount = 0L;
        Long badgesCount = 0L;
        Double averageRating = 0.0;

        log.info("사용자 프로필 조회: userId={}", userId);

        return UserProfileResponse.from(user, followingCount, followerCount,
                participatedMeetingsCount, badgesCount, averageRating);
    }

    @Transactional
    public void followUser(Long followerId, Long followingId) {
        if (followerId.equals(followingId)) {
            throw new IllegalArgumentException("자기 자신을 팔로우할 수 없습니다");
        }

        User follower = userRepository.findById(followerId)
                .orElseThrow(() -> new IllegalArgumentException("팔로워를 찾을 수 없습니다"));

        User following = userRepository.findById(followingId)
                .orElseThrow(() -> new IllegalArgumentException("팔로잉할 사용자를 찾을 수 없습니다"));

        if (userFollowRepository.existsByFollowerAndFollowing(follower, following)) {
            throw new IllegalArgumentException("이미 팔로우한 사용자입니다");
        }

        UserFollow userFollow = UserFollow.builder()
                .follower(follower)
                .following(following)
                .build();

        userFollowRepository.save(userFollow);
        log.info("팔로우 완료: follower={}, following={}", followerId, followingId);
    }

    @Transactional
    public void unfollowUser(Long followerId, Long followingId) {
        User follower = userRepository.findById(followerId)
                .orElseThrow(() -> new IllegalArgumentException("팔로워를 찾을 수 없습니다"));

        User following = userRepository.findById(followingId)
                .orElseThrow(() -> new IllegalArgumentException("팔로잉할 사용자를 찾을 수 없습니다"));

        UserFollow userFollow = userFollowRepository.findByFollowerAndFollowing(follower, following)
                .orElseThrow(() -> new IllegalArgumentException("팔로우 관계가 없습니다"));

        userFollowRepository.delete(userFollow);
        log.info("언팔로우 완료: follower={}, following={}", followerId, followingId);
    }

    public List<FollowUserResponse> getFollowingList(Long userId, Long currentUserId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다"));

        User currentUser = userRepository.findById(currentUserId)
                .orElseThrow(() -> new IllegalArgumentException("현재 사용자를 찾을 수 없습니다"));

        List<UserFollow> followingList = userFollowRepository.findByFollower(user);

        return followingList.stream()
                .map(uf -> {
                    User followingUser = uf.getFollowing();
                    boolean isFollowing = userFollowRepository.existsByFollowerAndFollowing(currentUser, followingUser);
                    return FollowUserResponse.builder()
                            .userId(followingUser.getUserId())
                            .username(followingUser.getUsername())
                            .email(followingUser.getEmail())
                            .isFollowing(isFollowing)
                            .build();
                })
                .collect(Collectors.toList());
    }

    public List<FollowUserResponse> getFollowerList(Long userId, Long currentUserId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다"));

        User currentUser = userRepository.findById(currentUserId)
                .orElseThrow(() -> new IllegalArgumentException("현재 사용자를 찾을 수 없습니다"));

        List<UserFollow> followerList = userFollowRepository.findByFollowing(user);

        return followerList.stream()
                .map(uf -> {
                    User followerUser = uf.getFollower();
                    boolean isFollowing = userFollowRepository.existsByFollowerAndFollowing(currentUser, followerUser);
                    return FollowUserResponse.builder()
                            .userId(followerUser.getUserId())
                            .username(followerUser.getUsername())
                            .email(followerUser.getEmail())
                            .isFollowing(isFollowing)
                            .build();
                })
                .collect(Collectors.toList());
    }

    public boolean checkFollowStatus(Long followerId, Long followingId) {
        User follower = userRepository.findById(followerId)
                .orElseThrow(() -> new IllegalArgumentException("팔로워를 찾을 수 없습니다"));

        User following = userRepository.findById(followingId)
                .orElseThrow(() -> new IllegalArgumentException("팔로잉할 사용자를 찾을 수 없습니다"));

        return userFollowRepository.existsByFollowerAndFollowing(follower, following);
    }
}