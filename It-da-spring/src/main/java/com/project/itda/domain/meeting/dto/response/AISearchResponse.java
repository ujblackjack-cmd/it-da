package com.project.itda.domain.meeting.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * FastAPI AI 서버 전용 Response DTO
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AISearchResponse {
    private List<AIMeetingDTO> meetings;
    private Integer totalCount;
}

