package com.project.itda.domain.social.controller;

import com.project.itda.domain.auth.dto.SessionUser;
import com.project.itda.domain.social.dto.response.ChatMessageResponse;
import com.project.itda.domain.social.entity.ChatMessage;
import com.project.itda.domain.social.repository.ChatMessageRepository;
import com.project.itda.domain.social.service.ChatMessageService;
import com.project.itda.domain.social.service.ChatRoomService;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessageSendingOperations;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/social/messages")
@RequiredArgsConstructor
@Slf4j
public class ChatMessageController {

    private final ChatMessageService chatMessageService;
    private final HttpSession  httpSession;
    private final SimpMessageSendingOperations messagingTemplate;
    private final ChatRoomService  chatRoomService;
    private final ChatMessageRepository chatMessageRepository;

    // 특정 채팅방의 이전 메시지 내역 가져오기
    @GetMapping("/{chatRoomId}")
    public ResponseEntity<List<ChatMessageResponse>> getChatMessages( @PathVariable Long chatRoomId,
                                                                      @RequestParam(defaultValue = "0") int page,
                                                                      @RequestParam(defaultValue = "50") int size) {
        // chatMessageService에서 DTO 변환 로직이 있는 getChatMessages를 호출합니다.
        return ResponseEntity.ok(chatMessageService.getChatMessages(chatRoomId, page, size));
    }
    @PostMapping
    public ResponseEntity<?> sendMessage(@RequestBody Map<String, Object> payload) {
        SessionUser user = (SessionUser) httpSession.getAttribute("user");
        if (user == null) return ResponseEntity.status(401).build();

        Long chatRoomId = Long.valueOf(payload.get("chatRoomId").toString());
        String content = (String) payload.get("content");
// ✅ 1. 메시지 타입 추출 (기본값 TEXT)
        com.project.itda.domain.social.enums.MessageType type =
                com.project.itda.domain.social.enums.MessageType.valueOf(payload.getOrDefault("type", "TEXT").toString());

        // ✅ 2. 메타데이터 추출
        Object rawMetadata = payload.get("metadata");
        Map<String, Object> metadata = (rawMetadata instanceof Map) ? (Map<String, Object>) rawMetadata : null;

        int unreadCount = chatRoomService.getUnreadCount(chatRoomId, java.time.LocalDateTime.now());

        // ✅ 3. 타입이 BILL이거나 메타데이터가 있는 경우 saveMessageWithMetadata 호출
        // 이 메서드가 내부적으로 진짜 DB ID를 metadata에 심어줍니다.
        if (type == com.project.itda.domain.social.enums.MessageType.BILL || metadata != null) {
            chatMessageService.saveMessageWithMetadata(user.getEmail(), chatRoomId, content, type, metadata,unreadCount);
        } else {
            chatMessageService.saveMessage(user.getEmail(), chatRoomId, content, type,unreadCount);
        }
        return ResponseEntity.ok("메시지 전송 성공");
    }
    @PostMapping(value="/{messageId}/bill/check", produces = "application/json")
    public ResponseEntity<?> checkBillPaid(@PathVariable Long messageId, @RequestBody Map<String, Object> payload) {
        try {
            // ✅ 1. 심볼 오류 해결: payload에서 userId를 꺼내 targetUserId에 할당
            if (!payload.containsKey("userId")) {
                return ResponseEntity.badRequest().body("userId가 누락되었습니다.");
            }
            Long targetUserId = Long.valueOf(payload.get("userId").toString());

            // 2. 서비스 로직 호출 (상태 토글 및 DB 반영)
            Map<String, Object> updatedMetadata = chatMessageService.updateBillStatus(messageId, targetUserId);

            // 3. 원본 메시지 정보 조회 (발송자 유지 및 룸 ID 획득)
            ChatMessage originalMsg = chatMessageRepository.findById(messageId)
                    .orElseThrow(() -> new RuntimeException("메시지 없음"));
            Long roomId = originalMsg.getChatRoom().getId();

            // 4. 소켓 Payload 구성
            Map<String, Object> socketPayload = new HashMap<>();
            socketPayload.put("type", "BILL_UPDATE");
            socketPayload.put("targetMessageId", messageId);
            socketPayload.put("metadata", updatedMetadata);

            // ✅ 2. 익명 방지: 원본 메시지의 발송자 정보를 그대로 다시 실어 보냄
            socketPayload.put("senderId", originalMsg.getSender().getUserId());
            socketPayload.put("senderNickname", originalMsg.getSender().getNickname());

            messagingTemplate.convertAndSend("/topic/room/" + roomId, socketPayload);
            return ResponseEntity.ok(updatedMetadata);
        } catch (Exception e) {
            log.error("정산 체크 중 에러 발생: ", e);
            return ResponseEntity.status(500).body(e.getMessage());
        }
    }
}