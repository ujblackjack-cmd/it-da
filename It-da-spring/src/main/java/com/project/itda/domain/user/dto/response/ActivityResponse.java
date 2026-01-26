// src/main/java/com/project/itda/domain/user/dto/response/ActivityResponse.java
package com.project.itda.domain.user.dto.response;

import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 활동 기록 응답 DTO
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ActivityResponse {

    private Long id;

    /**
     * 활동 타입: PARTICIPATION, REVIEW, BADGE, MEETING_CREATED
     */
    private String type;

    /**
     * 활동 제목
     */
    private String title;

    /**
     * 활동 설명
     */
    private String description;

    /**
     * 아이콘 (이모지)
     */
    private String icon;

    /**
     * 날짜 (yyyy.MM.dd 형식)
     */
    private String date;

    /**
     * 정렬용 타임스탬프 (JSON 응답에서 제외)
     */
    @JsonIgnore
    private LocalDateTime timestamp;

    /**
     * 관련 ID (모임ID, 배지ID 등)
     */
    private Long relatedId;
}