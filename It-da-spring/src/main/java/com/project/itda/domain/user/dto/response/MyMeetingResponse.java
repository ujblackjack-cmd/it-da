package com.project.itda.domain.user.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class MyMeetingResponse {
    private Long meetingId;
    private String meetingTitle;
    private String dateTime;
    private String location;
    private String statusText;
    private Double averageRating;
    private Boolean hasMyReview;
    private Long chatRoomId;
}