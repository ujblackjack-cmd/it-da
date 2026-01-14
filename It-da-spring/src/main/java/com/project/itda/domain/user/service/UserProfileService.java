package com.project.itda.domain.user.service;

import com.project.itda.domain.user.dto.response.FollowResponse;
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
    private final UserFollowRepository userFollowRepository; // ✅ 이름 수정

    /**
     * 사용자 프로필 조회 (통계 포함)
     */
    public UserProfileResponse getUserProfile(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다"));

        // 통계 계산
        Long followingCount = userFollowRepository.countByFollower(user);
        Long followerCount = userFollowRepository.countByFollowing(user);

        // TODO: 실제로는 Meeting, Badge, Review 엔티티에서 조회
        Long participatedMeetingsCount = 0L;
        Long badgesCount = 0L;
        Double averageRating = 0.0;

        log.info("사용자 프로필 조회: userId={}", userId);

        return UserProfileResponse.from(user, followingCount, followerCount,
                participatedMeetingsCount, badgesCount, averageRating);
    }

    /**
     * 팔로우하기
     */
    @Transactional
    public void followUser(Long followerId, Long followingId) {
        if (followerId.equals(followingId)) {
            throw new IllegalArgumentException("자기 자신을 팔로우할 수 없습니다");
        }

        User follower = userRepository.findById(followerId)
                .orElseThrow(() -> new IllegalArgumentException("팔로워를 찾을 수 없습니다"));

        User following = userRepository.findById(followingId)
                .orElseThrow(() -> new IllegalArgumentException("팔로잉할 사용자를 찾을 수 없습니다"));

        // 이미 팔로우 중인지 확인
        if (userFollowRepository.existsByFollowerAndFollowing(follower, following)) {
            throw new IllegalArgumentException("이미 팔로우한 사용자입니다");
        }

        UserFollow userFollow = UserFollow.builder()
                .follower(follower)
                .following(following)
                .build();

        userFollowRepository.save(userFollow); // ✅ 수정
        log.info("팔로우 완료: follower={}, following={}", followerId, followingId);
    }

    /**
     * 언팔로우하기
     */
    @Transactional
    public void unfollowUser(Long followerId, Long followingId) {
        User follower = userRepository.findById(followerId)
                .orElseThrow(() -> new IllegalArgumentException("팔로워를 찾을 수 없습니다"));

        User following = userRepository.findById(followingId)
                .orElseThrow(() -> new IllegalArgumentException("팔로잉할 사용자를 찾을 수 없습니다"));

        userFollowRepository.deleteByFollowerAndFollowing(follower, following);
        log.info("언팔로우 완료: follower={}, following={}", followerId, followingId);
    }

    /**
     * 팔로잉 목록 조회
     */
    public List<FollowResponse> getFollowingList(Long userId, Long currentUserId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다"));

        User currentUser = userRepository.findById(currentUserId)
                .orElseThrow(() -> new IllegalArgumentException("현재 사용자를 찾을 수 없습니다"));

        List<User> followingUsers = userFollowRepository.findAllFollowingsByUser(user); // ✅ 메서드 이름 수정

        return followingUsers.stream()
                .map(followingUser -> {
                    boolean isFollowing = userFollowRepository.existsByFollowerAndFollowing(currentUser, followingUser);
                    return FollowResponse.from(followingUser, isFollowing);
                })
                .collect(Collectors.toList());
    }

    /**
     * 팔로워 목록 조회
     */
    public List<FollowResponse> getFollowerList(Long userId, Long currentUserId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다"));

        User currentUser = userRepository.findById(currentUserId)
                .orElseThrow(() -> new IllegalArgumentException("현재 사용자를 찾을 수 없습니다"));

        List<User> followerUsers = userFollowRepository.findAllFollowersByUser(user); // ✅ 메서드 이름 수정

        return followerUsers.stream()
                .map(followerUser -> {
                    boolean isFollowing = userFollowRepository.existsByFollowerAndFollowing(currentUser, followerUser);
                    return FollowResponse.from(followerUser, isFollowing);
                })
                .collect(Collectors.toList());
    }

    /**
     * 팔로우 상태 확인
     */
    public boolean checkFollowStatus(Long followerId, Long followingId) {
        User follower = userRepository.findById(followerId)
                .orElseThrow(() -> new IllegalArgumentException("팔로워를 찾을 수 없습니다"));

        User following = userRepository.findById(followingId)
                .orElseThrow(() -> new IllegalArgumentException("팔로잉할 사용자를 찾을 수 없습니다"));

        return userFollowRepository.existsByFollowerAndFollowing(follower, following);
    }
}