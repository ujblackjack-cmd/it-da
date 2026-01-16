package com.project.itda.domain.user.repository;

import com.project.itda.domain.user.entity.UserChatMessage;
import com.project.itda.domain.user.entity.UserChatRoom;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface UserChatMessageRepository extends JpaRepository<UserChatMessage, Long> {

    // ✅ 채팅방 메시지 목록 (시간순)
    List<UserChatMessage> findByChatRoomOrderByCreatedAtAsc(UserChatRoom chatRoom);

    // ✅ 안읽은 메시지 수
    @Query("SELECT COUNT(m) FROM UserChatMessage m WHERE m.chatRoom = :chatRoom " +
            "AND m.sender.userId != :userId AND m.isRead = false")
    int countUnreadMessages(@Param("chatRoom") UserChatRoom chatRoom, @Param("userId") Long userId);

    // ✅ 안읽은 메시지 읽음 처리
    @Modifying
    @Query("UPDATE UserChatMessage m SET m.isRead = true WHERE m.chatRoom = :chatRoom " +
            "AND m.sender.userId != :userId AND m.isRead = false")
    int markMessagesAsRead(@Param("chatRoom") UserChatRoom chatRoom, @Param("userId") Long userId);

    // ✅ 특정 메시지 이후 메시지들 읽음 처리
    @Modifying
    @Query("UPDATE UserChatMessage m SET m.isRead = true WHERE m.chatRoom.roomId = :roomId " +
            "AND m.sender.userId != :userId AND m.isRead = false AND m.messageId <= :lastMessageId")
    int markMessagesAsReadUntil(@Param("roomId") Long roomId, @Param("userId") Long userId, @Param("lastMessageId") Long lastMessageId);
}