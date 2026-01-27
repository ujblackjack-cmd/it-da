package com.project.itda.domain.auth.dto;

import com.project.itda.domain.user.entity.User;
import lombok.Builder;
import lombok.Getter;
import lombok.ToString;

import java.io.Serializable;

@Getter
@ToString
public class SessionUser implements Serializable {
    private static final long serialVersionUID = 1L;

    private Long userId;        // ✅ 추가 (VoteController에서 필요)
    private String name;
    private String email;
    private String username;    // ✅ 추가
    private String nickname;    // ✅ 추가
    private String picture;

    // ✅ 기존 생성자 (하위 호환성 유지)
    public SessionUser(User user) {
        this.userId = user.getUserId();
        this.name = user.getUsername();
        this.email = user.getEmail();
        this.username = user.getUsername();
        this.nickname = user.getNickname();
        this.picture = user.getProfileImageUrl();
    }

    // ✅ Builder 패턴 추가 (OAuth2SuccessHandler에서 사용)
    @Builder
    public SessionUser(Long userId, String email, String username, String nickname, String picture) {
        this.userId = userId;
        this.name = username;
        this.email = email;
        this.username = username;
        this.nickname = nickname;
        this.picture = picture;
    }

    public SessionUser(Long userId, String email, String username, String nickname) {
        this.userId = userId;
        this.email = email;
        this.username = username;
        this.nickname = nickname;
    }
}