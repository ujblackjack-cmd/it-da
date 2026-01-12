package com.project.itda.domain.user.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserPreferenceRequest {

    @NotBlank(message = "에너지 타입은 필수입니다")
    private String energyType;

    @NotBlank(message = "목적 타입은 필수입니다")
    private String purposeType;

    @NotBlank(message = "빈도 타입은 필수입니다")
    private String frequencyType;

    @NotBlank(message = "장소 타입은 필수입니다")
    private String locationType;

    @NotBlank(message = "예산 타입은 필수입니다")
    private String budgetType;

    @NotBlank(message = "리더십 타입은 필수입니다")
    private String leadershipType;

    @NotBlank(message = "시간대 선호는 필수입니다")
    private String timePreference;

    private String interests;
}