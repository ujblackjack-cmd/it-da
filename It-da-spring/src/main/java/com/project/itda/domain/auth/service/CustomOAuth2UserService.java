package com.project.itda.domain.auth.service;

import com.project.itda.domain.user.entity.User;
import com.project.itda.domain.user.enums.UserStatus;
import com.project.itda.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class CustomOAuth2UserService extends DefaultOAuth2UserService {

    private final UserRepository userRepository;

    @Override
    @Transactional
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2User oAuth2User = super.loadUser(userRequest);

        log.info("==================== OAuth2 사용자 정보 로드 ====================");

        String provider = userRequest.getClientRegistration().getRegistrationId(); // kakao, naver, google
        String providerId = oAuth2User.getAttribute("id") != null
                ? oAuth2User.getAttribute("id").toString()
                : null;

        String email = extractEmail(oAuth2User, provider);
        String nickname = extractNickname(oAuth2User, provider);
        String profileImage = extractProfileImage(oAuth2User, provider);

        log.info("Provider: {}, ProviderId: {}, Email: {}", provider, providerId, email);

        // ✅ 사용자 저장 또는 업데이트
        User user = saveOrUpdate(email, nickname, profileImage, provider, providerId);

        return oAuth2User;
    }

    /**
     * ✅ 사용자 저장 또는 업데이트
     */
    private User saveOrUpdate(String email, String nickname, String profileImage,
                              String provider, String providerId) {

        User user = userRepository.findByEmail(email)
                .map(existingUser -> updateExistingUser(existingUser, nickname, profileImage))
                .orElseGet(() -> createNewUser(email, nickname, profileImage, provider, providerId));

        return userRepository.save(user);
    }

    /**
     * ✅ 기존 사용자 업데이트
     */
    private User updateExistingUser(User user, String nickname, String profileImage) {
        user.setNickname(nickname);
        user.setProfileImageUrl(profileImage);
        user.setLastLoginAt(LocalDateTime.now());
        log.info("✅ 기존 사용자 업데이트: {}", user.getEmail());
        return user;
    }

    /**
     * ✅ 신규 사용자 생성 (비밀번호 없이!)
     */
    private User createNewUser(String email, String nickname, String profileImage,
                               String provider, String providerId) {

        User newUser = User.builder()
                .email(email)
                .username(nickname)
                .nickname(nickname)
                .profileImageUrl(profileImage)
                .provider(provider)
                .providerId(providerId)
                .emailVerified(true)
                .isPublic(true)
                .passwordHash(null)  // ✅ 소셜 로그인은 비밀번호 없음!
                .status(UserStatus.ACTIVE)
                .lastLoginAt(LocalDateTime.now())
                .build();

        log.info("✅ 신규 사용자 생성: {}", email);
        return newUser;
    }

    /**
     * ✅ 이메일 추출
     */
    private String extractEmail(OAuth2User oAuth2User, String provider) {
        switch (provider.toLowerCase()) {
            case "kakao":
                Map<String, Object> kakaoAccount = oAuth2User.getAttribute("kakao_account");
                return kakaoAccount != null ? (String) kakaoAccount.get("email") : null;

            case "naver":
                Map<String, Object> naverResponse = oAuth2User.getAttribute("response");
                return naverResponse != null ? (String) naverResponse.get("email") : null;

            case "google":
            default:
                return oAuth2User.getAttribute("email");
        }
    }

    /**
     * ✅ 닉네임 추출
     */
    private String extractNickname(OAuth2User oAuth2User, String provider) {
        switch (provider.toLowerCase()) {
            case "kakao":
                Map<String, Object> properties = oAuth2User.getAttribute("properties");
                return properties != null ? (String) properties.get("nickname") : "사용자";

            case "naver":
                Map<String, Object> naverResponse = oAuth2User.getAttribute("response");
                return naverResponse != null ? (String) naverResponse.get("nickname") : "사용자";

            case "google":
            default:
                return oAuth2User.getAttribute("name");
        }
    }

    /**
     * ✅ 프로필 이미지 추출
     */
    private String extractProfileImage(OAuth2User oAuth2User, String provider) {
        switch (provider.toLowerCase()) {
            case "kakao":
                Map<String, Object> properties = oAuth2User.getAttribute("properties");
                return properties != null ? (String) properties.get("profile_image") : null;

            case "naver":
                Map<String, Object> naverResponse = oAuth2User.getAttribute("response");
                return naverResponse != null ? (String) naverResponse.get("profile_image") : null;

            case "google":
            default:
                return oAuth2User.getAttribute("picture");
        }
    }
}