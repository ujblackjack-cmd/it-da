package com.project.itda.domain.user.dto.response;

import com.project.itda.domain.user.entity.UserChatRoom;
import lombok.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserChatRoomResponse {
    private Long roomId;
    private Long otherUserId;
    private String otherUsername;
    private String otherProfileImage;
    private String lastMessage;
    private String lastMessageAt;
    private int unreadCount;

    private static final DateTimeFormatter TIME_FORMAT = DateTimeFormatter.ofPattern("HH:mm");
    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("MM.dd");
    private static final DateTimeFormatter YEAR_FORMAT = DateTimeFormatter.ofPattern("yyyy.MM.dd");

    public static UserChatRoomResponse from(UserChatRoom chatRoom, Long myUserId) {
        var otherUser = chatRoom.getOtherUser(myUserId);
        String timeStr = formatTime(chatRoom.getLastMessageAt());

        return UserChatRoomResponse.builder()
                .roomId(chatRoom.getRoomId())
                .otherUserId(otherUser.getUserId())
                .otherUsername(otherUser.getUsername())
                .otherProfileImage(otherUser.getProfileImageUrl())
                .lastMessage(chatRoom.getLastMessage())
                .lastMessageAt(timeStr)
                .unreadCount(chatRoom.getMyUnreadCount(myUserId))
                .build();
    }

    private static String formatTime(LocalDateTime time) {
        if (time == null) return "";

        LocalDateTime now = LocalDateTime.now();

        if (time.toLocalDate().equals(now.toLocalDate())) {
            // 오늘이면 시간만
            return time.format(TIME_FORMAT);
        } else if (time.getYear() == now.getYear()) {
            // 올해면 월.일
            return time.format(DATE_FORMAT);
        } else {
            // 다른 해면 년.월.일
            return time.format(YEAR_FORMAT);
        }
    }
}