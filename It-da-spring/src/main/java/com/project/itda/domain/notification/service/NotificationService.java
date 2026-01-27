package com.project.itda.domain.notification.service;

import com.project.itda.domain.notification.dto.response.NotificationListResponse;
import com.project.itda.domain.notification.dto.response.NotificationResponse;
import com.project.itda.domain.notification.entity.Notification;
import com.project.itda.domain.notification.enums.NotificationType;
import com.project.itda.domain.notification.repository.NotificationRepository;
import com.project.itda.domain.social.service.ChatRoomService;
import com.project.itda.domain.user.entity.User;
import com.project.itda.domain.user.entity.UserFollow;
import com.project.itda.domain.user.entity.UserSetting;
import com.project.itda.domain.user.repository.UserFollowRepository;
import com.project.itda.domain.user.repository.UserRepository;
import com.project.itda.domain.user.repository.UserSettingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Lazy;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessageSendingOperations;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
//@RequiredArgsConstructor
@Transactional(readOnly = true)
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final PushNotificationService pushNotificationService;
    private final UserFollowRepository userFollowRepository;      // ✅ 추가
    private final UserSettingRepository userSettingRepository;    // ✅ 추가
    private final SimpMessageSendingOperations messagingTemplate;

    private ChatRoomService chatRoomService;
    public NotificationService(
            NotificationRepository notificationRepository,
            UserRepository userRepository,
            PushNotificationService pushNotificationService,
            UserFollowRepository userFollowRepository,
            UserSettingRepository userSettingRepository,
            SimpMessageSendingOperations messagingTemplate,
            @Lazy ChatRoomService chatRoomService) { // 👈 여기에 @Lazy 추가
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
        this.pushNotificationService = pushNotificationService;
        this.userFollowRepository = userFollowRepository;
        this.userSettingRepository = userSettingRepository;
        this.messagingTemplate = messagingTemplate;
        this.chatRoomService = chatRoomService;
    }

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

        // 2. 웹소켓 실시간 전송 (여기가 에러 포인트!)
        try {
            // pushNotificationService가 null이 아닌지 체크
            if (pushNotificationService != null) {
                pushNotificationService.pushNotification(receiver.getUserId(), NotificationResponse.from(notification));
            } else {
                log.warn("⚠️ PushNotificationService가 주입되지 않았습니다.");
            }
        } catch (Exception e) {
            // 웹소켓 전송 실패해도 로직은 계속 진행되어야 함 (로그만 남김)
            log.error("❌ 실시간 알림 전송 실패 (DB 저장은 성공): {}", e.getMessage());
        }

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
                "/chat/" + roomId,
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
     * 모임 참가 승인 알림 (참여자에게)
     * ✅ 수정: pushParticipationApproved 호출로 변경 (실시간 카드 이동 지원)
     */

// 변경 후 (새 코드)
// ========================================

    /**
     * 모임 참가 승인 알림 (참여자에게)
     * ✅ 수정: pushParticipationApproved 호출로 변경 (실시간 카드 이동 지원)
     */
    @Transactional
    public void notifyParticipationApproved(User participant, Long meetingId, String meetingTitle, long participationCount) {
        createNotification(
                participant,
                NotificationType.MEETING_JOIN,
                "'" + meetingTitle + "' 모임 참가가 승인되었습니다!",
                "🎉 이제 모임에 참여할 수 있습니다.",
                "/meetings/" + meetingId,
                meetingId,
                null,
                null,
                null
        );

        // ✅ [수정] WebSocket으로 참여 승인 알림 전송 (PARTICIPATION_APPROVED 타입)
        // 프론트엔드에서 이 메시지를 받아 "진행 예정" → "진행 중인 모임"으로 카드 이동
        pushNotificationService.pushParticipationApproved(
                participant.getUserId(),
                meetingId,
                meetingTitle,
                participationCount
        );
    }
    /**
     * 내 모임에 누군가 참가 알림 (모임장에게)
     */
    @Transactional
    public void notifyMeetingJoin(User meetingHost, User participant, Long meetingId, String meetingTitle) {
        createNotification(
                meetingHost,
                NotificationType.MEETING_JOIN,
                participant.getUsername() + "님이 모임에 참가 신청했습니다",
                "📅 " + meetingTitle + " 모임에 새로운 참가 신청이 있습니다.",
                "/meetings/" + meetingId,
                meetingId,
                participant.getUserId(),
                participant.getUsername(),
                participant.getProfileImageUrl()
        );
    }

    /**
     * ✅ 팔로우한 사람이 모임에 참가했을 때 알림 (설정 체크 포함)
     */
    @Transactional
    public void notifyFollowerMeetingJoin(User receiver, User followedUser, Long meetingId, String meetingTitle) {
        // ✅ UserSetting에서 followMeetingNotification 설정 확인
        UserSetting setting = userSettingRepository.findByUser_UserId(receiver.getUserId()).orElse(null);
        if (setting != null && Boolean.FALSE.equals(setting.getFollowMeetingNotification())) {
            log.info("⏭️ 팔로우 모임 참가 알림 스킵 (설정 OFF): receiverId={}", receiver.getUserId());
            return;
        }

        createNotification(
                receiver,
                NotificationType.MEETING_FOLLOW,
                followedUser.getUsername() + "님이 새 모임에 참가했습니다",
                "💡 " + meetingTitle + " 모임에 참가했습니다.",
                "/meetings/" + meetingId,
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
                "/meetings/" + meetingId,
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
     * ✅ 모임 완료 알림 (후기 작성 요청) - 실시간!
     */
    @Transactional
    public void notifyMeetingCompleted(User participant, Long meetingId, String meetingTitle) {
        log.info("🏁 모임 완료 알림 전송: userId={}, meetingId={}", participant.getUserId(), meetingId);

        // DB에 알림 저장
        createNotification(
                participant,
                NotificationType.REVIEW_REQUEST,
                "'" + meetingTitle + "' 모임이 완료되었습니다!",
                "✍️ 후기를 작성해주세요.",
                "/my-meetings",
                meetingId,
                null,
                null,
                null
        );

        // ✅ WebSocket으로 실시간 푸시 (마이페이지 새로고침용)
        pushNotificationService.pushMeetingCompleted(participant.getUserId(), meetingId, meetingTitle);
    }

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

    /**
     * ✅ 팔로우한 사람이 후기를 작성했을 때 알림 (설정 체크 포함)
     * - 내가 팔로우한 사람이 후기를 작성하면, 나에게 알림!
     */
    @Transactional
    public void notifyFollowersAboutReview(User reviewWriter, Long reviewId, Long meetingId, String meetingTitle) {
        log.info("📝 팔로우 후기 작성 알림 시작: writerId={}, meetingTitle={}", reviewWriter.getUserId(), meetingTitle);

        // 이 사람(reviewWriter)을 팔로우하는 모든 사람 조회
        List<UserFollow> followers = userFollowRepository.findByFollowing(reviewWriter);

        int sentCount = 0;
        for (UserFollow follow : followers) {
            User follower = follow.getFollower();

            // 본인 제외
            if (follower.getUserId().equals(reviewWriter.getUserId())) {
                continue;
            }

            // ✅ UserSetting에서 followReviewNotification 설정 확인
            UserSetting setting = userSettingRepository.findByUser_UserId(follower.getUserId()).orElse(null);
            if (setting != null && Boolean.FALSE.equals(setting.getFollowReviewNotification())) {
                log.info("⏭️ 팔로우 후기 알림 스킵 (설정 OFF): followerId={}", follower.getUserId());
                continue;
            }

            // 알림 생성
            createNotification(
                    follower,
                    NotificationType.REVIEW,  // 또는 REVIEW_FOLLOW 타입 추가 가능
                    reviewWriter.getUsername() + "님이 후기를 작성했습니다",
                    "⭐ '" + meetingTitle + "' 모임에 대한 후기를 남겼습니다.",
                    "/meetings/" + meetingId,
                    reviewId,
                    reviewWriter.getUserId(),
                    reviewWriter.getUsername(),
                    reviewWriter.getProfileImageUrl()
            );
            sentCount++;
        }

        log.info("🔔 팔로우 후기 알림 전송 완료: {}명에게 전송", sentCount);
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
    @Transactional
    public void notifyChatInvite(User receiver, User inviter, Long roomId, String roomName) {
        createNotification(
                receiver,
                NotificationType.CHAT_INVITE,
                inviter.getUsername() + "님이 모임에 초대했습니다",
                "💌 '" + roomName + "' 모임 초대장이 도착했습니다. 수락하시겠습니까?",
                "/chat/" + roomId, // 알림 클릭 시 이동할 경로
                roomId,           // relatedId로 roomId 저장
                inviter.getUserId(),
                inviter.getUsername(),
                inviter.getProfileImageUrl()
        );
    }
    @Transactional
    public void processInviteAccept(Long notificationId) {
        // 1. 알림 정보 조회
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new IllegalArgumentException("알림을 찾을 수 없습니다: " + notificationId));

        // 2. 초대 알림인지 확인 (보안 체크)
        if (notification.getNotificationType() != NotificationType.CHAT_INVITE) {
            throw new IllegalStateException("초대 수락이 가능한 알림 타입이 아닙니다.");
        }

        // 3. 관련 데이터 추출
        Long roomId = notification.getRelatedId();
        User receiver = notification.getUser();

        log.info("📢 초대 수락 프로세스 시작: roomId={}, userId={}", roomId, receiver.getUserId());

        // 4. ChatRoomService를 통해 가입 처리 진행
        // (chatRoomService.joinChatRoomWithNotification 로직은 아래에서 따로 제안해 드립니다)
        chatRoomService.acceptInvitation(roomId, receiver.getUserId());

        // 5. 알림 읽음 처리 및 가입 완료 메시지로 업데이트 (선택 사항)
        notification.markAsRead();

        sendWelcomeMessage(roomId, receiver);

        log.info("✅ 초대 수락 및 가입 완료: roomId={}, userId={}", roomId, receiver.getUserId());
    }
    private void sendWelcomeMessage(Long roomId, User user) {
        try {
            // 프론트엔드 ChatMessage 인터페이스와 포맷을 맞춰야 합니다.
            Map<String, Object> message = new HashMap<>();
            message.put("type", "NOTICE"); // 시스템 공지 타입
            message.put("roomId", roomId);
            message.put("senderId", user.getUserId());
            message.put("senderNickname", user.getNickname() != null ? user.getNickname() : user.getUsername());
            message.put("content", user.getUsername() + "님이 초대를 수락하고 입장하셨습니다! 🎉");
            message.put("sentAt", LocalDateTime.now().toString());

            // /topic/room/{roomId} 를 구독 중인 모든 사용자에게 메시지 발송
            messagingTemplate.convertAndSend("/topic/room/" + roomId, message);
        } catch (Exception e) {
            log.error("입장 메시지 전송 실패: ", e);
        }
    }
}