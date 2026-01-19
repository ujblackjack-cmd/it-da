package com.project.itda.domain.user.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class UserCandidateResponse {
    private Long userId;
    private String username;
    private String email;
    private String profileImageUrl;
    private Boolean isPublic;
}
