package com.project.itda.domain.user.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum LocationType {
    INDOOR("실내", "Indoor", "실내 활동을 선호해요"),
    OUTDOOR("실외", "Outdoor", "야외 활동을 좋아해요");

    private final String korean;
    private final String english;
    private final String description;
}