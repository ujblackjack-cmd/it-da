package com.project.itda.domain.admin.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecentUserResponse {
    private Long userId;
    private String username;
    private String email;
    private LocalDateTime createdAt;
    private String status;
}