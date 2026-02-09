package com.project.itda.global.config;

import com.project.itda.domain.auth.dto.SessionUser;
import com.project.itda.domain.user.entity.User;
import com.project.itda.domain.user.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class OAuth2SuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final UserRepository userRepository;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request,
                                        HttpServletResponse response,
                                        Authentication authentication) throws IOException {

        HttpSession session = request.getSession(true); // ✅ 세션 생성
        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();

        final String email = extractEmail(oAuth2User);

        log.info("==================== OAuth2 로그인 성공 ====================");
        log.info("추출된 email: {}", email);

        if (email == null) {
            throw new RuntimeException("OAuth2 인증 객체에서 이메일을 추출할 수 없습니다.");
        }

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다: " + email));

        // ✅ SessionUser 객체 생성
        SessionUser sessionUser = SessionUser.builder()
                .userId(user.getUserId())
                .email(user.getEmail())
                .username(user.getUsername())
                .nickname(user.getNickname() != null ? user.getNickname() : user.getUsername())
                .picture(user.getProfileImageUrl())
                .build();

        // ✅ 세션에 저장 (두 가지 방식 모두!)
        session.setAttribute("user", sessionUser); // SessionAuthenticationFilter용
        session.setAttribute("userId", user.getUserId()); // 개별 속성 (보험)
        session.setAttribute("email", user.getEmail());
        session.setAttribute("username", user.getUsername());
        session.setAttribute("nickname", user.getNickname() != null ? user.getNickname() : user.getUsername());

        log.info("✅ 세션 저장 완료:");
        log.info("  - 세션 ID: {}", session.getId());
        log.info("  - userId: {}", user.getUserId());
        log.info("  - email: {}", user.getEmail());
        log.info("  - SessionUser: {}", sessionUser);

        // ✅ 프론트엔드로 리다이렉트
        String targetUrl = "http://localhost:3000/auth/callback";
        log.info("리다이렉트: {}", targetUrl);

        getRedirectStrategy().sendRedirect(request, response, targetUrl);
    }

    /**
     * ✅ 이메일 추출 (카카오/네이버/구글 대응)
     */
    private String extractEmail(OAuth2User oAuth2User) {
        // 1. 기본 email 필드
        Object email = oAuth2User.getAttribute("email");
        if (email != null) return email.toString();

        // 2. 카카오 계정
        Map<String, Object> kakaoAccount = oAuth2User.getAttribute("kakao_account");
        if (kakaoAccount != null && kakaoAccount.get("email") != null) {
            return kakaoAccount.get("email").toString();
        }

        // 3. 네이버 계정
        Map<String, Object> naverResponse = oAuth2User.getAttribute("response");
        if (naverResponse != null && naverResponse.get("email") != null) {
            return naverResponse.get("email").toString();
        }

        return null;
    }
}