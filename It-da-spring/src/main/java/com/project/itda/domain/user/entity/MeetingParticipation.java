package com.project.itda.domain.meeting.entity;

import com.project.itda.domain.user.entity.User;
import com.project.itda.domain.user.enums.ParticipationStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@Entity
@Table(
        name = "meeting_participations",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_participation_user_meeting", columnNames = {"user_id", "meeting_id"})
        }
)
public class MeetingParticipation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "meeting_id")
    private Meeting meeting;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ParticipationStatus status;

    private LocalDateTime completedAt;

    public void markCompleted(LocalDateTime completedAt) {
        this.status = ParticipationStatus.COMPLETED;
        this.completedAt = completedAt;
    }
}
