package com.project.itda.domain.user.dto.request;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class UserPreferenceRequest {
    private String energyType;
    private String purposeType;
    private String frequencyType;
    private String locationType;
    private String budgetType;
    private String leadershipType;
    private String timePreference;
    private String interests;  // JSON 문자열
}