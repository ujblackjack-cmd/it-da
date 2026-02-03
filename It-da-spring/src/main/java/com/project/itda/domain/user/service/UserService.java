package com.project.itda.domain.user.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.project.itda.domain.review.repository.ReviewRepository;
import com.project.itda.domain.user.dto.request.UserContextDTO;
import com.project.itda.domain.user.dto.request.UserSignupRequest;
import com.project.itda.domain.user.dto.request.UserUpdateRequest;
import com.project.itda.domain.user.dto.response.UserContextResponse;
import com.project.itda.domain.user.dto.response.UserDetailResponse;
import com.project.itda.domain.user.dto.response.UserResponse;
import com.project.itda.domain.user.entity.User;
import com.project.itda.domain.user.entity.UserPreference;
import com.project.itda.domain.user.entity.UserSetting;
import com.project.itda.domain.user.enums.*;
import com.project.itda.domain.user.repository.UserPreferenceRepository;
import com.project.itda.domain.user.repository.UserRepository;
import com.project.itda.domain.user.repository.UserSettingRepository;
import com.project.itda.global.service.GeocodingService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserService {

    private final UserRepository userRepository;
    private final UserPreferenceRepository userPreferenceRepository;
    private final UserSettingRepository userSettingRepository;
    private final PasswordEncoder passwordEncoder;
    private final GeocodingService geocodingService;
    private final ReviewRepository reviewRepository;
    private final UserFollowService userFollowService;
    private final ObjectMapper objectMapper;  // ✅ 추가

    // ✅ interests 매핑 테이블
    private static final Map<String, String> INTEREST_MAPPING = Map.ofEntries(
            Map.entry("아웃도어", "스포츠"),
            Map.entry("게임", "소셜"),
            Map.entry("음악", "문화예술"),
            Map.entry("요리", "취미활동"),
            Map.entry("사진", "문화예술")
    );

    @Transactional
    public UserResponse signup(UserSignupRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("이미 존재하는 이메일입니다");
        }

        Double latitude = null;
        Double longitude = null;

        if (request.getAddress() != null && !request.getAddress().trim().isEmpty()) {
            log.info("🔍 주소로 위경도 조회 시작: {}", request.getAddress());
            GeocodingService.Coordinates coords = geocodingService.getCoordinates(request.getAddress());
            if (coords != null) {
                latitude = coords.getLatitude();
                longitude = coords.getLongitude();
                log.info("✅ 위경도 조회 성공: ({}, {})", latitude, longitude);
            } else {
                log.warn("⚠️ 위경도 조회 실패, NULL로 저장됨");
            }
        }

        User user = User.builder()
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .username(request.getUsername())
                .phone(request.getPhone())
                .address(request.getAddress())
                .latitude(latitude)
                .longitude(longitude)
                .status(UserStatus.ACTIVE)
                .build();

        user = userRepository.save(user);
        log.info("✅ 회원가입 완료: userId={}, lat={}, lng={}",
                user.getUserId(), user.getLatitude(), user.getLongitude());

        if (request.getPreferences() != null) {
            // ✅ interests 매핑 적용
            String originalInterests = request.getPreferences().getInterests();
            String mappedInterests = mapInterests(originalInterests);
            log.info("🔄 회원가입 interests 매핑: {} → {}", originalInterests, mappedInterests);

            UserPreference preference = UserPreference.builder()
                    .user(user)
                    .energyType(EnergyType.valueOf(request.getPreferences().getEnergyType()))
                    .purposeType(PurposeType.valueOf(request.getPreferences().getPurposeType()))
                    .frequencyType(FrequencyType.valueOf(request.getPreferences().getFrequencyType()))
                    .locationType(LocationType.valueOf(request.getPreferences().getLocationType()))
                    .budgetType(BudgetType.valueOf(request.getPreferences().getBudgetType()))
                    .leadershipType(LeadershipType.valueOf(request.getPreferences().getLeadershipType()))
                    .timePreference(String.valueOf(TimePreference.valueOf(request.getPreferences().getTimePreference())))
                    .interests(mappedInterests)  // ✅ 매핑된 값 사용
                    .build();
            userPreferenceRepository.save(preference);
            log.info("✅ 선호도 저장 완료: userId={}, interests={}", user.getUserId(), mappedInterests);
        }

        UserSetting setting = UserSetting.builder()
                .user(user)
                .build();
        userSettingRepository.save(setting);

        return UserResponse.from(user);
    }

    public UserDetailResponse getUserDetail(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다"));
        return UserDetailResponse.from(user);
    }

    public List<UserResponse> getAllUsers() {
        return userRepository.findAll().stream()
                .map(UserResponse::from)
                .collect(Collectors.toList());
    }

    @Transactional
    public UserResponse updateUser(Long userId, UserUpdateRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다"));

        String oldAddress = user.getAddress();

        try {
            user.updateInfo(
                    request.getUsername(),
                    request.getPhone(),
                    request.getAddress(),
                    null,
                    null,
                    request.getProfileImageUrl(),
                    request.getBio(),
                    request.getGender(),
                    request.getMbti(),
                    request.getInterests(),
                    request.getIsPublic()
            );
            log.info("1. 엔티티 기본 정보 업데이트 성공");

            String newAddress = request.getAddress();
            log.info("🔍 주소 → {}", newAddress);

            // ✅ address가 "실제로 변경"된 경우만 위경도 갱신
            if (newAddress != null && !newAddress.trim().isEmpty()
                    && (oldAddress == null || !oldAddress.equals(newAddress))) {

                log.info("🔍 주소 변경 감지 → 위경도 재계산: {}", newAddress);
                GeocodingService.Coordinates coords = geocodingService.getCoordinates(newAddress);

                if (coords != null) {
                    user.setLatitude(coords.getLatitude());
                    user.setLongitude(coords.getLongitude());
                    log.info("✅ 위경도 업데이트 성공: ({}, {})", user.getLatitude(), user.getLongitude());
                } else {
                    log.warn("⚠️ 위경도 조회 실패 → 기존 좌표 유지. userId={}", userId);
                }
            }

            userFollowService.notifyProfileUpdate(userId);
            log.info("✅ 프로필 업데이트 및 알림 전송: userId={}", userId);

        } catch (Exception e) {
            log.error("❌ 프로필 업데이트 중 상세 오류 발생: ", e);
            throw e;
        }

        return UserResponse.from(user);
    }

    @Transactional
    public void deleteUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다"));

        user.softDelete();
        userRepository.save(user);
        log.info("✅ 계정 삭제 완료: userId={}", userId);
    }

    @Transactional(readOnly = true)
    public UserContextResponse getUserContext(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("사용자를 찾을 수 없습니다: " + userId));

        UserPreference preference = user.getPreference();
        String interests = (preference != null) ? preference.getInterests() : "";
        String timePreference = (preference != null) ? preference.getTimePreference() : "";
        String budgetType = (preference != null && preference.getBudgetType() != null)
                ? preference.getBudgetType().name()
                : "VALUE";

        Double avgRating = reviewRepository.findAvgRatingByUserId(userId);
        Long ratingCount = reviewRepository.countByUserId(userId);
        Double ratingStd = reviewRepository.findRatingStdByUserId(userId);

        return UserContextResponse.builder()
                .userId(userId)
                .latitude(user.getLatitude())
                .longitude(user.getLongitude())
                .interests(interests != null ? interests : "")
                .timePreference(timePreference != null ? timePreference : "")
                .budgetType(budgetType)
                .userAvgRating(avgRating != null ? avgRating : 0.0)
                .userMeetingCount(user.getMeetingCount() != null ? user.getMeetingCount() : 0)
                .userRatingStd(ratingStd != null ? ratingStd : 0.0)
                .build();
    }

    public Map<String, Object> getUserPreferences(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));

        UserPreference pref = userPreferenceRepository.findByUserId(userId)
                .orElse(null);

        Map<String, Object> result = new HashMap<>();

        result.put("latitude", user.getLatitude() != null ? user.getLatitude() : 37.5665);
        result.put("longitude", user.getLongitude() != null ? user.getLongitude() : 126.9780);

        if (pref != null) {
            result.put("timePreference", pref.getTimePreference());
            result.put("locationType", pref.getLocationType());
            result.put("interests", pref.getInterests());
            result.put("budgetType", pref.getBudgetType());
        } else {
            result.put("timePreference", "EVENING");
            result.put("locationType", "INDOOR");
            result.put("interests", "");
            result.put("budgetType", "value");
        }

        result.put("avgRating", calculateUserAvgRating(userId));
        result.put("meetingCount", getUserMeetingCount(userId));
        result.put("ratingStd", calculateUserRatingStd(userId));

        return result;
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

    private Double calculateUserAvgRating(Long userId) {
        return 4.2;
    }

    private Integer getUserMeetingCount(Long userId) {
        return 10;
    }

    private Double calculateUserRatingStd(Long userId) {
        return 0.8;
    }
}