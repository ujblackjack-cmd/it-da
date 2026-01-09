package com.project.itda.domain.user.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ProfileVisibility {
    PUBLIC("전체공개", "Public", "모든 사람이 볼 수 있어요"),
    FRIENDS("친구공개", "Friends", "팔로우한 사람만 볼 수 있어요"),
    PRIVATE("비공개", "Private", "나만 볼 수 있어요");

    private final String korean;
    private final String english;
    private final String description;

    public boolean canView(boolean isFriend, boolean isOwner) {
        return switch (this) {
            case PUBLIC -> true;
            case FRIENDS -> isFriend || isOwner;
            case PRIVATE -> isOwner;
        };
    }
}