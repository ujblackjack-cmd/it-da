package com.project.itda.domain.user.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum BudgetType {
    VALUE("가성비", "Value", "합리적인 가격을 중요하게 생각해요"),
    QUALITY("품질", "Quality", "가격보다 품질을 우선해요");

    private final String korean;
    private final String english;
    private final String description;
}