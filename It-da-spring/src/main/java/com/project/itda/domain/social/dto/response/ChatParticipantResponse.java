package com.project.itda.domain.social.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ChatParticipantResponse {
    private Long userId;
    private String username;
    private String nickname;
    private String email;
    private String profileImageUrl;
    private String role; // MEMBER, HOST 등
}