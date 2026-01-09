package com.project.itda.domain.user.dto.response;

import com.project.itda.domain.user.entity.UserPreference;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class UserPreferenceResponse {
    private Long preferenceId;
    private Long userId;
    private String energyType;
    private String purposeType;
    private String frequencyType;
    private String locationType;
    private String budgetType;
    private String leadershipType;
    private String timePreference;
    private String interests;

    public static UserPreferenceResponse from(UserPreference preference) {
        return UserPreferenceResponse.builder()
                .preferenceId(preference.getPreferenceId())
                .userId(preference.getUser().getUserId())
                .energyType(preference.getEnergyType())
                .purposeType(preference.getPurposeType())
                .frequencyType(preference.getFrequencyType())
                .locationType(preference.getLocationType())
                .budgetType(preference.getBudgetType())
                .leadershipType(preference.getLeadershipType())
                .timePreference(preference.getTimePreference())
                .interests(preference.getInterests())
                .build();
    }
}