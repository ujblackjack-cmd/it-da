package com.project.itda.domain.user.controller;

import com.project.itda.domain.user.dto.request.UserContextDTO;
import com.project.itda.domain.user.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:5173", "http://localhost:8000"})
public class UserContextController {

    private final UserService userService;

    /**
     * 사용자 컨텍스트 조회 (FastAPI AI 서버용)
     * GET /api/users/{userId}/context
     */
    @GetMapping("/{userId}/context")
    public ResponseEntity<UserContextDTO> getUserContext(@PathVariable Long userId) {
        UserContextDTO context = userService.getUserContext(userId);
        return ResponseEntity.ok(context);
    }
}