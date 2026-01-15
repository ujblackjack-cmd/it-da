package com.project.itda.domain.social.service;

import com.project.itda.domain.social.dto.response.ChatMessageResponse;
import com.project.itda.domain.social.entity.ChatMessage;
import com.project.itda.domain.social.entity.ChatRoom;
import com.project.itda.domain.social.enums.MessageType;
import com.project.itda.domain.social.repository.ChatMessageRepository;
import com.project.itda.domain.social.repository.ChatRoomRepository;
import com.project.itda.domain.user.entity.User;
import com.project.itda.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class ChatMessageService {
    private final ChatMessageRepository chatMessageRepository;
    private final UserRepository userRepository; // 유저 조회를 위해 추가
    private final ChatRoomRepository chatRoomRepository; // 방 조회를 위해 추가

    public List<ChatMessage> getMessagesByRoom(Long roomId) {
        return chatMessageRepository.findByChatRoomIdOrderByCreatedAtAsc(roomId);
    }

    @Transactional
    public void saveMessage(String email, Long chatRoomId, String content) {
        // 1. 보낸 사람 조회
        User sender = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없음"));

        // 2. 채팅방 조회
        ChatRoom room = chatRoomRepository.findById(chatRoomId)
                .orElseThrow(() -> new RuntimeException("채팅방을 찾을 수 없음"));

        // 3. 메시지 엔티티 생성 및 저장
        ChatMessage message = ChatMessage.builder()
                .sender(sender)
                .chatRoom(room)
                .content(content)
                .type(MessageType.TEXT) // 기본 타입 설정
                .build();

        chatMessageRepository.save(message);
    }
    @Transactional(readOnly = true)
    public List<ChatMessageResponse> getChatMessages(Long roomId) {
        // 1. 해당 방의 메시지 내역 조회
        List<ChatMessage> messages = chatMessageRepository.findByChatRoomIdOrderByCreatedAtAsc(roomId);

        // 2. ChatMessageResponse DTO로 변환하여 순환 참조 끊기
        return messages.stream()
                .map(msg -> ChatMessageResponse.builder()
                        .messageId(msg.getId())
                        .senderId(msg.getSender().getUserId())
                        .senderNickname(msg.getSender().getNickname() != null ?
                                msg.getSender().getNickname() : msg.getSender().getUsername())
                        .content(msg.getContent())
                        .type(msg.getType())
                        .sentAt(msg.getCreatedAt())
                        .build())
                .collect(Collectors.toList());
    }
    public List<ChatMessageResponse> getMessageHistory(Long roomId) {
        return chatMessageRepository.findByChatRoomIdOrderByCreatedAtAsc(roomId).stream()
                .map(msg -> ChatMessageResponse.builder()
                        .messageId(msg.getId())
                        .senderId(msg.getSender().getUserId())
                        .senderNickname(msg.getSender().getNickname())
                        .content(msg.getContent())
                        .sentAt(msg.getCreatedAt())
                        .type(msg.getType())
                        .build())
                .toList();
    }
}