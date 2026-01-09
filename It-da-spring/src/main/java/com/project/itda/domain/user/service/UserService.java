package com.project.itda.domain.user.service;

import com.project.itda.domain.user.dto.request.UserSignupRequest;
import com.project.itda.domain.user.dto.request.UserUpdateRequest;
import com.project.itda.domain.user.dto.response.UserDetailResponse;
import com.project.itda.domain.user.dto.response.UserResponse;
import com.project.itda.domain.user.entity.User;
import com.project.itda.domain.user.entity.UserSetting;
import com.project.itda.domain.user.enums.UserStatus;
import com.project.itda.domain.user.repository.UserRepository;
import com.project.itda.domain.user.repository.UserSettingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
    private final UserSettingRepository userSettingRepository;

    @Transactional
    public UserResponse signup(UserSignupRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("이미 존재하는 이메일입니다");
        }

        // User 생성 (Entity에 있는 필드만!)
        User user = User.builder()
                .email(request.getEmail())
                .passwordHash(request.getPassword())  // ✅ password → passwordHash
                .username(request.getUsername())
                .phone(request.getPhone())
                .status(UserStatus.ACTIVE)
                .build();

        user = userRepository.save(user);
        log.info("회원가입 완료: userId={}, email={}", user.getUserId(), user.getEmail());

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

        // Entity에 있는 필드만 업데이트!
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