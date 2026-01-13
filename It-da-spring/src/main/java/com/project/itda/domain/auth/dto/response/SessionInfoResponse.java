package com.project.itda.domain.auth.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SessionInfoResponse {
    private Long userId;
    private String email;
    private String username;
    private String nickname;
}