package com.project.itda.domain.user.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserContextDTO {
    private Long userId;
    private Double latitude;
    private Double longitude;
    private String interests;
    private String timePreference;
    private String budgetType;
    private Double userAvgRating;
    private Integer userMeetingCount;
    private Double userRatingStd;
}