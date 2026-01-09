package com.project.itda.domain.user.service;

import com.project.itda.domain.user.dto.request.UserPreferenceRequest;
import com.project.itda.domain.user.dto.response.UserPreferenceResponse;
import com.project.itda.domain.user.entity.User;
import com.project.itda.domain.user.entity.UserPreference;
import com.project.itda.domain.user.repository.UserPreferenceRepository;
import com.project.itda.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserPreferenceService {

    private final UserPreferenceRepository userPreferenceRepository;
    private final UserRepository userRepository;

    @Transactional
    public UserPreferenceResponse createOrUpdatePreference(Long userId, UserPreferenceRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다"));

        UserPreference preference = userPreferenceRepository.findByUser_UserId(userId)
                .orElse(null);

        if (preference == null) {
            preference = UserPreference.builder()
                    .user(user)
                    .energyType(request.getEnergyType())
                    .purposeType(request.getPurposeType())
                    .frequencyType(request.getFrequencyType())
                    .locationType(request.getLocationType())
                    .budgetType(request.getBudgetType())
                    .leadershipType(request.getLeadershipType())
                    .timePreference(request.getTimePreference())
                    .interests(request.getInterests())
                    .build();
            log.info("사용자 선호도 생성: userId={}", userId);
        } else {
            preference.updatePreference(
                    request.getEnergyType(),
                    request.getPurposeType(),
                    request.getFrequencyType(),
                    request.getLocationType(),
                    request.getBudgetType(),
                    request.getLeadershipType(),
                    request.getTimePreference(),
                    request.getInterests()
            );
            log.info("사용자 선호도 수정: userId={}", userId);
        }

        preference = userPreferenceRepository.save(preference);
        return UserPreferenceResponse.from(preference);
    }

    public UserPreferenceResponse getPreference(Long userId) {
        UserPreference preference = userPreferenceRepository.findByUser_UserId(userId)
                .orElseThrow(() -> new IllegalArgumentException("선호도 정보를 찾을 수 없습니다"));

        log.info("사용자 선호도 조회: userId={}", userId);
        return UserPreferenceResponse.from(preference);
    }
}