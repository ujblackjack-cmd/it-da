package com.project.itda.domain.user.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum FrequencyType {
    REGULAR("정기적", "Regular", "규칙적인 만남을 선호해요"),
    SPONTANEOUS("즉흥적", "Spontaneous", "그때그때 만나는 것을 좋아해요");

    private final String korean;
    private final String english;
    private final String description;
}