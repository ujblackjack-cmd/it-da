package com.project.itda.domain.user.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum PurposeType {
    RELATIONSHIP("관계중심", "Relationship", "사람들과의 관계를 중요하게 생각해요"),
    TASK("과업중심", "Task", "활동 자체에 집중하는 것을 좋아해요");

    private final String korean;
    private final String english;
    private final String description;
}