package com.project.itda.domain.user.entity;

import com.project.itda.domain.meeting.entity.Meeting;
import com.project.itda.domain.meeting.entity.MeetingParticipation;
import com.project.itda.domain.user.enums.SentimentType;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "reviews") // ✅ 테이블명은 그대로
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class UserReview { // ✅ 클래스명만 변경

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "review_id")
    private Long reviewId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "participation_id")
    private MeetingParticipation participation;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "meeting_id")
    private Meeting meeting;

    @Column(nullable = false)
    private Integer rating;

    @Column(name = "review_text", nullable = false, columnDefinition = "TEXT")
    private String reviewText;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SentimentType sentiment;

    @Column(name = "is_public")
    private Boolean isPublic = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (updatedAt == null) updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}