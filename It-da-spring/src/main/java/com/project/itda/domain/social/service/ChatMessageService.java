// src/main/java/com/project/itda/domain/social/service/ChatMessageService.java
package com.project.itda.domain.social.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.project.itda.domain.badge.event.ChatSentEvent;
import com.project.itda.domain.social.dto.response.ChatMessageResponse;
import com.project.itda.domain.social.entity.ChatMessage;
import com.project.itda.domain.social.entity.ChatRoom;
import com.project.itda.domain.social.enums.MessageType;
import com.project.itda.domain.social.repository.ChatMessageRepository;
import com.project.itda.domain.social.repository.ChatParticipantRepository;
import com.project.itda.domain.social.repository.ChatRoomRepository;
import com.project.itda.domain.user.entity.User;
import com.project.itda.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class ChatMessageService {
    private final ChatMessageRepository chatMessageRepository;
    private final UserRepository userRepository;
    private final ChatRoomRepository chatRoomRepository;
    private final ChatParticipantRepository chatParticipantRepository;
    private final ApplicationEventPublisher eventPublisher;  // ⭐ 추가!
    private final ChatRoomService chatRoomService;

    public List<ChatMessage> getMessagesByRoom(Long roomId) {
        return chatMessageRepository.findByChatRoomIdOrderByCreatedAtAsc(roomId);
    }

    @Transactional
    public ChatMessage saveMessage(String email, Long chatRoomId, String content, MessageType type, int unreadCount) {
        // 1. 보낸 사람 조회
        User sender = userRepository.findByEmail(email)
                .orElseThrow();

        // 2. 채팅방 조회
        ChatRoom room = chatRoomRepository.findById(chatRoomId)
                .orElseThrow();

        // 3. 메시지 엔티티 생성 및 저장
        ChatMessage message = ChatMessage.builder()
                .sender(sender)
                .chatRoom(room)
                .content(content)
                .type(type)
                .unreadCount(unreadCount)
                .build();

        ChatMessage saved = chatMessageRepository.save(message);

        // ⭐ 4. 배지 이벤트 발행! (채팅 전송 시)
        int totalChatCount = chatMessageRepository.countBySenderUserId(sender.getUserId());
        eventPublisher.publishEvent(new ChatSentEvent(sender.getUserId(), totalChatCount));

        return saved;
    }

    // 페이징을 지원하는 메서드
    public List<ChatMessageResponse> getChatMessages(Long roomId, int page, int size) {
        Page<ChatMessage> messagePage = chatMessageRepository
                .findByChatRoomIdOrderByCreatedAtDesc(roomId, PageRequest.of(page, size));

        List<ChatMessage> messages = new ArrayList<>(messagePage.getContent());
        Collections.reverse(messages);

        // 참여자들의 마지막 읽은 시간 리스트를 한 번에 조회
        List<LocalDateTime> lastReadTimes = chatParticipantRepository.findAllLastReadAtByRoomId(roomId);
        int totalParticipants = lastReadTimes.size();

        return messages.stream().map(msg -> {
            String nickname = msg.getSender().getNickname();
            String finalName = (nickname != null && !nickname.trim().isEmpty())
                    ? nickname : msg.getSender().getUsername();

            long readCount = lastReadTimes.stream()
                    .filter(lastRead -> lastRead != null && !lastRead.isBefore(msg.getCreatedAt()))
                    .count();

            int unreadCount = (int) (totalParticipants - readCount);

            return ChatMessageResponse.builder()
                    .messageId(msg.getId())
                    .senderId(msg.getSender().getUserId())
                    .senderNickname(finalName)
                    .content(msg.getContent())
                    .type(msg.getType())
                    .sentAt(msg.getCreatedAt())
                    .unreadCount(Math.max(0, unreadCount))
                    .metadata(msg.getMetadata())
                    .build();
        }).collect(Collectors.toList());
    }



    @Transactional
    public ChatMessage saveMessageWithMetadata(String email, Long chatRoomId, String content, MessageType type, Map<String, Object> metadata, int unreadCount) {
        User sender = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없음"));

        ChatRoom room = chatRoomRepository.findById(chatRoomId)
                .orElseThrow(() -> new RuntimeException("채팅방을 찾을 수 없음"));

        ChatMessage message = ChatMessage.builder()
                .sender(sender)
                .chatRoom(room)
                .content(content)
                .type(type)
                .metadata(metadata)
                .build();

        ChatMessage savedMessage = chatMessageRepository.save(message);

        if (type == MessageType.BILL && message.getMetadata() != null) {
            message.getMetadata().put("messageId", message.getId());
            message.updateMetadata(metadata);
        }

        // ⭐ 배지 이벤트 발행!
        int totalChatCount = chatMessageRepository.countBySenderUserId(sender.getUserId());
        eventPublisher.publishEvent(new ChatSentEvent(sender.getUserId(), totalChatCount));

        return savedMessage;
    }

    @Transactional
    public void updateVoteMetadata(Long roomId, Long voteId, Map<String, Object> metadata) {
        List<ChatMessage> messages = chatMessageRepository.findByChatRoomIdOrderByCreatedAtAsc(roomId);

        for (ChatMessage msg : messages) {
            if (msg.getType() == MessageType.POLL && msg.getMetadata() != null) {
                Object msgVoteId = msg.getMetadata().get("voteId");
                if (msgVoteId != null && String.valueOf(msgVoteId).equals(String.valueOf(voteId))) {
                    msg.updateMetadata(metadata);
                    break;
                }
            }
        }
    }

    @Transactional
    public Map<String, Object> updateBillStatus(Long messageId, Long targetUserId) {
        ChatMessage message = chatMessageRepository.findById(messageId)
                .orElseThrow(() -> new RuntimeException("메시지를 찾을 수 없음"));

        Map<String, Object> metadata = message.getMetadata();
        if (metadata == null || !metadata.containsKey("participants")) return null;

        ObjectMapper mapper = new ObjectMapper();
        try {
            List<Map<String, Object>> participants = mapper.convertValue(
                    metadata.get("participants"),
                    new TypeReference<List<Map<String, Object>>>() {}
            );

            boolean isUpdated = false;
            for (Map<String, Object> p : participants) {
                if (String.valueOf(p.get("userId")).equals(String.valueOf(targetUserId))) {
                    Object isPaidObj = p.get("isPaid");
                    boolean currentStatus = (isPaidObj instanceof Boolean) ? (Boolean) isPaidObj : false;
                    p.put("isPaid", !currentStatus);
                    isUpdated = true;
                    break;
                }
            }

            if (isUpdated) {
                metadata.put("participants", participants);
                message.updateMetadata(metadata);
                return metadata;
            }
        } catch (Exception e) {
            System.err.println("정산 데이터 변환 오류: " + e.getMessage());
            throw new RuntimeException("데이터 처리 중 오류가 발생했습니다.");
        }

        return metadata;
    }

    public Long getRoomIdByMessageId(Long messageId) {
        return chatMessageRepository.findById(messageId)
                .map(msg -> msg.getChatRoom().getId())
                .orElseThrow(() -> new RuntimeException("해당 메시지가 속한 채팅방을 찾을 수 없습니다."));
    }


    /**
     * ✅ 특정 메시지의 현재 unreadCount를 동적으로 계산
     * 메시지 생성 시각보다 lastReadAt이 이전인 참여자 수
     */
    @Transactional(readOnly = true)
    public int calculateUnreadCount(Long roomId, Long messageId) {
        ChatMessage message = chatMessageRepository.findById(messageId)
                .orElseThrow(() -> new IllegalArgumentException("메시지를 찾을 수 없습니다"));

        // ✅ 현재 활성 사용자 수를 제외
        long totalUnread = chatParticipantRepository.countByRoomIdAndLastReadAtBefore(
                roomId,
                message.getCreatedAt()
        );

        int activeUsers = chatRoomService.getActiveUserCount(roomId);

        // ✅ 활성 사용자는 이미 읽은 것으로 간주
        int finalUnreadCount = (int) Math.max(0, totalUnread - activeUsers);

        log.debug("📊 unreadCount 계산 - roomId: {}, total: {}, active: {}, final: {}",
                roomId, totalUnread, activeUsers, finalUnreadCount);

        return finalUnreadCount;
    }

}