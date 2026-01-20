package com.project.itda.domain.notification.service;

import com.project.itda.domain.notification.dto.response.NotificationListResponse;
import com.project.itda.domain.notification.dto.response.NotificationResponse;
import com.project.itda.domain.notification.entity.Notification;
import com.project.itda.domain.notification.enums.NotificationType;
import com.project.itda.domain.notification.repository.NotificationRepository;
import com.project.itda.domain.user.entity.User;
import com.project.itda.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final PushNotificationService pushNotificationService;

    // ========================================
    // 알림 조회 API
    // ========================================

    /**
     * 사용자의 알림 목록 조회 (페이징)
     */
    public NotificationListResponse getNotifications(Long userId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<Notification> notificationPage = notificationRepository.findByUser_UserIdOrderBySentAtDesc(userId, pageable);

        List<NotificationResponse> responses = notificationPage.getContent().stream()
                .map(NotificationResponse::from)
                .collect(Collectors.toList());

        long unreadCount = notificationRepository.countByUser_UserIdAndIsReadFalse(userId);

        return NotificationListResponse.of(
                responses,
                unreadCount,
                page,
                size,
                notificationPage.hasNext()
        );
    }

    /**
     * 사용자의 모든 알림 목록 조회
     */
    public NotificationListResponse getAllNotifications(Long userId) {
        List<Notification> notifications = notificationRepository.findByUser_UserIdOrderBySentAtDesc(userId);

        List<NotificationResponse> responses = notifications.stream()
                .map(NotificationResponse::from)
                .collect(Collectors.toList());

        long unreadCount = notificationRepository.countByUser_UserIdAndIsReadFalse(userId);

        return NotificationListResponse.of(responses, unreadCount);
    }

    /**
     * 읽지 않은 알림 개수 조회
     */
    public long getUnreadCount(Long userId) {
        return notificationRepository.countByUser_UserIdAndIsReadFalse(userId);
    }

    // ========================================
    // 알림 상태 변경 API
    // ========================================

    /**
     * 단일 알림 읽음 처리
     */
    @Transactional
    public void markAsRead(Long notificationId) {
        notificationRepository.markAsRead(notificationId);
        log.info("✅ 알림 읽음 처리: notificationId={}", notificationId);
    }

    /**
     * 모든 알림 읽음 처리
     */
    @Transactional
    public int markAllAsRead(Long userId) {
        int count = notificationRepository.markAllAsRead(userId);
        log.info("✅ 모든 알림 읽음 처리: userId={}, count={}", userId, count);
        return count;
    }

    /**
     * 알림 삭제
     */
    @Transactional
    public void deleteNotification(Long notificationId) {
        notificationRepository.deleteById(notificationId);
        log.info("🗑️ 알림 삭제: notificationId={}", notificationId);
    }

    /**
     * 모든 알림 삭제
     */
    @Transactional
    public void deleteAllNotifications(Long userId) {
        notificationRepository.deleteAllByUserId(userId);
        log.info("🗑️ 모든 알림 삭제: userId={}", userId);
    }

    // ========================================
    // 알림 생성 메서드들
    // ========================================

    /**
     * 기본 알림 생성 (내부용)
     */
    @Transactional
    public Notification createNotification(
            User receiver,
            NotificationType type,
            String title,
            String content,
            String linkUrl,
            Long relatedId,
            Long senderId,
            String senderName,
            String senderProfileImage
    ) {
        Notification notification = Notification.builder()
                .user(receiver)
                .notificationType(type)
                .title(title)
                .content(content)
                .linkUrl(linkUrl)
                .relatedId(relatedId)
                .senderId(senderId)
                .senderName(senderName)
                .senderProfileImage(senderProfileImage)
                .build();

        notification = notificationRepository.save(notification);
        log.info("🔔 알림 생성: type={}, receiver={}, sender={}", type, receiver.getUserId(), senderId);

        // 웹소켓으로 실시간 푸시
        pushNotificationService.pushNotification(receiver.getUserId(), NotificationResponse.from(notification));

        return notification;
    }

    // ========================================
    // 팔로우 관련 알림
    // ========================================

    /**
     * 새 팔로워 알림
     */
    @Transactional
    public void notifyNewFollower(User receiver, User follower) {
        // 중복 알림 방지 (같은 사람이 다시 팔로우할 경우)
        if (isDuplicateNotification(receiver.getUserId(), NotificationType.FOLLOW, null, follower.getUserId())) {
            log.info("중복 알림 스킵: FOLLOW from {} to {}", follower.getUserId(), receiver.getUserId());
            return;
        }

        createNotification(
                receiver,
                NotificationType.FOLLOW,
                follower.getUsername() + "님이 회원님을 팔로우합니다",
                "👤 새로운 팔로워가 생겼습니다.",
                "/profile/id/" + follower.getUserId(),
                null,
                follower.getUserId(),
                follower.getUsername(),
                follower.getProfileImageUrl()
        );
    }

    /**
     * 팔로우 요청 알림 (비공개 계정)
     */
    @Transactional
    public void notifyFollowRequest(User receiver, User requester) {
        createNotification(
                receiver,
                NotificationType.FOLLOW_REQUEST,
                requester.getUsername() + "님이 팔로우를 요청했습니다",
                "🔔 팔로우 요청을 수락하거나 거절해주세요.",
                "/profile/id/" + requester.getUserId(),
                null,
                requester.getUserId(),
                requester.getUsername(),
                requester.getProfileImageUrl()
        );
    }

    /**
     * 팔로우 요청 수락 알림
     */
    @Transactional
    public void notifyFollowAccepted(User receiver, User accepter) {
        createNotification(
                receiver,
                NotificationType.FOLLOW_ACCEPT,
                accepter.getUsername() + "님이 팔로우 요청을 수락했습니다",
                "✅ 이제 " + accepter.getUsername() + "님의 활동을 볼 수 있습니다.",
                "/profile/id/" + accepter.getUserId(),
                null,
                accepter.getUserId(),
                accepter.getUsername(),
                accepter.getProfileImageUrl()
        );
    }

    // ========================================
    // 메시지 관련 알림
    // ========================================

    /**
     * 새 메시지 알림
     */
    @Transactional
    public void notifyNewMessage(User receiver, User sender, Long roomId, String messagePreview) {
        // 메시지 내용 미리보기 (30자 제한)
        String preview = messagePreview.length() > 30
                ? messagePreview.substring(0, 30) + "..."
                : messagePreview;

        createNotification(
                receiver,
                NotificationType.MESSAGE,
                sender.getUsername() + "님의 새 메시지",
                "💬 " + preview,
                "/user-chat/" + roomId,
                roomId,
                sender.getUserId(),
                sender.getUsername(),
                sender.getProfileImageUrl()
        );
    }

    // ========================================
    // 모임 관련 알림
    // ========================================

    /**
     * 내 모임에 누군가 참가 알림 (모임장에게)
     */
    @Transactional
    public void notifyMeetingJoin(User meetingHost, User participant, Long meetingId, String meetingTitle) {
        createNotification(
                meetingHost,
                NotificationType.MEETING_JOIN,
                participant.getUsername() + "님이 모임에 참가했습니다",
                "📅 " + meetingTitle + " 모임에 새로운 멤버가 참가했습니다.",
                "/meeting/" + meetingId,
                meetingId,
                participant.getUserId(),
                participant.getUsername(),
                participant.getProfileImageUrl()
        );
    }

    /**
     * 팔로우한 사람이 모임에 참가했을 때 알림
     */
    @Transactional
    public void notifyFollowerMeetingJoin(User receiver, User followedUser, Long meetingId, String meetingTitle) {
        createNotification(
                receiver,
                NotificationType.MEETING_FOLLOW,
                followedUser.getUsername() + "님이 새 모임에 참가했습니다",
                "💡 " + meetingTitle + " 모임에 참가했습니다.",
                "/meeting/" + meetingId,
                meetingId,
                followedUser.getUserId(),
                followedUser.getUsername(),
                followedUser.getProfileImageUrl()
        );
    }

    /**
     * 모임 리마인더 알림 (D-1, D-day)
     */
    @Transactional
    public void notifyMeetingReminder(User receiver, Long meetingId, String meetingTitle, String reminderType) {
        String title;
        String content;

        if ("D-1".equals(reminderType)) {
            title = "내일 '" + meetingTitle + "' 모임이 있습니다!";
            content = "📅 내일 모임에 참여하는 것을 잊지 마세요!";
        } else if ("D-day".equals(reminderType)) {
            title = "오늘 '" + meetingTitle + "' 모임입니다!";
            content = "🎉 오늘 모임을 즐겨주세요!";
        } else {
            title = "'" + meetingTitle + "' 모임 알림";
            content = "📅 모임 일정을 확인해주세요.";
        }

        createNotification(
                receiver,
                NotificationType.MEETING_REMINDER,
                title,
                content,
                "/meeting/" + meetingId,
                meetingId,
                null,
                null,
                null
        );
    }

    // ========================================
    // 후기 관련 알림
    // ========================================

    /**
     * 후기 작성 요청 알림
     */
    @Transactional
    public void notifyReviewRequest(User receiver, Long meetingId, String meetingTitle) {
        createNotification(
                receiver,
                NotificationType.REVIEW_REQUEST,
                "'" + meetingTitle + "' 모임은 어떠셨나요?",
                "⭐ 후기를 작성해주세요!",
                "/meeting/" + meetingId + "/review",
                meetingId,
                null,
                null,
                null
        );
    }

    // ========================================
    // 배지/시스템 관련 알림
    // ========================================

    /**
     * 배지 획득 알림
     */
    @Transactional
    public void notifyBadgeEarned(User receiver, String badgeName, String badgeDescription) {
        createNotification(
                receiver,
                NotificationType.BADGE,
                "🏆 " + badgeName + " 배지를 획득했어요!",
                "🔥 " + badgeDescription,
                "/mypage",
                null,
                null,
                null,
                null
        );
    }

    /**
     * 시스템 공지 알림
     */
    @Transactional
    public void notifySystem(User receiver, String title, String content, String linkUrl) {
        createNotification(
                receiver,
                NotificationType.SYSTEM,
                title,
                content,
                linkUrl,
                null,
                null,
                null,
                null
        );
    }

    // ========================================
    // 유틸리티 메서드
    // ========================================

    /**
     * 중복 알림 체크
     */
    private boolean isDuplicateNotification(Long userId, NotificationType type, Long relatedId, Long senderId) {
        return notificationRepository.existsByUser_UserIdAndNotificationTypeAndRelatedIdAndSenderId(
                userId, type, relatedId, senderId
        );
    }

    /**
     * 오래된 알림 삭제 (30일 이상)
     */
    @Transactional
    public int cleanupOldNotifications() {
        LocalDateTime thirtyDaysAgo = LocalDateTime.now().minusDays(30);
        int deleted = notificationRepository.deleteOldNotifications(thirtyDaysAgo);
        log.info("🗑️ 오래된 알림 삭제: {}개", deleted);
        return deleted;
    }
}