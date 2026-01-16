package com.project.itda.domain.user.dto.response;

import com.project.itda.domain.user.entity.UserChatMessage;
import lombok.*;

import java.time.format.DateTimeFormatter;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserChatMessageResponse {
    private Long messageId;
    private Long roomId;
    private Long senderId;
    private String senderName;
    private String senderProfileImage;
    private String content;
    private String messageType;
    private boolean isRead;
    private boolean isMine;
    private String createdAt;
    private String type;  // 웹소켓 타입용

    private static final DateTimeFormatter TIME_FORMAT = DateTimeFormatter.ofPattern("HH:mm");

    public static UserChatMessageResponse from(UserChatMessage message, Long currentUserId) {
        return UserChatMessageResponse.builder()
                .messageId(message.getMessageId())
                .roomId(message.getChatRoom().getRoomId())
                .senderId(message.getSender().getUserId())
                .senderName(message.getSender().getUsername())
                .senderProfileImage(message.getSender().getProfileImageUrl())
                .content(message.getContent())
                .messageType(message.getMessageType().name())
                .isRead(message.getIsRead())
                .isMine(message.getSender().getUserId().equals(currentUserId))
                .createdAt(message.getCreatedAt().format(TIME_FORMAT))
                .type("NEW_MESSAGE")
                .build();
    }
}