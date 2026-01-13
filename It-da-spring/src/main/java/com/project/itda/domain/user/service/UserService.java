package com.project.itda.domain.user.service;

import com.project.itda.domain.user.dto.request.UserSignupRequest;
import com.project.itda.domain.user.dto.request.UserUpdateRequest;
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
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
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

    @Transactional
    public UserResponse signup(UserSignupRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("이미 존재하는 이메일입니다");
        }

        // ✅ 위도/경도 조회
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

        // UserPreference 저장
        if (request.getPreferences() != null) {
            UserPreference preference = UserPreference.builder()
                    .user(user)
                    .energyType(EnergyType.valueOf(request.getPreferences().getEnergyType()))
                    .purposeType(PurposeType.valueOf(request.getPreferences().getPurposeType()))
                    .frequencyType(FrequencyType.valueOf(request.getPreferences().getFrequencyType()))
                    .locationType(LocationType.valueOf(request.getPreferences().getLocationType()))
                    .budgetType(BudgetType.valueOf(request.getPreferences().getBudgetType()))
                    .leadershipType(LeadershipType.valueOf(request.getPreferences().getLeadershipType()))
                    .timePreference(String.valueOf(TimePreference.valueOf(request.getPreferences().getTimePreference())))
                    .interests(request.getPreferences().getInterests())
                    .build();

            userPreferenceRepository.save(preference);
            log.info("✅ 선호도 저장 완료: userId={}", user.getUserId());
        }

        // 기본 UserSetting 생성
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

        user.updateInfo(
                request.getUsername(),
                request.getPhone(),
                null,
                null,
                null
        );

        return UserResponse.from(user);
    }

    @Transactional
    public void deleteUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다"));
        userRepository.delete(user);
    }
}