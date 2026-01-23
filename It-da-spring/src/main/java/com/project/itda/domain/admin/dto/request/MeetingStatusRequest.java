package com.project.itda.domain.admin.dto.request;

import com.project.itda.domain.meeting.enums.MeetingStatus;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MeetingStatusRequest {
    private MeetingStatus status;
}