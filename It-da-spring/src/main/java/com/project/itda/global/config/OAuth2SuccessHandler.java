package com.project.itda.global.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Slf4j
@Component
public class OAuth2SuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request,
                                        HttpServletResponse response,
                                        Authentication authentication) throws IOException {

        HttpSession session = request.getSession();

        log.info("✅ OAuth2 로그인 성공");
        log.info("Session ID: {}", session.getId());
        log.info("userId: {}", session.getAttribute("userId"));
        log.info("email: {}", session.getAttribute("email"));

        String targetUrl = "http://localhost:3000/auth/callback";
        getRedirectStrategy().sendRedirect(request, response, targetUrl);
    }
}