package com.project.itda.domain.social.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
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
    private boolean isFollowing;
    @JsonProperty("isFollowing")
    public boolean isFollowing() {
        return isFollowing;
    }
}