package com.project.itda.domain.notification.enums;

public enum NotificationType {
    // 팔로우 관련
    FOLLOW,              // 새 팔로워
    FOLLOW_REQUEST,      // 팔로우 요청 (비공개 계정)
    FOLLOW_ACCEPT,       // 팔로우 요청 수락

    // 메시지 관련
    MESSAGE,             // 새 메시지 (DM)

    // 모임 관련
    MEETING,             // 모임 참가 알림
    MEETING_JOIN,        // 내 모임에 누가 참가
    MEETING_FOLLOW,      // 팔로우한 사람 모임 참가
    MEETING_REMINDER,    // 모임 리마인더 (D-1, D-day)

    // 후기 관련
    REVIEW,              // 후기 관련
    REVIEW_REQUEST,      // 후기 작성 요청

    // 배지/시스템
    BADGE,               // 배지 획득
    SYSTEM               // 시스템 공지
}