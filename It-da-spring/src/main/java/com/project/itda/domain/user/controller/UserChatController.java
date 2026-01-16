package com.project.itda.domain.user.controller;

import com.project.itda.domain.user.dto.request.UserChatSendRequest;
import com.project.itda.domain.user.dto.response.UserChatMessageResponse;
import com.project.itda.domain.user.dto.response.UserChatRoomResponse;
import com.project.itda.domain.user.service.UserChatService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/user-chat")
@RequiredArgsConstructor
public class UserChatController {

    private final UserChatService chatService;

    /**
     * ✅ 채팅방 생성 또는 가져오기
     */
    @PostMapping("/room")
    public ResponseEntity<UserChatRoomResponse> getOrCreateRoom(
            @RequestParam Long userId,
            @RequestParam Long targetUserId) {
        log.info("💬 채팅방 생성/조회: userId={}, targetUserId={}", userId, targetUserId);
        return ResponseEntity.ok(chatService.getOrCreateChatRoom(userId, targetUserId));
    }

    /**
     * ✅ 채팅방 정보 조회
     */
    @GetMapping("/room/{roomId}")
    public ResponseEntity<UserChatRoomResponse> getChatRoom(
            @PathVariable Long roomId,
            @RequestParam Long userId) {
        log.info("💬 채팅방 정보 조회: roomId={}, userId={}", roomId, userId);
        return ResponseEntity.ok(chatService.getChatRoom(roomId, userId));
    }

    /**
     * ✅ 내 채팅방 목록
     */
    @GetMapping("/rooms")
    public ResponseEntity<List<UserChatRoomResponse>> getMyChatRooms(@RequestParam Long userId) {
        log.info("💬 채팅방 목록 조회: userId={}", userId);
        return ResponseEntity.ok(chatService.getMyChatRooms(userId));
    }

    /**
     * ✅ 채팅방 메시지 목록
     */
    @GetMapping("/room/{roomId}/messages")
    public ResponseEntity<List<UserChatMessageResponse>> getMessages(
            @PathVariable Long roomId,
            @RequestParam Long userId) {
        log.info("💬 메시지 목록 조회: roomId={}, userId={}", roomId, userId);
        return ResponseEntity.ok(chatService.getMessages(roomId, userId));
    }

    /**
     * ✅ 메시지 전송
     */
    @PostMapping("/room/{roomId}/message")
    public ResponseEntity<UserChatMessageResponse> sendMessage(
            @PathVariable Long roomId,
            @RequestParam Long userId,
            @RequestBody UserChatSendRequest request) {
        log.info("💬 메시지 전송: roomId={}, userId={}, content={}", roomId, userId, request.getContent());
        return ResponseEntity.ok(chatService.sendMessage(roomId, userId, request.getContent()));
    }

    /**
     * ✅ 메시지 읽음 처리
     */
    @PostMapping("/room/{roomId}/read")
    public ResponseEntity<Map<String, String>> markAsRead(
            @PathVariable Long roomId,
            @RequestParam Long userId) {
        log.info("👁️ 메시지 읽음 처리: roomId={}, userId={}", roomId, userId);
        chatService.markAsRead(roomId, userId);
        return ResponseEntity.ok(Map.of("message", "읽음 처리 완료"));
    }

    /**
     * ✅ 메시지 전송 가능 여부 체크
     */
    @GetMapping("/can-send")
    public ResponseEntity<Map<String, Object>> canSendMessage(
            @RequestParam Long senderId,
            @RequestParam Long receiverId) {
        boolean canSend = chatService.canSendMessage(senderId, receiverId);
        return ResponseEntity.ok(Map.of(
                "canSend", canSend,
                "message", canSend ? "메시지 전송 가능" : "비공개 계정은 서로 팔로우 상태여야 합니다."
        ));
    }

    /**
     * ✅ 안읽은 메시지 총 개수
     */
    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Integer>> getUnreadCount(@RequestParam Long userId) {
        return ResponseEntity.ok(Map.of("unreadCount", chatService.getTotalUnreadCount(userId)));
    }
}