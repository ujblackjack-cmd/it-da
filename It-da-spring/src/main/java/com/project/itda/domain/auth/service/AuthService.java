package com.project.itda.domain.auth.service;

import com.project.itda.domain.auth.dto.request.UserSignupRequest;
import com.project.itda.domain.user.entity.User;
import com.project.itda.domain.user.enums.UserStatus;
import com.project.itda.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    /**
     * 이메일/비밀번호 인증
     */
    public User authenticate(String email, String password) {
        // N+1 방지를 위해 필요시 findByEmailWithAll 사용 가능
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("존재하지 않는 사용자입니다."));

        // 소셜 로그인 사용자 체크
        if (user.getPasswordHash() == null) {
            throw new RuntimeException("소셜 로그인 사용자입니다. 소셜 로그인을 이용해주세요.");
        }

        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new RuntimeException("비밀번호가 일치하지 않습니다.");
        }

        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new RuntimeException("활성화되지 않은 계정입니다.");
        }

        // 마지막 로그인 시간 업데이트
        user.updateLastLogin();

        return user;
    }

    /**
     * 회원가입
     */
    @Transactional
    public void signup(UserSignupRequest request) {
        // 이메일 중복 체크
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("이미 사용 중인 이메일입니다.");
        }

        // 전화번호 중복 체크 (선택)
        if (request.getPhone() != null && userRepository.existsByPhone(request.getPhone())) {
            throw new RuntimeException("이미 사용 중인 전화번호입니다.");
        }

        User user = User.builder()
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword())) // ✅ passwordHash 사용
                .username(request.getUsername())
                .nickname(request.getNickname())
                .phone(request.getPhone())
                .status(UserStatus.ACTIVE)
                .emailVerified(false)
                .provider("local") // 일반 회원가입
                .build();

        userRepository.save(user);
        log.info("✅ 회원가입 완료 - Email: {}", user.getEmail());
    }
}