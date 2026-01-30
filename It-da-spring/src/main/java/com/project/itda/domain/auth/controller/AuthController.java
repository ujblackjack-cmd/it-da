package com.project.itda.domain.auth.controller;

import com.project.itda.domain.admin.entity.AdminUser;
import com.project.itda.domain.admin.repository.AdminUserRepository;
import com.project.itda.domain.auth.dto.request.LoginRequest;
import com.project.itda.domain.auth.dto.request.UserSignupRequest;
import com.project.itda.domain.auth.dto.response.LoginResponse;
import com.project.itda.domain.auth.dto.response.SessionInfoResponse;
import com.project.itda.domain.auth.dto.SessionUser;
import com.project.itda.domain.auth.service.AuthService;
import com.project.itda.domain.user.entity.User;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final AdminUserRepository adminUserRepository;

    /**
     * 이메일/비밀번호 로그인 (Redis 세션 방식)
     * 일반 사용자 + 관리자 통합 로그인
     */
    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest) {

        HttpSession session = httpRequest.getSession(true);

        try {
            // 1. 먼저 일반 사용자로 로그인 시도
            User user = authService.authenticate(request.getEmail(), request.getPassword());

            // 일반 사용자 로그인 성공
            session.setAttribute("userId", user.getUserId());
            session.setAttribute("email", user.getEmail());
            session.setAttribute("username", user.getUsername());
            session.setAttribute("nickname", user.getNickname());


            SessionUser sessionUser = SessionUser.builder()
                    .userId(user.getUserId())
                    .email(user.getEmail())
                    .username(user.getUsername())
                    .nickname(user.getNickname())
                    .picture(user.getProfileImageUrl()) // 프로필 이미지도 추가
                    .build();
            session.setAttribute("user", sessionUser);  // ✅ 이거 추가!

            log.info("✅ 일반 사용자 로그인 성공 - User: {}, SessionId: {}", user.getEmail(), session.getId());

            return ResponseEntity.ok(LoginResponse.builder()
                    .userType("USER")
                    .sessionId(session.getId())
                    .userId(user.getUserId())
                    .email(user.getEmail())
                    .username(user.getUsername())
                    .nickname(user.getNickname())
                    .build());

        } catch (Exception e) {
            // 2. 일반 사용자 로그인 실패 시, 관리자 계정 확인
            AdminUser admin = adminUserRepository.findByEmail(request.getEmail()).orElse(null);

            if (admin != null && admin.getIsActive()) {
                // 관리자 로그인 (패스워드 체크는 생략 - 임시)
                session.setAttribute("adminId", admin.getAdminId());
                session.setAttribute("adminEmail", admin.getEmail());
                session.setAttribute("adminName", admin.getName());
                session.setAttribute("adminRole", admin.getRole());

                log.info("✅ 관리자 로그인 성공 - Admin: {}, SessionId: {}", admin.getEmail(), session.getId());

                return ResponseEntity.ok(LoginResponse.builder()
                        .userType("ADMIN")
                        .sessionId(session.getId())
                        .adminId(admin.getAdminId())
                        .email(admin.getEmail())
                        .username(admin.getName())
                        .role(admin.getRole().name())
                        .build());
            }

            // 3. 둘 다 아니면 로그인 실패
            log.warn("❌ 로그인 실패 - Email: {}", request.getEmail());
            throw new RuntimeException("이메일 또는 비밀번호가 올바르지 않습니다.");
        }
    }

    /**
     * 회원가입
     */
    @PostMapping("/signup")
    public ResponseEntity<String> signup(@Valid @RequestBody UserSignupRequest request) {
        authService.signup(request);
        return ResponseEntity.status(HttpStatus.CREATED).body("회원가입이 완료되었습니다.");
    }

    /**
     * 로그아웃
     */
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null) {
            log.info("🔓 로그아웃 - SessionId: {}", session.getId());
            session.invalidate(); // Redis에서 세션 삭제
        }
        return ResponseEntity.ok().build();
    }

    /**
     * 현재 세션 정보 조회
     */
    @GetMapping("/session")
    public ResponseEntity<SessionInfoResponse> getSession(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session == null || session.getAttribute("userId") == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        return ResponseEntity.ok(SessionInfoResponse.builder()
                .userId((Long) session.getAttribute("userId"))
                .email((String) session.getAttribute("email"))
                .username((String) session.getAttribute("username"))
                .nickname((String) session.getAttribute("nickname"))
                .build());
    }
}