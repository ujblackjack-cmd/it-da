package com.project.itda.domain.social.controller;

import com.project.itda.domain.social.enums.MessageType;
import com.project.itda.domain.social.repository.ChatParticipantRepository;
import com.project.itda.domain.social.service.ChatMessageService;
import com.project.itda.domain.social.service.ChatRoomService;
import com.project.itda.domain.user.entity.User;
import com.project.itda.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessageSendingOperations;
import org.springframework.stereotype.Controller;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Controller
@RequiredArgsConstructor
public class ChatStompController {

    private final ChatParticipantRepository chatParticipantRepository;
    private final SimpMessageSendingOperations messagingTemplate;
    private final ChatMessageService chatMessageService;
    private final ChatRoomService chatRoomService;
    private final UserRepository userRepository;

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

            String typeStr = message.getOrDefault("type", "TALK").toString();
            MessageType messageType;
            try {
                messageType = MessageType.valueOf(typeStr);
            } catch (IllegalArgumentException e) {
                messageType = MessageType.TALK;
            }

            Object rawMetadata = message.get("metadata");
            @SuppressWarnings("unchecked")
            Map<String, Object> metadata = (rawMetadata instanceof Map)
                    ? (Map<String, Object>) rawMetadata
                    : null;

            // ✅ 한 번만 저장!
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

            // ✅ 저장 확인
            if (savedMsg == null || savedMsg.getId() == null) {
                System.err.println("❌ 메시지 저장 실패!");
                return;
            }

            System.out.println("✅ 메시지 저장 완료 - ID: " + savedMsg.getId());

            chatRoomService.updateLastReadAt(roomId, email);

            // ✅ 응답 객체 생성
            Map<String, Object> response = new HashMap<>();
            response.put("messageId", savedMsg.getId());
            response.put("senderId", sender.getUserId());
            response.put("senderNickname", finalNickname);
            response.put("content", message.get("content"));
            response.put("type", messageType.name());
            response.put("sentAt", savedMsg.getCreatedAt().toString());
            response.put("unreadCount", initialUnreadCount);

            if (metadata != null && !metadata.isEmpty()) {
                response.put("metadata", metadata);
            }

            // ✅ 한 번만 전송!
            messagingTemplate.convertAndSend("/topic/room/" + roomId, response);

            System.out.println("✅ 메시지 전송 완료 - messageId: " + savedMsg.getId());

        } catch (Exception e) {
            System.err.println("❌ 에러 발생: " + e.getMessage());
            e.printStackTrace();
        }
    }

    @MessageMapping("/chat/read/{roomId}")
    public void markAsRead(@DestinationVariable Long roomId, Map<String, String> payload, SimpMessageHeaderAccessor headerAccessor) {
        String email = payload.get("email");

        // 세션에 정보 저장
        headerAccessor.getSessionAttributes().put("userEmail", email);
        headerAccessor.getSessionAttributes().put("roomId", roomId);

        chatRoomService.userJoined(roomId, email);
    }
}