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

import java.util.HashMap;
import java.util.Map;

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
     * ✅ 세션 확인 API (React용)
     * GET /api/auth/session
     */
    @GetMapping("/session")
    public ResponseEntity<?> getSession(HttpSession session) {
        log.info("==================== 세션 조회 요청 ====================");
        log.info("세션 ID: {}", session != null ? session.getId() : "null");

        if (session == null) {
            log.warn("⚠️ 세션이 존재하지 않음");
            return ResponseEntity.status(401)
                    .body(createErrorResponse("세션이 없습니다."));
        }

        // ✅ 1. SessionUser 객체로 조회
        SessionUser sessionUser = (SessionUser) session.getAttribute("user");

        if (sessionUser != null) {
            log.info("✅ SessionUser 발견: userId={}, email={}",
                    sessionUser.getUserId(), sessionUser.getEmail());

            return ResponseEntity.ok(Map.of(
                    "userId", sessionUser.getUserId(),
                    "email", sessionUser.getEmail(),
                    "username", sessionUser.getUsername(),
                    "nickname", sessionUser.getNickname() != null ? sessionUser.getNickname() : sessionUser.getUsername(),
                    "profileImageUrl", sessionUser.getPicture() != null ? sessionUser.getPicture() : ""
            ));
        }

        // ✅ 2. 개별 속성으로 조회 (대체 방법)
        Long userId = (Long) session.getAttribute("userId");
        String email = (String) session.getAttribute("email");
        String username = (String) session.getAttribute("username");
        String nickname = (String) session.getAttribute("nickname");

        if (userId != null) {
            log.info("✅ 개별 속성 발견: userId={}", userId);

            return ResponseEntity.ok(Map.of(
                    "userId", userId,
                    "email", email != null ? email : "",
                    "username", username != null ? username : "",
                    "nickname", nickname != null ? nickname : ""
            ));
        }

        log.warn("⚠️ 세션에 유저 정보 없음");
        return ResponseEntity.status(401)
                .body(createErrorResponse("로그인이 필요합니다."));
    }

    /**
     * ✅ 로그아웃 API
     * POST /api/auth/logout
     */
    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpSession session) {
        log.info("==================== 로그아웃 요청 ====================");

        if (session != null) {
            log.info("세션 무효화: {}", session.getId());
            session.invalidate();
        }

        return ResponseEntity.ok(Map.of("message", "로그아웃 성공"));
    }

    /**
     * ✅ 에러 응답 생성 헬퍼 메서드
     */
    private Map<String, Object> createErrorResponse(String message) {
        Map<String, Object> error = new HashMap<>();
        error.put("error", message);
        error.put("authenticated", false);
        return error;
    }
}