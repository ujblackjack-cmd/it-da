package com.project.itda.domain.user.dto.request;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class UserUpdateRequest {
    private String username;
    private String phone;
    private String address;
    private String profileImageUrl;
    private String bio;
    private String gender;
    private String mbti;
    private String interests;    // ✅ 추가
    private Boolean isPublic;    // ✅ 추가
}