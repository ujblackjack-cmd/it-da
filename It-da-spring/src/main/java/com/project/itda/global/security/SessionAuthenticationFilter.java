package com.project.itda.global.security;

import com.project.itda.domain.auth.dto.SessionUser;
import com.project.itda.domain.user.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class SessionAuthenticationFilter extends OncePerRequestFilter {

    private final UserRepository userRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        HttpSession session = request.getSession(false);

        if (session != null) {
            // ✅ 1. SessionUser 객체로 저장된 경우
            SessionUser sessionUser = (SessionUser) session.getAttribute("user");

            if (sessionUser != null) {
                try {
                    Long userId = sessionUser.getUserId();

                    userRepository.findById(userId).ifPresent(user -> {
                        var auth = new UsernamePasswordAuthenticationToken(
                                userId,
                                null,
                                List.of()
                        );
                        auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                        SecurityContextHolder.getContext().setAuthentication(auth);
                        log.info("✅ SecurityContext 설정 완료: userId={} (타입: {})",
                                userId, userId.getClass().getSimpleName());
                    });
                } catch (ClassCastException e) {
                    log.error("❌ 세션 캐스팅 오류: 세션에 저장된 객체 타입이 SessionUser가 아닙니다.", e);
                }
            }
            // ✅ 2. 개별 속성으로 저장된 경우 (대체 로직)
            else {
                Object userIdObj = session.getAttribute("userId");
                if (userIdObj != null) {
                    try {
                        Long userId = (Long) userIdObj;

                        userRepository.findById(userId).ifPresent(user -> {
                            var auth = new UsernamePasswordAuthenticationToken(
                                    userId,
                                    null,
                                    List.of()
                            );
                            auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                            SecurityContextHolder.getContext().setAuthentication(auth);
                            log.info("✅ SecurityContext 설정 완료 (개별 속성): userId={}", userId);
                        });
                    } catch (ClassCastException e) {
                        log.error("❌ userId 캐스팅 오류", e);
                    }
                } else {
                    log.debug("⚠️ 세션 없음 또는 user 속성 없음");
                }
            }
        } else {
            log.debug("⚠️ 세션이 존재하지 않음");
        }

        filterChain.doFilter(request, response);
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return path.startsWith("/uploads/")
                || path.startsWith("/ws/")
                || path.startsWith("/ws-stomp/")
                || path.startsWith("/api/public/")
                || path.startsWith("/login")
                || path.startsWith("/oauth2")
                || path.startsWith("/error");
    }
}