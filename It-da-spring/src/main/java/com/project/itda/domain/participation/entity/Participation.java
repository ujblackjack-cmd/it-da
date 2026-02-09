package com.project.itda.domain.participation.entity;

import com.project.itda.domain.meeting.entity.Meeting;
import com.project.itda.domain.participation.enums.ParticipationStatus;
import com.project.itda.domain.user.entity.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.ColumnDefault;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 참여 엔티티 (DB 스키마 완벽 매칭)
 */
@Entity
@Table(
        name = "participations",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_user_meeting", columnNames = {"user_id", "meeting_id"})
        },
        indexes = {
                @Index(name = "idx_user", columnList = "user_id"),
                @Index(name = "idx_meeting", columnList = "meeting_id"),
                @Index(name = "idx_status", columnList = "status"),
                @Index(name = "idx_completed", columnList = "completed_at")
        }
)
@Setter
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Participation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "participation_id")
    private Long participationId;

    /**
     * 사용자
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /**
     * 모임
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "meeting_id", nullable = false)
    private Meeting meeting;

    /**
     * 참여 상태
     * PENDING(대기), APPROVED(승인), REJECTED(거절), CANCELLED(취소), COMPLETED(완료)
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @ColumnDefault("'PENDING'")
    private ParticipationStatus status;

    /**
     * 신청 메시지
     */
    @Column(name = "application_message", columnDefinition = "TEXT")
    private String applicationMessage;

    /**
     * 거절 사유
     */
    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    private String rejectionReason;

    /**
     * 사용자-모임 간 거리 (km)
     */
    private Double distanceKm;

    /**
     * 추천 유형 (AI/SEARCH/DIRECT)
     */
    @Column(name = "recommendation_type", length = 50)
    private String recommendationType;

    /**
     * 예측 만족도 (LightGBM)
     */
    @Column(name = "predicted_rating", precision = 3, scale = 2)
    private BigDecimal predictedRating;

    /**
     * 신청일
     */
    @Column(name = "applied_at", nullable = false)
    private LocalDateTime appliedAt;

    /**
     * 승인일
     */
    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    /**
     * 참여 완료일
     */
    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    /**
     * 생성일
     */
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    /**
     * 수정일
     */
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // ========================================
    // 생명주기 콜백
    // ========================================

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.appliedAt = LocalDateTime.now();
        if (this.status == null) {
            this.status = ParticipationStatus.PENDING;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    // ========================================
    // 비즈니스 메서드
    // ========================================

    /**
     * 참여 승인
     */
    public void approve() {
        if (this.status != ParticipationStatus.PENDING) {
            throw new IllegalStateException("대기 중인 신청만 승인할 수 있습니다");
        }
        this.status = ParticipationStatus.APPROVED;
        this.approvedAt = LocalDateTime.now();
    }

    /**
     * 참여 거절
     */
    public void reject(String rejectionReason) {
        if (this.status != ParticipationStatus.PENDING) {
            throw new IllegalStateException("대기 중인 신청만 거절할 수 있습니다");
        }
        this.status = ParticipationStatus.REJECTED;
        this.rejectionReason = rejectionReason;
    }

    /**
     * 참여 취소 (사용자가 직접 취소)
     */
    public void cancel() {
        if (this.status == ParticipationStatus.COMPLETED) {
            throw new IllegalStateException("완료된 참여는 취소할 수 없습니다");
        }
        this.status = ParticipationStatus.CANCELLED;
    }

    /**
     * 참여 완료 (모임 종료 후)
     */
    public void complete() {
        if (this.status != ParticipationStatus.APPROVED) {
            throw new IllegalStateException("승인된 참여만 완료할 수 있습니다");
        }
        this.status = ParticipationStatus.COMPLETED;
        this.completedAt = LocalDateTime.now();
    }

    /**
     * 거리 Double 변환 (AI용)
     */
    public Double getDistanceKmAsDouble() {
        return distanceKm != null ? distanceKm.doubleValue() : null;
    }

    /**
     * 예측 만족도 Double 변환 (AI용)
     */
    public Double getPredictedRatingAsDouble() {
        return predictedRating != null ? predictedRating.doubleValue() : null;
    }
}