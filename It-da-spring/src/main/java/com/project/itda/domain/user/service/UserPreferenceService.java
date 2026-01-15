package com.project.itda.domain.user.service;

import com.project.itda.domain.user.dto.request.UserPreferenceRequest;
import com.project.itda.domain.user.dto.response.UserPreferenceResponse;
import com.project.itda.domain.user.entity.User;
import com.project.itda.domain.user.entity.UserPreference;
import com.project.itda.domain.user.enums.*;
import com.project.itda.domain.user.repository.UserPreferenceRepository;
import com.project.itda.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class UserPreferenceService {

    private final UserPreferenceRepository userPreferenceRepository;
    private final UserRepository userRepository;

    /**
     * 사용자 선호도 조회
     */
    public UserPreferenceResponse getPreference(Long userId) {
        UserPreference preference = userPreferenceRepository.findByUserUserId(userId)
                .orElseThrow(() -> new RuntimeException("사용자 선호도를 찾을 수 없습니다."));

        return mapToResponse(preference);
    }

    /**
     * 사용자 선호도 생성 또는 수정
     */
    @Transactional
    public UserPreferenceResponse createOrUpdatePreference(Long userId, UserPreferenceRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

        // 기존 선호도가 있는지 확인
        UserPreference preference = userPreferenceRepository.findByUserUserId(userId)
                .orElse(null);

        if (preference == null) {
            // 생성
            preference = UserPreference.builder()
                    .user(user)
                    .energyType(EnergyType.valueOf(request.getEnergyType()))
                    .purposeType(PurposeType.valueOf(request.getPurposeType()))
                    .frequencyType(FrequencyType.valueOf(request.getFrequencyType()))
                    .locationType(LocationType.valueOf(request.getLocationType()))
                    .budgetType(BudgetType.valueOf(request.getBudgetType()))
                    .leadershipType(LeadershipType.valueOf(request.getLeadershipType()))
                    .timePreference(request.getTimePreference())
                    .interests(request.getInterests())
                    .build();

            log.info("✅ 사용자 선호도 생성: userId={}", userId);
        } else {
            // 수정
            preference.updatePreference(
                    EnergyType.valueOf(request.getEnergyType()),
                    PurposeType.valueOf(request.getPurposeType()),
                    FrequencyType.valueOf(request.getFrequencyType()),
                    LocationType.valueOf(request.getLocationType()),
                    BudgetType.valueOf(request.getBudgetType()),
                    LeadershipType.valueOf(request.getLeadershipType()),
                    request.getTimePreference(),
                    request.getInterests()
            );

            log.info("✅ 사용자 선호도 수정: userId={}", userId);
        }

        preference = userPreferenceRepository.save(preference);
        return mapToResponse(preference);
    }

    /**
     * 사용자 선호도 존재 여부 확인
     */
    public boolean existsByUserId(Long userId) {
        return userPreferenceRepository.findByUserUserId(userId).isPresent();
    }

    /**
     * Entity를 Response DTO로 변환
     */
    private UserPreferenceResponse mapToResponse(UserPreference preference) {
        return UserPreferenceResponse.builder()
                .preferenceId(preference.getPreferenceId())
                .userId(preference.getUser().getUserId())
                .energyType(preference.getEnergyType().name())
                .purposeType(preference.getPurposeType().name())
                .frequencyType(preference.getFrequencyType().name())
                .locationType(preference.getLocationType().name())
                .budgetType(preference.getBudgetType().name())
                .leadershipType(preference.getLeadershipType().name())
                .timePreference(preference.getTimePreference())
                .interests(preference.getInterests())
                .build();
    }
}