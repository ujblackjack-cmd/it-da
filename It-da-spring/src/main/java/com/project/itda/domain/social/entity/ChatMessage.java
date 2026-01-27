package com.project.itda.domain.social.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.project.itda.domain.social.enums.MessageType;
import com.project.itda.domain.user.entity.User;
import com.project.itda.global.common.JsonToMapConverter;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.Map;

@Entity
@Table(name = "chat_messages")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class ChatMessage {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "message_id") // [cite: 263]
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "chat_room_id", nullable = false) // [cite: 265]
    @JsonIgnore
    private ChatRoom chatRoom;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false) // [cite: 267]
    private User sender;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(name = "message_type",nullable=false, length = 20) // [cite: 270, 271]
    private MessageType type = MessageType.TEXT;

    @Column(nullable = false, columnDefinition = "TEXT") // [cite: 273, 274]
    private String content;

    @Column(name = "file_url", length = 500) // [cite: 275, 276]
    private String fileUrl;

    @Column(name = "is_read") // [cite: 278]
    @Builder.Default
    private boolean isRead = false;

    @CreationTimestamp // [cite: 279]
    @Column(name = "created_at", updatable = false) // [cite: 280]
    private LocalDateTime createdAt; // [cite: 280]

    @Column(columnDefinition = "TEXT")
    @Convert(converter = JsonToMapConverter.class) // JSON 문자열 <-> Map 변환기 사용 추천
    private Map<String, Object> metadata;

    public void updateMetadata(Map<String, Object> metadata) { this.metadata = metadata; }

    @Column(name = "unread_count")
    @Builder.Default
    private Integer unreadCount = 0;
}