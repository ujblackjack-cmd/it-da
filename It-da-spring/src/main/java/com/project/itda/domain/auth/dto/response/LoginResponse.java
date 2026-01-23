package com.project.itda.domain.auth.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoginResponse {
    private String userType;
    private String sessionId;

    // 일반 사용자 필드
    private Long userId;
    private String email;
    private String username;
    private String nickname;

    // 관리자 필드
    private Long adminId;
    private String role;
}