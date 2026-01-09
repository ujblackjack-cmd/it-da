package com.project.itda.domain.user.controller;

import com.project.itda.domain.user.dto.request.UserPreferenceRequest;
import com.project.itda.domain.user.dto.response.UserPreferenceResponse;
import com.project.itda.domain.user.service.UserPreferenceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/users/{userId}/preference")
@RequiredArgsConstructor
public class UserPreferenceController {

    private final UserPreferenceService userPreferenceService;

    @PostMapping
    public ResponseEntity<UserPreferenceResponse> createOrUpdatePreference(
            @PathVariable Long userId,
            @Valid @RequestBody UserPreferenceRequest request) {
        log.info("사용자 선호도 설정 요청: userId={}", userId);
        UserPreferenceResponse response = userPreferenceService.createOrUpdatePreference(userId, request);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<UserPreferenceResponse> getPreference(@PathVariable Long userId) {
        log.info("사용자 선호도 조회 요청: userId={}", userId);
        UserPreferenceResponse response = userPreferenceService.getPreference(userId);
        return ResponseEntity.ok(response);
    }
}