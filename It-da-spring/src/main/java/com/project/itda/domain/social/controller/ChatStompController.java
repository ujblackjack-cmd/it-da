package com.project.itda.domain.social.controller;

import com.project.itda.domain.social.entity.ChatMessage;
import com.project.itda.domain.social.enums.MessageType;
import com.project.itda.domain.social.repository.ChatMessageRepository;
import com.project.itda.domain.social.repository.ChatParticipantRepository;
import com.project.itda.domain.social.service.ChatMessageService;
import com.project.itda.domain.social.service.ChatRoomService;
import com.project.itda.domain.user.entity.User;
import com.project.itda.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessageSendingOperations;
import org.springframework.stereotype.Controller;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@Controller
@RequiredArgsConstructor
public class ChatStompController {

    private final ChatParticipantRepository chatParticipantRepository;
    private final SimpMessageSendingOperations messagingTemplate;
    private final ChatMessageService chatMessageService;
    private final ChatRoomService chatRoomService;
    private final UserRepository userRepository;
    private final ChatMessageRepository chatMessageRepository;


    @MessageMapping("/chat/send/{roomId}")
    public void sendMessage(@DestinationVariable Long roomId, Map<String, Object> message, SimpMessageHeaderAccessor headerAccessor) {
        try {
            String email = (String) message.get("email");
            User sender = userRepository.findByEmail(email)
                    .orElseThrow(() -> new IllegalArgumentException("유저를 찾을 수 없습니다: " + email));

            long totalParticipants = chatParticipantRepository.countByChatRoomId(roomId);
            int initialUnreadCount = (int) Math.max(0, totalParticipants - 1);

            String finalNickname = (sender.getNickname() != null && !sender.getNickname().trim().isEmpty())
                    ? sender.getNickname()
                    : sender.getUsername();

            String typeStr = message.getOrDefault("type", "TALK").toString().toUpperCase();
            MessageType messageType;

            try {
                messageType = MessageType.valueOf(typeStr);
            } catch (IllegalArgumentException e) {
                log.warn("⚠️ 알 수 없는 메시지 타입: {}, TALK으로 대체", typeStr);
                messageType = MessageType.TALK;
            }

            log.info("✅ 메시지 타입 변환 완료: {} → {}", typeStr, messageType);

            Object rawMetadata = message.get("metadata");
            @SuppressWarnings("unchecked")
            Map<String, Object> metadata = (rawMetadata instanceof Map)
                    ? (Map<String, Object>) rawMetadata
                    : null;

            com.project.itda.domain.social.entity.ChatMessage savedMsg;

            if (messageType == MessageType.BILL || (metadata != null && !metadata.isEmpty())) {
                savedMsg = chatMessageService.saveMessageWithMetadata(
                        email,
                        roomId,
                        (String) message.get("content"),
                        messageType,
                        metadata,
                        initialUnreadCount
                );
            } else {
                savedMsg = chatMessageService.saveMessage(
                        email,
                        roomId,
                        (String) message.get("content"),
                        messageType,
                        initialUnreadCount
                );
            }

            if (savedMsg == null || savedMsg.getId() == null) {
                log.error("❌ 메시지 저장 실패!");
                return;
            }

            log.info("✅ 메시지 저장 완료 - ID: {}, Type: {}", savedMsg.getId(), messageType);

            // ✅ 약간의 지연을 주어 READ 신호 처리 반영
            try {
                Thread.sleep(100);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }

            // ✅ 실시간 unreadCount 계산 (READ 신호 반영됨)
            int currentUnreadCount = chatMessageService.calculateUnreadCount(roomId, savedMsg.getId());

            // ✅ 응답 생성
            Map<String, Object> response = new HashMap<>();
            response.put("messageId", savedMsg.getId());
            response.put("senderId", sender.getUserId());
            response.put("senderNickname", finalNickname);
            response.put("content", message.get("content"));
            response.put("type", messageType.name());
            response.put("sentAt", savedMsg.getCreatedAt().toString());
            response.put("email", email);
            response.put("unreadCount", currentUnreadCount);

            if (metadata != null && !metadata.isEmpty()) {
                response.put("metadata", metadata);
            }

            messagingTemplate.convertAndSend("/topic/room/" + roomId, response);

            log.info("✅ 메시지 전송 완료 - messageId: {}, unreadCount: {}", savedMsg.getId(), currentUnreadCount);

        } catch (Exception e) {
            log.error("❌ 메시지 전송 중 에러 발생", e);
            throw new RuntimeException("메시지 전송 실패: " + e.getMessage());
        }
    }

    @MessageMapping("/chat/read/{roomId}")
    public void markAsRead(@DestinationVariable Long roomId, Map<String, String> payload, SimpMessageHeaderAccessor headerAccessor) {
        String email = payload.get("email");

        log.info("📖 READ 신호 수신: roomId={}, email={}", roomId, email);

        // 세션에 정보 저장
        headerAccessor.getSessionAttributes().put("userEmail", email);
        headerAccessor.getSessionAttributes().put("roomId", roomId);

        // ✅ 읽음 처리
        chatRoomService.userJoined(roomId, email);

        // ✅ 같은 채팅방의 다른 사용자들에게 READ 신호 브로드캐스트
        Map<String, Object> readSignal = new HashMap<>();
        readSignal.put("type", "READ");
        readSignal.put("email", email);
        readSignal.put("roomId", roomId);
        readSignal.put("timestamp", LocalDateTime.now().toString());

        messagingTemplate.convertAndSend("/topic/room/" + roomId, readSignal);

        log.info("✅ READ 신호 브로드캐스트 완료: roomId={}, email={}", roomId, email);
    }

    /**
     * 특정 메시지의 현재 unreadCount를 계산
     * = 메시지 생성 시각보다 lastReadAt이 이전인 참여자 수
     */
    public int calculateUnreadCount(Long roomId, Long messageId) {
        // 1. 메시지 조회
        ChatMessage message = chatMessageRepository.findById(messageId)
                .orElseThrow(() -> new IllegalArgumentException("메시지를 찾을 수 없습니다"));

        // 2. 이 메시지를 읽지 않은 참여자 수 계산
        long unreadCount = chatParticipantRepository.countByRoomIdAndLastReadAtBefore(
                roomId,
                message.getCreatedAt()
        );

        return (int) unreadCount;
    }


}