package com.project.itda.domain.auth.controller;

import com.project.itda.domain.auth.dto.request.LoginRequest;
import com.project.itda.domain.auth.dto.request.UserSignupRequest;
import com.project.itda.domain.auth.dto.response.LoginResponse;
import com.project.itda.domain.auth.dto.response.SessionInfoResponse;
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

    /**
     * 이메일/비밀번호 로그인 (Redis 세션 방식)
     */
    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest) {

        User user = authService.authenticate(request.getEmail(), request.getPassword());

        // Redis에 세션 저장
        HttpSession session = httpRequest.getSession(true);
        session.setAttribute("userId", user.getUserId());
        session.setAttribute("email", user.getEmail());
        session.setAttribute("username", user.getUsername());
        session.setAttribute("nickname", user.getNickname());

        log.info("✅ 로그인 성공 - User: {}, SessionId: {}", user.getEmail(), session.getId());

        return ResponseEntity.ok(LoginResponse.builder()
                .sessionId(session.getId())
                .userId(user.getUserId())
                .email(user.getEmail())
                .username(user.getUsername())
                .nickname(user.getNickname())
                .build());
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
