package com.project.itda.domain.user.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_settings", uniqueConstraints = {
        @UniqueConstraint(name = "uk_user_setting", columnNames = {"user_id"})
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class UserSetting {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "setting_id")
    private Long settingId;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // 기본 알림 설정
    @Column(name = "notification_enabled")
    @Builder.Default
    private Boolean notificationEnabled = true;

    @Column(name = "push_notification")
    @Builder.Default
    private Boolean pushNotification = true;

    // 팔로우 관련 알림
    @Column(name = "follow_meeting_notification")
    @Builder.Default
    private Boolean followMeetingNotification = true;

    @Column(name = "follow_review_notification")
    @Builder.Default
    private Boolean followReviewNotification = true;

    @Column(name = "new_follower_notification")
    @Builder.Default
    private Boolean newFollowerNotification = true;

    // 모임 관련 알림
    @Column(name = "meeting_reminder_notification")
    @Builder.Default
    private Boolean meetingReminderNotification = true;

    @Column(name = "meeting_update_notification")
    @Builder.Default
    private Boolean meetingUpdateNotification = true;

    @Column(name = "meeting_chat_notification")
    @Builder.Default
    private Boolean meetingChatNotification = true;

    // 후기 관련 알림
    @Column(name = "review_request_notification")
    @Builder.Default
    private Boolean reviewRequestNotification = true;

    @Column(name = "review_reply_notification")
    @Builder.Default
    private Boolean reviewReplyNotification = true;

    // 시스템 알림
    @Column(name = "badge_notification")
    @Builder.Default
    private Boolean badgeNotification = true;

    @Column(name = "system_notification")
    @Builder.Default
    private Boolean systemNotification = true;

    // 개인정보 설정
    @Column(name = "location_tracking")
    @Builder.Default
    private Boolean locationTracking = true;

    @Column(name = "profile_visibility", length = 20)
    @Builder.Default
    private String profileVisibility = "PUBLIC";

    @Column(name = "meeting_history_visibility", length = 20)
    @Builder.Default
    private String meetingHistoryVisibility = "PUBLIC";

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public void updateSettings(Boolean notificationEnabled, Boolean pushNotification,
                               Boolean locationTracking, Boolean followMeetingNotification,
                               Boolean followReviewNotification) {
        if (notificationEnabled != null) this.notificationEnabled = notificationEnabled;
        if (pushNotification != null) this.pushNotification = pushNotification;
        if (locationTracking != null) this.locationTracking = locationTracking;
        if (followMeetingNotification != null) this.followMeetingNotification = followMeetingNotification;
        if (followReviewNotification != null) this.followReviewNotification = followReviewNotification;
    }}