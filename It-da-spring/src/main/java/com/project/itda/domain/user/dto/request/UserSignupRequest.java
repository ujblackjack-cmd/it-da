package com.project.itda.domain.user.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class UserSignupRequest {

    @NotBlank(message = "이메일은 필수입니다")
    @Email(message = "이메일 형식이 올바르지 않습니다")
    private String email;

    @NotBlank(message = "비밀번호는 필수입니다")
    private String password;

    @NotBlank(message = "이름은 필수입니다")
    private String username;

    private String phone;

    // ✅ 주소 관련 필드 추가
    private String address;
    private Double latitude;
    private Double longitude;

    // ✅ Preferences 추가
    @Valid
    private UserPreferenceRequest preferences;
}