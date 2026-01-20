package com.project.itda.domain.user.service;

import com.project.itda.domain.notification.service.NotificationService;
import com.project.itda.domain.user.dto.response.UserChatMessageResponse;
import com.project.itda.domain.user.dto.response.UserChatRoomResponse;
import com.project.itda.domain.user.entity.User;
import com.project.itda.domain.user.entity.UserChatMessage;
import com.project.itda.domain.user.entity.UserChatRoom;
import com.project.itda.domain.user.repository.UserChatMessageRepository;
import com.project.itda.domain.user.repository.UserChatRoomRepository;
import com.project.itda.domain.user.repository.UserFollowRepository;
import com.project.itda.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserChatService {

    private final UserChatRoomRepository chatRoomRepository;
    private final UserChatMessageRepository messageRepository;
    private final UserRepository userRepository;
    private final UserFollowRepository userFollowRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final NotificationService notificationService;  // ✅ 추가

    /**
     * ✅ 메시지 전송 가능 여부 체크
     */
    public boolean canSendMessage(Long senderId, Long receiverId) {
        User sender = userRepository.findById(senderId).orElse(null);
        User receiver = userRepository.findById(receiverId).orElse(null);

        if (sender == null || receiver == null) return false;
        if (senderId.equals(receiverId)) return false;

        if (receiver.getIsPublic() != null && receiver.getIsPublic()) {
            return true;
        }

        boolean iFollow = userFollowRepository.existsByFollowerIdAndFollowingId(senderId, receiverId);
        boolean theyFollow = userFollowRepository.existsByFollowerIdAndFollowingId(receiverId, senderId);

        return iFollow && theyFollow;
    }

    /**
     * ✅ 채팅방 생성 또는 가져오기
     */
    @Transactional
    public UserChatRoomResponse getOrCreateChatRoom(Long userId, Long targetUserId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다."));
        User target = userRepository.findById(targetUserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "대상 사용자를 찾을 수 없습니다."));

        if (!canSendMessage(userId, targetUserId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "메시지를 보낼 수 없습니다. 비공개 계정은 서로 팔로우 상태여야 합니다.");
        }

        UserChatRoom chatRoom = chatRoomRepository.findByUsers(user, target)
                .orElseGet(() -> {
                    UserChatRoom newRoom = UserChatRoom.builder()
                            .user1(user)
                            .user2(target)
                            .build();
                    log.info("✅ 새 채팅방 생성: {} <-> {}", user.getUsername(), target.getUsername());
                    return chatRoomRepository.save(newRoom);
                });

        log.info("✅ 채팅방 조회: roomId={}", chatRoom.getRoomId());
        return UserChatRoomResponse.from(chatRoom, userId);
    }

    /**
     * ✅ 메시지 전송 + 실시간 알림 + DB 알림 저장
     */
    @Transactional
    public UserChatMessageResponse sendMessage(Long roomId, Long senderId, String content) {
        UserChatRoom chatRoom = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "채팅방을 찾을 수 없습니다."));

        User sender = userRepository.findById(senderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다."));

        if (!chatRoom.isParticipant(senderId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "채팅방 참여자가 아닙니다.");
        }

        UserChatMessage message = UserChatMessage.builder()
                .chatRoom(chatRoom)
                .sender(sender)
                .content(content)
                .messageType(UserChatMessage.MessageType.TEXT)
                .build();

        messageRepository.save(message);
        chatRoom.updateLastMessage(content, senderId);

        log.info("✅ 메시지 전송: roomId={}, sender={}, content={}", roomId, sender.getUsername(), content);

        UserChatMessageResponse response = UserChatMessageResponse.from(message, senderId);

        // ✅ 실시간 메시지 전송 (웹소켓)
        sendRealTimeMessage(chatRoom, response, sender);

        // ✅ 알림 DB 저장 + 웹소켓 푸시 (상대방에게)
        User receiver = chatRoom.getOtherUser(senderId);
        notificationService.notifyNewMessage(receiver, sender, roomId, content);

        return response;
    }

    /**
     * ✅ 실시간 메시지 전송 (웹소켓)
     */
    private void sendRealTimeMessage(UserChatRoom chatRoom, UserChatMessageResponse message, User sender) {
        User receiver = chatRoom.getOtherUser(sender.getUserId());

        // 1. 채팅방 구독자에게 메시지 전송
        messagingTemplate.convertAndSend("/topic/chat/" + chatRoom.getRoomId(), message);
        log.info("📨 채팅방 메시지 전송: /topic/chat/{}", chatRoom.getRoomId());

        // 2. 상대방에게 새 메시지 알림
        Map<String, Object> notification = new HashMap<>();
        notification.put("type", "NEW_MESSAGE");
        notification.put("roomId", chatRoom.getRoomId());
        notification.put("senderId", sender.getUserId());
        notification.put("senderName", sender.getUsername());
        notification.put("senderProfileImage", sender.getProfileImageUrl());
        notification.put("content", message.getContent());
        notification.put("createdAt", message.getCreatedAt());
        notification.put("unreadCount", chatRoom.getMyUnreadCount(receiver.getUserId()));

        messagingTemplate.convertAndSend("/topic/message/" + receiver.getUserId(), notification);
        log.info("🔔 메시지 알림 전송: /topic/message/{}", receiver.getUserId());

        // 3. 채팅 목록 업데이트 알림
        Map<String, Object> listUpdate = new HashMap<>();
        listUpdate.put("type", "CHAT_LIST_UPDATE");
        listUpdate.put("roomId", chatRoom.getRoomId());
        listUpdate.put("lastMessage", message.getContent());
        listUpdate.put("lastMessageAt", message.getCreatedAt());
        listUpdate.put("unreadCount", chatRoom.getMyUnreadCount(receiver.getUserId()));

        messagingTemplate.convertAndSend("/topic/chatlist/" + receiver.getUserId(), listUpdate);
        messagingTemplate.convertAndSend("/topic/chatlist/" + sender.getUserId(), listUpdate);
    }

    /**
     * ✅ 채팅방 메시지 목록 조회
     */
    public List<UserChatMessageResponse> getMessages(Long roomId, Long userId) {
        UserChatRoom chatRoom = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "채팅방을 찾을 수 없습니다."));

        if (!chatRoom.isParticipant(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "채팅방 참여자가 아닙니다.");
        }

        return messageRepository.findByChatRoomOrderByCreatedAtAsc(chatRoom)
                .stream()
                .map(m -> UserChatMessageResponse.from(m, userId))
                .collect(Collectors.toList());
    }

    /**
     * ✅ 메시지 읽음 처리 + 실시간 알림
     */
    @Transactional
    public void markAsRead(Long roomId, Long userId) {
        UserChatRoom chatRoom = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "채팅방을 찾을 수 없습니다."));

        if (!chatRoom.isParticipant(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "채팅방 참여자가 아닙니다.");
        }

        int updatedCount = messageRepository.markMessagesAsRead(chatRoom, userId);
        chatRoom.markAsRead(userId);

        log.info("✅ 메시지 읽음 처리: roomId={}, userId={}, count={}", roomId, userId, updatedCount);

        User otherUser = chatRoom.getOtherUser(userId);
        Map<String, Object> readNotification = new HashMap<>();
        readNotification.put("type", "MESSAGES_READ");
        readNotification.put("roomId", roomId);
        readNotification.put("readerId", userId);

        messagingTemplate.convertAndSend("/topic/chat/" + roomId, readNotification);
        log.info("👁️ 읽음 알림 전송: /topic/chat/{}", roomId);
    }

    /**
     * ✅ 내 채팅방 목록 조회
     */
    public List<UserChatRoomResponse> getMyChatRooms(Long userId) {
        return chatRoomRepository.findByUserId(userId)
                .stream()
                .map(room -> UserChatRoomResponse.from(room, userId))
                .collect(Collectors.toList());
    }

    /**
     * ✅ 안읽은 메시지 총 개수
     */
    public int getTotalUnreadCount(Long userId) {
        return chatRoomRepository.getTotalUnreadCount(userId);
    }

    /**
     * ✅ 채팅방 정보 조회
     */
    public UserChatRoomResponse getChatRoom(Long roomId, Long userId) {
        UserChatRoom chatRoom = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "채팅방을 찾을 수 없습니다."));

        if (!chatRoom.isParticipant(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "채팅방 참여자가 아닙니다.");
        }

        return UserChatRoomResponse.from(chatRoom, userId);
    }
}