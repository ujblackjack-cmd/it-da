package com.project.itda.domain.user.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_chat_rooms", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"user1_id", "user2_id"})
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class UserChatRoom {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long roomId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user1_id", nullable = false)
    private User user1;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user2_id", nullable = false)
    private User user2;

    @Column(length = 500)
    private String lastMessage;

    @Column(name = "last_message_at")
    private LocalDateTime lastMessageAt;

    @Column(nullable = false)
    @Builder.Default
    private Integer user1UnreadCount = 0;

    @Column(nullable = false)
    @Builder.Default
    private Integer user2UnreadCount = 0;

    @CreationTimestamp
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public void updateLastMessage(String message, Long senderId) {
        this.lastMessage = message;
        this.lastMessageAt = LocalDateTime.now();
        if (senderId.equals(user1.getUserId())) {
            this.user2UnreadCount++;
        } else {
            this.user1UnreadCount++;
        }
    }

    public void markAsRead(Long userId) {
        if (userId.equals(user1.getUserId())) {
            this.user1UnreadCount = 0;
        } else if (userId.equals(user2.getUserId())) {
            this.user2UnreadCount = 0;
        }
    }

    public User getOtherUser(Long myUserId) {
        return myUserId.equals(user1.getUserId()) ? user2 : user1;
    }

    public int getMyUnreadCount(Long myUserId) {
        return myUserId.equals(user1.getUserId()) ? user1UnreadCount : user2UnreadCount;
    }

    public int getOtherUnreadCount(Long myUserId) {
        return myUserId.equals(user1.getUserId()) ? user2UnreadCount : user1UnreadCount;
    }

    public boolean isParticipant(Long userId) {
        return user1.getUserId().equals(userId) || user2.getUserId().equals(userId);
    }
}