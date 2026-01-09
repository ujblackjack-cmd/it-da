package com.project.itda.domain.user.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum TimePreference {
    MORNING("오전", "Morning", "06:00 - 12:00"),
    AFTERNOON("오후", "Afternoon", "12:00 - 18:00"),
    EVENING("저녁", "Evening", "18:00 - 24:00"),
    FLEXIBLE("유연", "Flexible", "시간 상관없어요");

    private final String korean;
    private final String english;
    private final String timeRange;

    public boolean isInTimeRange(int hour) {
        return switch (this) {
            case MORNING -> hour >= 6 && hour < 12;
            case AFTERNOON -> hour >= 12 && hour < 18;
            case EVENING -> hour >= 18 || hour < 6;
            case FLEXIBLE -> true;
        };
    }
}