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

        if (session != null && session.getAttribute("user") != null) {
            try {
                // ✅ 2. 올바른 캐스팅 순서: Object -> SessionUser -> Long
                SessionUser sessionUser = (SessionUser) session.getAttribute("user");
                Long userId = sessionUser.getUserId();

                // DB 조회 및 인증 객체 생성
                userRepository.findById(userId).ifPresent(user -> {
                    var auth = new UsernamePasswordAuthenticationToken(
                            userId,
                            null,
                            List.of()
                    );
                    auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(auth);
                    log.info("✅ SecurityContext 설정 완료: userId={}", userId);
                });
            } catch (ClassCastException e) {
                log.error("❌ 세션 캐스팅 오류: 세션에 저장된 객체 타입이 SessionUser가 아닙니다.", e);
            }
        }

        filterChain.doFilter(request, response);
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        // ✅ 웹소켓 경로 추가!
        return path.startsWith("/uploads/")
                || path.startsWith("/ws/")
                || path.startsWith("/ws-stomp/")
                || path.startsWith("/api/public/");
    }}
