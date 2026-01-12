package com.project.itda.domain.user.service;

import com.project.itda.domain.user.dto.request.UserSignupRequest;
import com.project.itda.domain.user.dto.request.UserUpdateRequest;
import com.project.itda.domain.user.dto.response.UserDetailResponse;
import com.project.itda.domain.user.dto.response.UserResponse;
import com.project.itda.domain.user.entity.User;
import com.project.itda.domain.user.entity.UserPreference;
import com.project.itda.domain.user.entity.UserSetting;
import com.project.itda.domain.user.enums.UserStatus;
import com.project.itda.domain.user.repository.UserPreferenceRepository;
import com.project.itda.domain.user.repository.UserRepository;
import com.project.itda.domain.user.repository.UserSettingRepository;
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
    private final PasswordEncoder passwordEncoder; // ✅ PasswordEncoder 주입

    @Transactional
    public UserResponse signup(UserSignupRequest request) {
        // 1. 이메일 중복 체크
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("이미 존재하는 이메일입니다");
        }

        // 2. User 생성 (✅ 비밀번호 암호화 + 주소/위경도 포함)
        User user = User.builder()
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword())) // ✅ 암호화!
                .username(request.getUsername())
                .phone(request.getPhone())
                .address(request.getAddress()) // ✅ 주소 저장
                .latitude(request.getLatitude()) // ✅ 위도 저장
                .longitude(request.getLongitude()) // ✅ 경도 저장
                .status(UserStatus.ACTIVE)
                .build();

        user = userRepository.save(user);
        log.info("회원가입 완료: userId={}, email={}", user.getUserId(), user.getEmail());

        // 3. UserPreference 저장 (✅ null 체크 후 저장)
        if (request.getPreferences() != null) {
            UserPreference preference = UserPreference.builder()
                    .user(user) // ✅ User 객체 전달
                    .energyType(request.getPreferences().getEnergyType())
                    .purposeType(request.getPreferences().getPurposeType())
                    .frequencyType(request.getPreferences().getFrequencyType())
                    .locationType(request.getPreferences().getLocationType())
                    .budgetType(request.getPreferences().getBudgetType())
                    .leadershipType(request.getPreferences().getLeadershipType())
                    .timePreference(request.getPreferences().getTimePreference())
                    .interests(request.getPreferences().getInterests())
                    .build();

            userPreferenceRepository.save(preference);
            log.info("선호도 저장 완료: userId={}", user.getUserId());
        }

        // 4. 기본 UserSetting 생성
        UserSetting setting = UserSetting.builder()
                .user(user)
                .build();
        userSettingRepository.save(setting);

        return UserResponse.from(user);
    }

    public UserDetailResponse getUserDetail(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다"));
        log.info("사용자 상세 조회: userId={}", userId);
        return UserDetailResponse.from(user);
    }

    public List<UserResponse> getAllUsers() {
        log.info("전체 사용자 조회");
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

        log.info("사용자 정보 수정: userId={}", userId);
        return UserResponse.from(user);
    }

    @Transactional
    public void deleteUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다"));

        userRepository.delete(user);
        log.info("사용자 삭제: userId={}", userId);
    }
}