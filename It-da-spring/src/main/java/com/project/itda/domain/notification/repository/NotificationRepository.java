package com.project.itda.domain.notification.repository;

import com.project.itda.domain.notification.entity.Notification;
import com.project.itda.domain.notification.enums.NotificationType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    // 사용자의 알림 목록 (최신순, 페이징)
    Page<Notification> findByUser_UserIdOrderBySentAtDesc(Long userId, Pageable pageable);

    // 사용자의 알림 목록 (최신순, 전체)
    List<Notification> findByUser_UserIdOrderBySentAtDesc(Long userId);

    // 읽지 않은 알림 목록
    List<Notification> findByUser_UserIdAndIsReadFalseOrderBySentAtDesc(Long userId);

    // 읽지 않은 알림 개수
    long countByUser_UserIdAndIsReadFalse(Long userId);

    // 특정 타입 알림 조회
    List<Notification> findByUser_UserIdAndNotificationTypeOrderBySentAtDesc(Long userId, NotificationType type);

    // 모든 알림 읽음 처리
    @Modifying
    @Query("UPDATE Notification n SET n.isRead = true, n.readAt = CURRENT_TIMESTAMP WHERE n.user.userId = :userId AND n.isRead = false")
    int markAllAsRead(@Param("userId") Long userId);

    // 특정 알림 읽음 처리
    @Modifying
    @Query("UPDATE Notification n SET n.isRead = true, n.readAt = CURRENT_TIMESTAMP WHERE n.notificationId = :notificationId")
    int markAsRead(@Param("notificationId") Long notificationId);

    // 오래된 알림 삭제 (30일 이상)
    @Modifying
    @Query("DELETE FROM Notification n WHERE n.sentAt < :date")
    int deleteOldNotifications(@Param("date") LocalDateTime date);

    // 사용자의 모든 알림 삭제
    @Modifying
    @Query("DELETE FROM Notification n WHERE n.user.userId = :userId")
    int deleteAllByUserId(@Param("userId") Long userId);

    // 특정 관련 ID로 알림 조회 (중복 알림 방지용)
    boolean existsByUser_UserIdAndNotificationTypeAndRelatedIdAndSenderId(
            Long userId, NotificationType type, Long relatedId, Long senderId);
}