package com.project.itda.domain.notification.controller;

import com.project.itda.domain.notification.dto.response.NotificationListResponse;
import com.project.itda.domain.notification.dto.response.NotificationResponse;
import com.project.itda.domain.notification.entity.Notification;
import com.project.itda.domain.notification.enums.NotificationType;
import com.project.itda.domain.notification.repository.NotificationRepository;
import com.project.itda.domain.notification.service.NotificationService;
import com.project.itda.domain.user.entity.User;
import com.project.itda.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * ✅ 알림 컨트롤러
 */
@Slf4j
@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;
    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    /**
     * ✅ 알림 목록 조회 (페이징)
     */
    @GetMapping
    public ResponseEntity<NotificationListResponse> getNotifications(
            @RequestParam Long userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        log.info("📋 알림 목록 조회: userId={}, page={}, size={}", userId, page, size);
        NotificationListResponse response = notificationService.getNotifications(userId, page, size);
        return ResponseEntity.ok(response);
    }

    /**
     * ✅ 전체 알림 목록 조회 (페이징 없이)
     */
    @GetMapping("/all")
    public ResponseEntity<NotificationListResponse> getAllNotifications(@RequestParam Long userId) {
        log.info("📋 전체 알림 목록 조회: userId={}", userId);
        NotificationListResponse response = notificationService.getAllNotifications(userId);
        return ResponseEntity.ok(response);
    }

    /**
     * ✅ 안읽은 알림 개수 조회
     */
    @GetMapping("/unread/count")
    public ResponseEntity<Map<String, Long>> getUnreadCount(@RequestParam Long userId) {
        log.info("🔢 안읽은 알림 개수 조회: userId={}", userId);
        long count = notificationService.getUnreadCount(userId);
        return ResponseEntity.ok(Map.of("unreadCount", count));
    }

    /**
     * ✅ 단일 알림 읽음 처리
     */
    @PatchMapping("/{id}/read")
    public ResponseEntity<Void> markAsRead(@PathVariable Long id) {
        log.info("✅ 알림 읽음 처리: id={}", id);
        notificationService.markAsRead(id);
        return ResponseEntity.ok().build();
    }

    /**
     * ✅ 전체 알림 읽음 처리
     */
    @PatchMapping("/read-all")
    public ResponseEntity<Void> markAllAsRead(@RequestParam Long userId) {
        log.info("✅ 전체 알림 읽음 처리: userId={}", userId);
        notificationService.markAllAsRead(userId);
        return ResponseEntity.ok().build();
    }

    /**
     * ✅ 단일 알림 삭제
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteNotification(@PathVariable Long id) {
        log.info("🗑️ 알림 삭제: id={}", id);
        notificationService.deleteNotification(id);
        return ResponseEntity.ok().build();
    }

    /**
     * ✅ 전체 알림 삭제
     */
    @DeleteMapping("/all")
    public ResponseEntity<Void> deleteAllNotifications(@RequestParam Long userId) {
        log.info("🗑️ 전체 알림 삭제: userId={}", userId);
        notificationService.deleteAllNotifications(userId);
        return ResponseEntity.ok().build();
    }

    // ==================== 테스트용 API ====================

    /**
     * 🧪 테스트용 알림 생성
     */
    @PostMapping("/test")
    public ResponseEntity<NotificationResponse> createTestNotification(
            @RequestParam Long userId,
            @RequestBody Map<String, Object> body
    ) {
        log.info("🧪 테스트 알림 생성: userId={}, body={}", userId, body);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        String type = (String) body.getOrDefault("notificationType", "SYSTEM");
        String title = (String) body.getOrDefault("title", "테스트 알림");
        String content = (String) body.getOrDefault("content", "테스트 알림 내용입니다.");
        String linkUrl = (String) body.getOrDefault("linkUrl", null);

        Long relatedId = null;
        if (body.get("relatedId") != null) {
            relatedId = ((Number) body.get("relatedId")).longValue();
        }

        Long senderId = null;
        if (body.get("senderId") != null) {
            senderId = ((Number) body.get("senderId")).longValue();
        }

        String senderName = (String) body.getOrDefault("senderName", null);
        String senderProfileImage = (String) body.getOrDefault("senderProfileImage", null);

        Notification notification = Notification.builder()
                .user(user)
                .notificationType(NotificationType.valueOf(type))
                .title(title)
                .content(content)
                .linkUrl(linkUrl)
                .relatedId(relatedId)
                .senderId(senderId)
                .senderName(senderName)
                .senderProfileImage(senderProfileImage)
                .build();

        notification = notificationRepository.save(notification);

        log.info("✅ 테스트 알림 생성 완료: id={}", notification.getNotificationId());

        return ResponseEntity.ok(NotificationResponse.from(notification));
    }

    /**
     * 🧪 테스트용 여러 알림 일괄 생성
     */
    @PostMapping("/test/bulk")
    public ResponseEntity<Map<String, Object>> createBulkTestNotifications(@RequestParam Long userId) {
        log.info("🧪 테스트 알림 일괄 생성: userId={}", userId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<Notification> notifications = List.of(
                createNotification(user, NotificationType.FOLLOW, "새 팔로워", "테스트유저님이 회원님을 팔로우했습니다.", "/profile/id/1", null, 1L, "테스트유저", null),
                createNotification(user, NotificationType.FOLLOW_REQUEST, "팔로우 요청", "테스트유저님이 팔로우를 요청했습니다.", null, null, 1L, "테스트유저", null),
                createNotification(user, NotificationType.MESSAGE, "새 메시지", "💬 안녕하세요! 모임 관련해서 문의드립니다.", "/chat/1", 1L, 1L, "테스트유저", null),
                createNotification(user, NotificationType.MEETING_JOIN, "모임 참가 신청", "테스트유저님이 '한강 피크닉' 모임에 참가를 신청했습니다.", "/meetings/1", 1L, 1L, "테스트유저", null),
                createNotification(user, NotificationType.MEETING_FOLLOW, "팔로우한 사람 모임 참가", "팔로우한 테스트유저님이 '한강 피크닉' 모임에 참가했습니다.", "/meetings/1", 1L, 1L, "테스트유저", null),
                createNotification(user, NotificationType.MEETING_REMINDER, "모임 리마인더", "📅 내일 '한강 피크닉' 모임이 있어요!", "/meetings/1", 1L, null, null, null),
                createNotification(user, NotificationType.REVIEW_REQUEST, "후기 요청", "✍️ '한강 피크닉' 모임은 어떠셨나요? 후기를 남겨주세요!", "/meetings/1/review", 1L, null, null, null),
                createNotification(user, NotificationType.BADGE, "배지 획득", "🏆 '열정러' 배지를 획득했어요!", "/mypage", null, null, null, null),
                createNotification(user, NotificationType.SYSTEM, "시스템 알림", "📢 IT-DA 서비스 업데이트 안내입니다.", null, null, null, null, null)
        );

        notificationRepository.saveAll(notifications);

        int count = notifications.size();
        log.info("✅ 테스트 알림 일괄 생성 완료: {}개", count);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "count", count,
                "message", "테스트 알림 " + count + "개가 생성되었습니다."
        ));
    }

    private Notification createNotification(
            User user,
            NotificationType type,
            String title,
            String content,
            String linkUrl,
            Long relatedId,
            Long senderId,
            String senderName,
            String senderProfileImage
    ) {
        return Notification.builder()
                .user(user)
                .notificationType(type)
                .title(title)
                .content(content)
                .linkUrl(linkUrl)
                .relatedId(relatedId)
                .senderId(senderId)
                .senderName(senderName)
                .senderProfileImage(senderProfileImage)
                .build();
    }
}