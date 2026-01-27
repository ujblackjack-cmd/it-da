package com.project.itda.domain.meeting.dto.request;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class LocationUpdateRequest {
    private String locationName;
    private String locationAddress;
    private Double latitude;
    private Double longitude;
}