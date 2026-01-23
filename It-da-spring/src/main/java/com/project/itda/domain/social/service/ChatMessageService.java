package com.project.itda.domain.social.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class ChatMessageService {
    private final ChatMessageRepository chatMessageRepository;
    private final UserRepository userRepository; // 유저 조회를 위해 추가
    private final ChatRoomRepository chatRoomRepository; // 방 조회를 위해 추가
    private final ChatParticipantRepository chatParticipantRepository;

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
                .type(type) // 기본 타입 설정
                .unreadCount(unreadCount)
                .build();

        return chatMessageRepository.save(message);
    }

    // ✅ 페이징을 지원하는 새로운 메서드
    public List<ChatMessageResponse> getChatMessages(Long roomId, int page, int size) {
        Page<ChatMessage> messagePage = chatMessageRepository
                .findByChatRoomIdOrderByCreatedAtDesc(roomId, PageRequest.of(page, size));

        List<ChatMessage> messages = new ArrayList<>(messagePage.getContent());
        Collections.reverse(messages);

        // 1. 참여자들의 마지막 읽은 시간 리스트를 한 번에 조회 (최적화 핵심)
        List<LocalDateTime> lastReadTimes = chatParticipantRepository.findAllLastReadAtByRoomId(roomId);
        int totalParticipants = lastReadTimes.size();

        return messages.stream().map(msg -> {
            String nickname = msg.getSender().getNickname();
            String finalName = (nickname != null && !nickname.trim().isEmpty())
                    ? nickname : msg.getSender().getUsername();

            // 2. DB 쿼리 대신 메모리(List)에서 필터링하여 계산
            long readCount = lastReadTimes.stream()
                    .filter(lastRead -> lastRead != null && !lastRead.isBefore(msg.getCreatedAt()))
                    .count();

            // 나 자신을 제외한 안 읽은 사람 수 계산
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
    public void updateLastReadAt(Long roomId, String email) {
        // 1. 참여자 정보 조회
        com.project.itda.domain.social.entity.ChatParticipant participant =
                chatParticipantRepository.findByChatRoomIdAndUserEmail(roomId, email)
                        .orElseThrow(() -> new RuntimeException("참여자가 아닙니다."));

        // 2. 마지막 읽은 시간 갱신 (이미 ChatParticipant 엔티티에 메서드 추가됨)
        participant.updateLastReadAt(java.time.LocalDateTime.now());
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
            // JPA 영속성 컨텍스트에 의해 자동 업데이트됨
        }

        return savedMessage;
    }
    // ChatMessageService.java에 추가
    @Transactional
    public void updateVoteMetadata(Long roomId, Long voteId, Map<String, Object> metadata) {
        // 해당 채팅방의 메시지 중 metadata 내부의 voteId가 일치하는 POLL 메시지를 찾습니다.
        List<ChatMessage> messages = chatMessageRepository.findByChatRoomIdOrderByCreatedAtAsc(roomId);

        for (ChatMessage msg : messages) {
            if (msg.getType() == MessageType.POLL && msg.getMetadata() != null) {
                Object msgVoteId = msg.getMetadata().get("voteId");
                if (msgVoteId != null && String.valueOf(msgVoteId).equals(String.valueOf(voteId))) {
                    msg.updateMetadata(metadata); // ✅ 엔티티에 updateMetadata 메서드가 필요합니다.
                    break;
                }
            }
        }
    }
    @Transactional
    public Map<String, Object> updateBillStatus(Long messageId, Long targetUserId) {
        // 1. 메시지 조회
        ChatMessage message = chatMessageRepository.findById(messageId)
                .orElseThrow(() -> new RuntimeException("메시지를 찾을 수 없음"));

        // 2. 기존 metadata 가져오기
        Map<String, Object> metadata = message.getMetadata();
        if (metadata == null || !metadata.containsKey("participants")) return null;

        // ✅ 3. ObjectMapper를 사용하여 LinkedHashMap 리스트를 안전하게 변환 (핵심 해결책)
        ObjectMapper mapper = new ObjectMapper();
        try {
            // metadata에서 가져온 객체를 List<Map<String, Object>> 형태로 안전하게 다시 매핑합니다.
            List<Map<String, Object>> participants = mapper.convertValue(
                    metadata.get("participants"),
                    new TypeReference<List<Map<String, Object>>>() {}
            );

            boolean isUpdated = false;
            for (Map<String, Object> p : participants) {
                // ✅ userId 비교 시 String.valueOf()를 사용하여 타입 불일치 완전 차단
                if (String.valueOf(p.get("userId")).equals(String.valueOf(targetUserId))) {
                    // isPaid 상태 반전
                    Object isPaidObj = p.get("isPaid");
                    boolean currentStatus = (isPaidObj instanceof Boolean) ? (Boolean) isPaidObj : false;
                    p.put("isPaid", !currentStatus);
                    isUpdated = true;
                    break;
                }
            }

            if (isUpdated) {
                // 4. 변경된 리스트를 다시 metadata에 넣고 저장
                metadata.put("participants", participants);
                message.updateMetadata(metadata);
                return metadata;
            }
        } catch (Exception e) {
            // 로그를 남겨 추적 용이하게 함
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
}