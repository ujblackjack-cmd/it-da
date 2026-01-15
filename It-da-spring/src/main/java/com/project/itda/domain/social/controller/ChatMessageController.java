package com.project.itda.domain.social.controller;

import com.project.itda.domain.auth.dto.SessionUser;
import com.project.itda.domain.social.dto.response.ChatMessageResponse;
import com.project.itda.domain.social.entity.ChatMessage;
import com.project.itda.domain.social.service.ChatMessageService;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/social/messages")
@RequiredArgsConstructor
public class ChatMessageController {

    private final ChatMessageService chatMessageService;
    private final HttpSession  httpSession;

    // 특정 채팅방의 이전 메시지 내역 가져오기
    @GetMapping("/{chatRoomId}")
    public ResponseEntity<List<ChatMessageResponse>> getChatMessages(@PathVariable Long chatRoomId) {
        // chatMessageService에서 DTO 변환 로직이 있는 getChatMessages를 호출합니다.
        return ResponseEntity.ok(chatMessageService.getChatMessages(chatRoomId));
    }
    @PostMapping
    public ResponseEntity<?> sendMessage(@RequestBody Map<String, Object> payload) {
        SessionUser user = (SessionUser) httpSession.getAttribute("user");
        if (user == null) return ResponseEntity.status(401).build();

        Long chatRoomId = Long.valueOf(payload.get("chatRoomId").toString());
        String content = (String) payload.get("content");

        // ChatMessageService에 저장 로직이 구현되어 있어야 합니다.
        chatMessageService.saveMessage(user.getEmail(), chatRoomId, content);

        return ResponseEntity.ok("메시지 전송 성공");
    }
}