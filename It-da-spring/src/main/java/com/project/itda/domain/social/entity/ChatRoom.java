package com.project.itda.domain.social.entity;

import jakarta.persistence.*;
import lombok.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "chat_rooms")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class ChatRoom {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "chat_room_id") // [cite: 251]
    private Long id;

    @Column(name = "room_name", nullable = false, length = 200) // [cite: 254]
    private String roomName;

    @Builder.Default
    @Column(name = "is_active") // [cite: 256]
    private boolean isActive = true;

    @OneToMany(mappedBy = "chatRoom", cascade = CascadeType.ALL)
    private List<ChatParticipant> participants = new ArrayList<>();

    @OneToMany(mappedBy = "chatRoom", cascade = CascadeType.ALL)
    private List<ChatMessage> messages = new ArrayList<>();

    @Column(name = "max_participants")
    private Integer maxParticipants; // 최대 인원

    @Column(name = "category")
    private String category; // 카테고리

    @Column(name = "description", columnDefinition = "TEXT")
    private String description; // 모임 소개글

    @Column(name = "location_name")
    private String locationName; // 장소명
}