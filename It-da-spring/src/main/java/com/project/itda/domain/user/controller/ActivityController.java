// src/main/java/com/project/itda/domain/user/controller/ActivityController.java
package com.project.itda.domain.user.controller;

import com.project.itda.domain.user.dto.response.ActivityResponse;
import com.project.itda.domain.user.service.ActivityService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 활동 기록 API
 */
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@Slf4j
public class ActivityController {

    private final ActivityService activityService;

    /**
     * 사용자 활동 기록 조회
     */
    @GetMapping("/{userId}/activities")
    public ResponseEntity<List<ActivityResponse>> getActivities(
            @PathVariable Long userId,
            @RequestParam(defaultValue = "20") int limit
    ) {
        log.info("📋 활동 기록 조회 - userId: {}, limit: {}", userId, limit);
        List<ActivityResponse> activities = activityService.getActivities(userId, limit);
        return ResponseEntity.ok(activities);
    }
}