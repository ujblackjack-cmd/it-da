package com.project.itda.domain.user.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class MyReviewResponse {
    private Long meetingId;
    private String meetingTitle;
    private Integer rating;
    private String content;
    private String createdDate;
    private String sentiment;
}