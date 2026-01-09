package com.project.itda.domain.user.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum EnergyType {
    EXTROVERT("외향형", "Extrovert", "사람들과 어울리는 것을 좋아해요"),
    INTROVERT("내향형", "Introvert", "조용한 환경을 선호해요");

    private final String korean;
    private final String english;
    private final String description;
}