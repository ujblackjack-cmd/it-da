package com.project.itda.domain.user.service;

import com.project.itda.domain.notification.service.NotificationService;
import com.project.itda.domain.user.dto.FollowNotificationDto;
import com.project.itda.domain.user.entity.FollowRequest;
import com.project.itda.domain.user.dto.response.FollowUserResponse;
import com.project.itda.domain.user.entity.User;
import com.project.itda.domain.user.entity.UserFollow;
import com.project.itda.domain.user.repository.FollowRequestRepository;
import com.project.itda.domain.user.repository.UserFollowRepository;
import com.project.itda.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserFollowService {

    private final UserFollowRepository userFollowRepository;
    private final FollowRequestRepository followRequestRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final NotificationService notificationService;  // ✅ 추가

    /**
     * ✅ 팔로우하기 (공개 계정만)
     */
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

        // ✅ 비공개 계정이면 403 반환 (팔로우 요청 필요)
        if (!following.getIsPublic()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "비공개 계정입니다. 팔로우 요청을 보내세요.");
        }

        UserFollow userFollow = UserFollow.builder()
                .follower(follower)
                .following(following)
                .build();

        userFollowRepository.save(userFollow);
        log.info("✅ 팔로우 성공: {} -> {}", follower.getUserId(), following.getUserId());

        // ✅ 팔로우 알림 전송 (웹소켓)
        sendFollowNotification(follower, following, true);

        // ✅ 알림 DB 저장 + 웹소켓 푸시
        notificationService.notifyNewFollower(following, follower);
    }

    /**
     * ✅ 프로필 공개 설정 변경 시 웹소켓 알림
     */
    public void notifyProfileVisibilityChange(Long userId, boolean isPublic) {
        try {
            Map<String, Object> update = new HashMap<>();
            update.put("type", "PROFILE_VISIBILITY_UPDATE");
            update.put("userId", userId);
            update.put("isPublic", isPublic);

            messagingTemplate.convertAndSend("/topic/profile/" + userId, update);
            log.info("🔔 프로필 공개 설정 변경 알림: userId={}, isPublic={}", userId, isPublic);
        } catch (Exception e) {
            log.error("❌ 프로필 공개 설정 변경 알림 실패: {}", e.getMessage(), e);
        }
    }

    /**
     * ✅ 언팔로우하기
     */
    @Transactional
    public void unfollow(Long userId, Long targetUserId) {
        User follower = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다."));

        User following = userRepository.findById(targetUserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "언팔로우할 사용자를 찾을 수 없습니다."));

        UserFollow userFollow = userFollowRepository.findByFollowerAndFollowing(follower, following)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "팔로우 관계가 없습니다."));

        userFollowRepository.delete(userFollow);
        log.info("✅ 언팔로우 성공: {} -> {}", follower.getUserId(), following.getUserId());

        // ✅ 언팔로우 알림 전송 (숫자 업데이트)
        sendFollowNotification(follower, following, false);
    }

    /**
     * ✅ 팔로우 요청 취소
     */
    @Transactional
    public void cancelFollowRequest(Long userId, Long targetUserId) {
        User requester = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다."));

        User target = userRepository.findById(targetUserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "대상 사용자를 찾을 수 없습니다."));

        FollowRequest request = followRequestRepository.findByRequesterAndTarget(requester, target)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "팔로우 요청이 없습니다."));

        followRequestRepository.delete(request);
        log.info("✅ 팔로우 요청 취소: {} -> {}", requester.getUserId(), target.getUserId());
    }

    /**
     * ✅ 팔로우 요청 보내기 (비공개 계정용)
     */
    @Transactional
    public void sendFollowRequest(Long userId, Long targetUserId) {
        log.info("🚀 sendFollowRequest 호출됨: {} -> {}", userId, targetUserId);

        if (userId.equals(targetUserId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "자기 자신에게 요청할 수 없습니다.");
        }

        User requester = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다."));

        User target = userRepository.findById(targetUserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "대상 사용자를 찾을 수 없습니다."));

        if (userFollowRepository.existsByFollowerAndFollowing(requester, target)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 팔로우 중입니다.");
        }

        if (followRequestRepository.existsByRequesterAndTarget(requester, target)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 팔로우 요청을 보냈습니다.");
        }

        FollowRequest request = FollowRequest.builder()
                .requester(requester)
                .target(target)
                .status(FollowRequest.RequestStatus.PENDING)
                .build();

        followRequestRepository.save(request);
        log.info("✅ 팔로우 요청 전송: {} -> {}", requester.getUserId(), target.getUserId());

        // ✅ 팔로우 요청 알림 보내기 (웹소켓)
        sendFollowRequestNotification(requester, target);

        // ✅ 알림 DB 저장 + 웹소켓 푸시
        notificationService.notifyFollowRequest(target, requester);
    }

    /**
     * ✅ 팔로우 요청 알림 (비공개 계정에게 알림)
     */
    private void sendFollowRequestNotification(User requester, User target) {
        try {
            FollowNotificationDto notification = FollowNotificationDto.builder()
                    .type("FOLLOW_REQUEST")
                    .fromUserId(requester.getUserId())
                    .fromUsername(requester.getUsername())
                    .fromProfileImage(requester.getProfileImageUrl())
                    .toUserId(target.getUserId())
                    .build();

            messagingTemplate.convertAndSend("/topic/follow/" + target.getUserId(), notification);
            messagingTemplate.convertAndSend("/topic/profile/" + target.getUserId(), notification);

            log.info("🔔 팔로우 요청 알림 전송 완료: {} -> {}", requester.getUsername(), target.getUsername());
        } catch (Exception e) {
            log.error("❌ 팔로우 요청 알림 전송 실패: {}", e.getMessage(), e);
        }
    }

    /**
     * ✅ 팔로우 요청 수락
     */
    @Transactional
    public void acceptFollowRequest(Long userId, Long requesterId) {
        User target = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다."));

        User requester = userRepository.findById(requesterId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "요청자를 찾을 수 없습니다."));

        FollowRequest request = followRequestRepository.findByRequesterAndTarget(requester, target)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "팔로우 요청이 없습니다."));

        followRequestRepository.delete(request);

        UserFollow userFollow = UserFollow.builder()
                .follower(requester)
                .following(target)
                .build();
        userFollowRepository.save(userFollow);

        log.info("✅ 팔로우 요청 수락: {} -> {}", requester.getUserId(), target.getUserId());

        // ✅ 팔로우 완료 알림 전송
        sendFollowNotification(requester, target, true);

        // ✅ 요청자에게도 수락 알림 전송
        sendFollowAcceptedNotification(requester, target);

        // ✅ 알림 DB 저장 + 웹소켓 푸시
        notificationService.notifyFollowAccepted(requester, target);
    }

    /**
     * ✅ 팔로우 요청 수락 알림 (요청자에게)
     */
    private void sendFollowAcceptedNotification(User requester, User target) {
        try {
            FollowNotificationDto notification = FollowNotificationDto.builder()
                    .type("FOLLOW_ACCEPTED")
                    .fromUserId(target.getUserId())
                    .fromUsername(target.getUsername())
                    .fromProfileImage(target.getProfileImageUrl())
                    .toUserId(requester.getUserId())
                    .build();

            messagingTemplate.convertAndSend("/topic/follow/" + requester.getUserId(), notification);
            messagingTemplate.convertAndSend("/topic/profile/" + requester.getUserId(), notification);

            log.info("🔔 팔로우 수락 알림: {} -> {}", target.getUsername(), requester.getUserId());
        } catch (Exception e) {
            log.error("❌ 팔로우 수락 알림 전송 실패: {}", e.getMessage(), e);
        }
    }

    /**
     * ✅ 팔로우 요청 거절
     */
    @Transactional
    public void rejectFollowRequest(Long userId, Long requesterId) {
        User target = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다."));

        User requester = userRepository.findById(requesterId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "요청자를 찾을 수 없습니다."));

        FollowRequest request = followRequestRepository.findByRequesterAndTarget(requester, target)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "팔로우 요청이 없습니다."));

        followRequestRepository.delete(request);
        log.info("✅ 팔로우 요청 거절: {} -> {}", requester.getUserId(), target.getUserId());

        sendFollowRejectedNotification(requester, target);
    }

    /**
     * ✅ 팔로우 요청 거절 알림 (요청자에게)
     */
    private void sendFollowRejectedNotification(User requester, User target) {
        try {
            Map<String, Object> notification = new HashMap<>();
            notification.put("type", "FOLLOW_REJECTED");
            notification.put("fromUserId", target.getUserId());
            notification.put("fromUsername", target.getUsername());
            notification.put("toUserId", requester.getUserId());

            messagingTemplate.convertAndSend("/topic/follow/" + requester.getUserId(), notification);
            log.info("🔔 팔로우 거절 알림: {} -> {}", target.getUsername(), requester.getUserId());
        } catch (Exception e) {
            log.error("❌ 팔로우 거절 알림 전송 실패: {}", e.getMessage(), e);
        }
    }

    /**
     * ✅ 팔로우 요청 상태 확인
     */
    public String getFollowRequestStatus(Long userId, Long targetUserId) {
        User user = userRepository.findById(userId).orElse(null);
        User target = userRepository.findById(targetUserId).orElse(null);

        if (user == null || target == null) return "none";

        if (userFollowRepository.existsByFollowerAndFollowing(user, target)) {
            return "following";
        }

        if (followRequestRepository.existsByRequesterAndTarget(user, target)) {
            return "pending";
        }

        return "none";
    }

    /**
     * ✅ 받은 팔로우 요청 목록
     */
    public List<FollowUserResponse> getFollowRequests(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다."));

        return followRequestRepository.findByTargetAndStatus(user, FollowRequest.RequestStatus.PENDING)
                .stream()
                .map(request -> FollowUserResponse.from(request.getRequester(), false))
                .collect(Collectors.toList());
    }

    /**
     * ✅ 팔로우/언팔로우 알림 (실시간 숫자 업데이트)
     */
    private void sendFollowNotification(User follower, User following, boolean isFollow) {
        try {
            int followingFollowerCount = (int) userFollowRepository.countByFollowing(following);
            int followerFollowingCount = (int) userFollowRepository.countByFollower(follower);

            if (isFollow) {
                FollowNotificationDto notification = FollowNotificationDto.follow(
                        follower.getUserId(),
                        follower.getUsername(),
                        follower.getProfileImageUrl(),
                        following.getUserId(),
                        followingFollowerCount
                );
                messagingTemplate.convertAndSend("/topic/follow/" + following.getUserId(), notification);
                log.info("🔔 팔로우 알림: {} -> {}", follower.getUsername(), following.getUserId());
            }

            FollowNotificationDto followingProfileUpdate = FollowNotificationDto.builder()
                    .type("PROFILE_UPDATE")
                    .fromUserId(follower.getUserId())
                    .fromUsername(follower.getUsername())
                    .toUserId(following.getUserId())
                    .newFollowerCount(followingFollowerCount)
                    .build();
            messagingTemplate.convertAndSend("/topic/profile/" + following.getUserId(), followingProfileUpdate);

            FollowNotificationDto followerProfileUpdate = FollowNotificationDto.builder()
                    .type("PROFILE_FOLLOWING_UPDATE")
                    .fromUserId(following.getUserId())
                    .toUserId(follower.getUserId())
                    .newFollowerCount(followerFollowingCount)
                    .build();
            messagingTemplate.convertAndSend("/topic/profile/" + follower.getUserId(), followerProfileUpdate);

        } catch (Exception e) {
            log.error("❌ 웹소켓 알림 전송 실패: {}", e.getMessage(), e);
        }
    }

    /**
     * ✅ 팔로잉 목록 조회
     */
    public List<FollowUserResponse> getFollowingList(Long userId, Long currentUserId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다."));

        User currentUser = currentUserId != null
                ? userRepository.findById(currentUserId).orElse(null)
                : null;

        return userFollowRepository.findByFollower(user).stream()
                .map(follow -> {
                    User targetUser = follow.getFollowing();
                    boolean isFollowingTarget = false;

                    if (currentUser != null && !currentUser.getUserId().equals(targetUser.getUserId())) {
                        isFollowingTarget = userFollowRepository.existsByFollowerAndFollowing(currentUser, targetUser);
                    }

                    return FollowUserResponse.from(targetUser, isFollowingTarget);
                })
                .collect(Collectors.toList());
    }

    /**
     * ✅ 팔로워 목록 조회
     */
    public List<FollowUserResponse> getFollowerList(Long userId, Long currentUserId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다."));

        User currentUser = currentUserId != null
                ? userRepository.findById(currentUserId).orElse(null)
                : null;

        return userFollowRepository.findByFollowing(user).stream()
                .map(follow -> {
                    User targetUser = follow.getFollower();
                    boolean isFollowingTarget = false;

                    if (currentUser != null && !currentUser.getUserId().equals(targetUser.getUserId())) {
                        isFollowingTarget = userFollowRepository.existsByFollowerAndFollowing(currentUser, targetUser);
                    }

                    return FollowUserResponse.from(targetUser, isFollowingTarget);
                })
                .collect(Collectors.toList());
    }

    public boolean isFollowing(Long userId, Long targetUserId) {
        User follower = userRepository.findById(userId).orElse(null);
        User following = userRepository.findById(targetUserId).orElse(null);
        if (follower == null || following == null) return false;
        return userFollowRepository.existsByFollowerAndFollowing(follower, following);
    }

    public int getFollowingCount(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다."));
        return (int) userFollowRepository.countByFollower(user);
    }

    public int getFollowerCount(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다."));
        return (int) userFollowRepository.countByFollowing(user);
    }

    public void notifyProfileUpdate(Long userId) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) return;

        Map<String, Object> update = new HashMap<>();
        update.put("type", "PROFILE_INFO_UPDATE");
        update.put("userId", user.getUserId());
        update.put("username", user.getUsername());
        update.put("profileImageUrl", user.getProfileImageUrl());
        update.put("bio", user.getBio());
        update.put("mbti", user.getMbti());
        update.put("address", user.getAddress());
        update.put("isPublic", user.getIsPublic());

        messagingTemplate.convertAndSend("/topic/profile/" + userId, update);
        messagingTemplate.convertAndSend("/topic/profile/updates", update);
        log.info("📊 프로필 정보 업데이트 알림: userId={}", userId);
    }
}