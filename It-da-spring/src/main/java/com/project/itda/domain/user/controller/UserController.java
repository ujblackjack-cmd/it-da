package com.project.itda.domain.user.controller;

import com.project.itda.domain.meeting.entity.Meeting;
import com.project.itda.domain.meeting.repository.MeetingRepository;
import com.project.itda.domain.user.dto.request.UserSignupRequest;
import com.project.itda.domain.user.dto.request.UserUpdateRequest;
import com.project.itda.domain.user.dto.response.UserDetailResponse;
import com.project.itda.domain.user.dto.response.UserResponse;
import com.project.itda.domain.user.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final MeetingRepository meetingRepository;

    @PostMapping("/signup")
    public ResponseEntity<UserResponse> signup(@Valid @RequestBody UserSignupRequest request) {
        log.info("회원가입 요청: email={}", request.getEmail());
        UserResponse response = userService.signup(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{userId}")
    public ResponseEntity<UserDetailResponse> getUserDetail(@PathVariable Long userId) {
        log.info("사용자 상세 조회 요청: userId={}", userId);
        UserDetailResponse response = userService.getUserDetail(userId);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<List<UserResponse>> getAllUsers() {
        log.info("전체 사용자 조회 요청");
        List<UserResponse> responses = userService.getAllUsers();
        return ResponseEntity.ok(responses);
    }

    @PutMapping("/{userId}")
    public ResponseEntity<UserResponse> updateUser(
            @PathVariable Long userId,
            @Valid @RequestBody UserUpdateRequest request) {
        log.info("사용자 정보 수정 요청: userId={}", userId);
        UserResponse response = userService.updateUser(userId, request);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{userId}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long userId) {
        log.info("사용자 삭제 요청: userId={}", userId);
        userService.deleteUser(userId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{userId}/preferences2")
    public ResponseEntity<?> getUserPreferences(@PathVariable Long userId) {
        try {
            Map<String, Object> preferences = userService.getUserPreferences(userId);
            return ResponseEntity.ok(preferences);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * ✅ 내가 주최한 모임 목록 조회 (이미지 URL 포함)
     */
    @GetMapping("/{userId}/organized-meetings")
    public ResponseEntity<List<Map<String, Object>>> getOrganizedMeetings(@PathVariable Long userId) {
        log.info("📍 GET /api/users/{}/organized-meetings", userId);

        List<Meeting> meetings = meetingRepository.findByOrganizerUserId(userId);

        List<Map<String, Object>> result = meetings.stream()
                .filter(m -> m.getDeletedAt() == null)
                .map(m -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("meetingId", m.getMeetingId());
                    map.put("meetingTitle", m.getTitle());
                    map.put("dateTime", m.getMeetingTime());
                    map.put("location", m.getLocationName() != null ? m.getLocationName() : m.getLocationAddress());
                    map.put("statusText", m.getStatus() != null ? m.getStatus().name() : "RECRUITING");
                    map.put("currentParticipants", m.getCurrentParticipants());
                    map.put("maxParticipants", m.getMaxParticipants());
                    map.put("category", m.getCategory());
                    // ✅ 이미지 URL 추가!
                    map.put("imageUrl", m.getImageUrl());
                    return map;
                })
                .collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }
}