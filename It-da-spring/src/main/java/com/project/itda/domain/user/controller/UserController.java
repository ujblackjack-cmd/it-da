package com.project.itda.domain.user.controller;

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

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/users")  // ✅ /api 추가!
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

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
}