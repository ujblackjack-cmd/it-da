package com.project.itda.domain.user.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum LeadershipType {
    LEADER("주도형", "Leader", "모임을 이끄는 것을 좋아해요"),
    FOLLOWER("참여형", "Follower", "편하게 참여하는 것을 선호해요");

    private final String korean;
    private final String english;
    private final String description;
}