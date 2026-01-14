package com.project.itda.domain.user.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class PendingReviewResponse {
    private Long meetingId;
    private String meetingTitle;
    private String completedDate;
}