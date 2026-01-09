package com.project.itda.domain.user.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum Gender {
    M("남성", "Male"),
    F("여성", "Female"),
    N("선택안함", "None");

    private final String korean;
    private final String english;

    public static Gender fromString(String value) {
        if (value == null) return N;

        return switch (value.toUpperCase()) {
            case "M", "MALE", "남성" -> M;
            case "F", "FEMALE", "여성" -> F;
            default -> N;
        };
    }
}