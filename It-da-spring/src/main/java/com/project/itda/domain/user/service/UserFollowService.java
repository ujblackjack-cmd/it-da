package com.project.itda.domain.user.service;

import com.project.itda.domain.user.dto.response.FollowUserResponse;
import com.project.itda.domain.user.entity.User;
import com.project.itda.domain.user.entity.UserFollow;
import com.project.itda.domain.user.repository.UserFollowRepository;
import com.project.itda.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service("userFollowService")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserFollowService {

    private final UserFollowRepository userFollowRepository;
    private final UserRepository userRepository;

    @Transactional
    public void follow(Long userId, Long targetUserId) {
        if (userId.equals(targetUserId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "자기 자신을 팔로우할 수 없습니다.");
        }

        User follower = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다."));

        User following = userRepository.findById(targetUserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "팔로우할 사용자를 찾을 수 없습니다."));

        if (userFollowRepository.existsByFollowerAndFollowing(follower, following)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 팔로우 중입니다.");
        }

        UserFollow userFollow = UserFollow.builder()
                .follower(follower)
                .following(following)
                .build();

        userFollowRepository.save(userFollow);
        log.info("팔로우 성공: {} -> {}", userId, targetUserId);
    }

    @Transactional
    public void unfollow(Long userId, Long targetUserId) {
        User follower = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다."));

        User following = userRepository.findById(targetUserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "언팔로우할 사용자를 찾을 수 없습니다."));

        UserFollow userFollow = userFollowRepository.findByFollowerAndFollowing(follower, following)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "팔로우 관계가 없습니다."));

        userFollowRepository.delete(userFollow);
        log.info("언팔로우 성공: {} -> {}", userId, targetUserId);
    }

    public List<FollowUserResponse> getFollowing(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다."));

        List<UserFollow> followList = userFollowRepository.findByFollower(user);

        return followList.stream()
                .map(f -> FollowUserResponse.builder()
                        .userId(f.getFollowing().getUserId())
                        .username(f.getFollowing().getUsername())
                        .email(f.getFollowing().getEmail())
                        .isFollowing(true)
                        .build())
                .collect(Collectors.toList());
    }

    public List<FollowUserResponse> getFollowers(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다."));

        List<UserFollow> followerList = userFollowRepository.findByFollowing(user);

        Set<Long> myFollowingIds = userFollowRepository.findByFollower(user).stream()
                .map(f -> f.getFollowing().getUserId())
                .collect(Collectors.toSet());

        return followerList.stream()
                .map(f -> FollowUserResponse.builder()
                        .userId(f.getFollower().getUserId())
                        .username(f.getFollower().getUsername())
                        .email(f.getFollower().getEmail())
                        .isFollowing(myFollowingIds.contains(f.getFollower().getUserId()))
                        .build())
                .collect(Collectors.toList());
    }

    public boolean isFollowing(Long userId, Long targetUserId) {
        User follower = userRepository.findById(userId).orElse(null);
        User following = userRepository.findById(targetUserId).orElse(null);

        if (follower == null || following == null) return false;

        return userFollowRepository.existsByFollowerAndFollowing(follower, following);
    }
}