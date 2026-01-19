package com.project.itda.domain.user.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class ProfileLookupResponse {
    private String type; // "single" | "multiple"
    private UserProfileResponse profile; // type=single일 때만
    private List<UserCandidateResponse> candidates; // type=multiple일 때만
}
