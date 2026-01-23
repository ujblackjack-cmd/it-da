package com.project.itda.domain.participation.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 홈페이지 "최근 접속한 채팅방/캐시글" 응답 DTO
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MyRecentMeetingResponse {

    private Long meetingId;
    private String title;
    private String category;
    private String subcategory;
    private String icon;           // 카테고리별 이모지
    private String timeAgo;        // "2시간 전", "어제" 등
    private String type;           // "chat" 또는 "meeting"
    private LocalDateTime meetingTime;
    private String status;         // APPROVED, COMPLETED 등
    private LocalDateTime lastActivityAt;  // 마지막 활동 시간
    private Long chatRoomId;
}