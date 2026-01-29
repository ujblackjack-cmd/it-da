package com.project.itda.domain.admin.dto.response;

import com.project.itda.domain.meeting.entity.Meeting;
import com.project.itda.domain.meeting.enums.MeetingStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MeetingManageResponse {
    private Long meetingId;
    private Long chatRoomId;
    private String title;
    private String categoryName;
    private String subcategoryName;
    private String leaderName;
    private String leaderEmail;
    private LocalDateTime meetingDate;
    private String location;
    private Integer maxMembers;
    private Integer currentMembers;
    private Integer expectedCost;
    private MeetingStatus status;
    private LocalDateTime createdAt;
    private Double avgRating;
    private Integer reviewCount;

    public static MeetingManageResponse from(Meeting meeting) {
        return MeetingManageResponse.builder()
                .meetingId(meeting.getMeetingId())
                .chatRoomId(meeting.getChatRoom() != null ? meeting.getChatRoom().getId() : null)
                .title(meeting.getTitle())
                .categoryName(meeting.getCategory())
                .subcategoryName(meeting.getSubcategory())
                .leaderName(meeting.getOrganizer().getUsername())
                .leaderEmail(meeting.getOrganizer().getEmail())
                .meetingDate(meeting.getMeetingTime())
                .location(meeting.getLocationName())
                .maxMembers(meeting.getMaxParticipants())
                .currentMembers(meeting.getCurrentParticipants())
                .expectedCost(meeting.getExpectedCost())
                .status(meeting.getStatus())
                .createdAt(meeting.getCreatedAt())
                .avgRating(meeting.getAvgRating())
                .reviewCount(meeting.getReviewCount())
                .build();
    }
}