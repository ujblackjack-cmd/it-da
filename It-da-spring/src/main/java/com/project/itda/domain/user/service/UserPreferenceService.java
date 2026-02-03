package com.project.itda.domain.user.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
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

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class UserPreferenceService {

    private final UserPreferenceRepository userPreferenceRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    // ✅ interests 매핑 테이블 추가
    private static final Map<String, String> INTEREST_MAPPING = Map.ofEntries(
            Map.entry("아웃도어", "스포츠"),
            Map.entry("게임", "소셜"),
            Map.entry("음악", "문화예술"),
            Map.entry("요리", "취미활동"),
            Map.entry("사진", "문화예술")
    );

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

        // ✅ interests 매핑 적용
        String mappedInterests = mapInterests(request.getInterests());
        log.info("🔄 interests 매핑: {} → {}", request.getInterests(), mappedInterests);

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
                    .interests(mappedInterests)  // ✅ 매핑된 값 저장
                    .build();

            log.info("✅ 사용자 선호도 생성: userId={}, interests={}", userId, mappedInterests);
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
                    mappedInterests  // ✅ 매핑된 값 저장
            );

            log.info("✅ 사용자 선호도 수정: userId={}, interests={}", userId, mappedInterests);
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
     * ✅ interests JSON을 DB 카테고리로 매핑
     */
    private String mapInterests(String interestsJson) {
        if (interestsJson == null || interestsJson.trim().isEmpty()) {
            log.warn("⚠️ interests가 비어있음");
            return "[]";
        }

        try {
            // JSON 파싱 시도
            List<String> interests = objectMapper.readValue(
                    interestsJson,
                    new TypeReference<List<String>>() {}
            );

            // 매핑 적용 + 중복 제거
            List<String> mapped = interests.stream()
                    .map(String::trim)
                    .map(interest -> INTEREST_MAPPING.getOrDefault(interest, interest))
                    .distinct()
                    .collect(Collectors.toList());

            // 다시 JSON으로 변환
            String result = objectMapper.writeValueAsString(mapped);
            log.debug("🔍 interests 매핑 결과: {} → {}", interestsJson, result);
            return result;

        } catch (Exception e) {
            // JSON 파싱 실패 시 쉼표 구분 처리
            log.warn("⚠️ JSON 파싱 실패, 쉼표 구분 방식으로 처리: {}", interestsJson);

            List<String> interests = List.of(interestsJson.split(","));
            List<String> mapped = interests.stream()
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .map(interest -> INTEREST_MAPPING.getOrDefault(interest, interest))
                    .distinct()
                    .collect(Collectors.toList());

            try {
                return objectMapper.writeValueAsString(mapped);
            } catch (Exception ex) {
                log.error("❌ interests 변환 실패, 원본 반환: {}", interestsJson);
                return interestsJson;
            }
        }
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