package com.project.itda.domain.user.controller;

import com.project.itda.domain.user.dto.request.UserSettingUpdateRequest;
import com.project.itda.domain.user.dto.response.UserSettingResponse;
import com.project.itda.domain.user.service.UserSettingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/users/{userId}/setting")
@RequiredArgsConstructor
public class UserSettingController {

    private final UserSettingService userSettingService;

    @GetMapping
    public ResponseEntity<UserSettingResponse> getSetting(@PathVariable Long userId) {
        log.info("사용자 설정 조회 요청: userId={}", userId);
        UserSettingResponse response = userSettingService.getSetting(userId);
        return ResponseEntity.ok(response);
    }

    @PutMapping
    public ResponseEntity<UserSettingResponse> updateSetting(
            @PathVariable Long userId,
            @Valid @RequestBody UserSettingUpdateRequest request) {
        log.info("사용자 설정 수정 요청: userId={}", userId);
        UserSettingResponse response = userSettingService.updateSetting(userId, request);
        return ResponseEntity.ok(response);
    }
}