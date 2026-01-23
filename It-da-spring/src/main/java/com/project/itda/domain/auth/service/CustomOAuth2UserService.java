package com.project.itda.domain.auth.service;

import com.project.itda.domain.auth.dto.OAuthAttributes;
import com.project.itda.domain.auth.dto.SessionUser;
import com.project.itda.domain.user.entity.User;
import com.project.itda.domain.user.entity.UserPreference;
import com.project.itda.domain.user.entity.UserSetting;
import com.project.itda.domain.user.enums.*;
import com.project.itda.domain.user.repository.UserRepository;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserService;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;

@Service
@RequiredArgsConstructor
@Slf4j
public class CustomOAuth2UserService implements OAuth2UserService<OAuth2UserRequest, OAuth2User> {

    private final UserRepository userRepository;
    private final HttpSession httpSession;

    @Override
    @Transactional
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2UserService<OAuth2UserRequest, OAuth2User> delegate = new DefaultOAuth2UserService();
        OAuth2User oAuth2User = delegate.loadUser(userRequest);

        // 1. 서비스 구분 (google, naver, kakao)
        String registrationId = userRequest.getClientRegistration().getRegistrationId();

        // 2. OAuth2 로그인 진행 시 키가 되는 필드값 (PK)
        String userNameAttributeName = userRequest.getClientRegistration()
                .getProviderDetails().getUserInfoEndpoint().getUserNameAttributeName();

        // 3. OAuth2UserService를 통해 가져온 OAuth2User의 attribute를 담을 클래스
        OAuthAttributes attributes = OAuthAttributes.of(registrationId, userNameAttributeName, oAuth2User.getAttributes());

        // 4. 사용자 저장 및 업데이트
        User user = saveOrUpdate(attributes);

        // 5. Redis 세션에 사용자 정보 저장 (SessionUser DTO 사용)
        httpSession.setAttribute("user", new SessionUser(user));

        return new DefaultOAuth2User(
                Collections.singleton(new SimpleGrantedAuthority("ROLE_USER")),
                attributes.getAttributes(),
                attributes.getNameAttributeKey()
        );
    }

    private User saveOrUpdate(OAuthAttributes attributes) {
        User user = userRepository.findByEmail(attributes.getEmail())
                .map(entity -> entity.updateSocialInfo(attributes.getName(), attributes.getPicture()))
                .orElseGet(() -> attributes.toEntity());

        // ✅ 소셜 로그인 시 마지막 로그인 시간 업데이트
        user.updateLastLogin();

        User savedUser = userRepository.save(user);

        // ✅ 세션에 명시적으로 저장
        httpSession.setAttribute("userId", savedUser.getUserId());
        httpSession.setAttribute("email", savedUser.getEmail());
        httpSession.setAttribute("username", savedUser.getUsername());
        httpSession.setAttribute("nickname", savedUser.getNickname());

        log.info("✅ 소셜 로그인 세션 저장 완료 - userId: {}, email: {}",
                savedUser.getUserId(), savedUser.getEmail());

        return savedUser;
    }
}