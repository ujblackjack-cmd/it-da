package com.project.itda.domain.admin.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecentMeetingResponse {
    private Long meetingId;
    private String title;
    private String categoryName;
    private Integer currentMembers;
    private LocalDateTime createdAt;
}