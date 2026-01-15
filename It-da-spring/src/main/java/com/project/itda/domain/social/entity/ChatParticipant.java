package com.project.itda.domain.social.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.project.itda.domain.social.enums.ChatRole;
import com.project.itda.domain.user.entity.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "chat_participants", uniqueConstraints = {
        @UniqueConstraint(name = "uk_room_user", columnNames = {"chat_room_id", "user_id"}) // [cite: 299]
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class ChatParticipant {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "participant_id") // [cite: 284]
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "chat_room_id", nullable = false) // [cite: 285]
    @JsonIgnore
    private ChatRoom chatRoom;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false) // [cite: 287, 288]
    private User user;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(nullable = false) // [cite: 290, 291]
    private ChatRole role = ChatRole.MEMBER;

    @Column(name = "last_read_at") // [cite: 293]
    private LocalDateTime lastReadAt;

    @CreationTimestamp // [cite: 295]
    @Column(name = "joined_at", updatable = false) // [cite: 296]
    private LocalDateTime joinedAt;
}