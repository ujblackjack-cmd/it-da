package com.project.itda.domain.user.repository;

import com.project.itda.domain.user.entity.User;
import com.project.itda.domain.user.entity.UserChatRoom;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserChatRoomRepository extends JpaRepository<UserChatRoom, Long> {

    // ✅ 두 유저 간의 채팅방 찾기
    @Query("SELECT cr FROM UserChatRoom cr WHERE " +
            "(cr.user1 = :user1 AND cr.user2 = :user2) OR " +
            "(cr.user1 = :user2 AND cr.user2 = :user1)")
    Optional<UserChatRoom> findByUsers(@Param("user1") User user1, @Param("user2") User user2);

    // ✅ 내 채팅방 목록 (최근 메시지 순)
    @Query("SELECT cr FROM UserChatRoom cr WHERE cr.user1.userId = :userId OR cr.user2.userId = :userId " +
            "ORDER BY cr.lastMessageAt DESC NULLS LAST")
    List<UserChatRoom> findByUserId(@Param("userId") Long userId);

    // ✅ 안읽은 채팅방 수
    @Query("SELECT COUNT(cr) FROM UserChatRoom cr WHERE " +
            "(cr.user1.userId = :userId AND cr.user1UnreadCount > 0) OR " +
            "(cr.user2.userId = :userId AND cr.user2UnreadCount > 0)")
    int countUnreadRooms(@Param("userId") Long userId);

    // ✅ 총 안읽은 메시지 수
    @Query("SELECT COALESCE(SUM(CASE WHEN cr.user1.userId = :userId THEN cr.user1UnreadCount " +
            "ELSE cr.user2UnreadCount END), 0) FROM UserChatRoom cr " +
            "WHERE cr.user1.userId = :userId OR cr.user2.userId = :userId")
    int getTotalUnreadCount(@Param("userId") Long userId);
}