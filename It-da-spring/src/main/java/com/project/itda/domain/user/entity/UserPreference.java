package com.project.itda.domain.user.entity;

import com.project.itda.domain.user.enums.*;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_preferences", indexes = {
        @Index(name = "idx_energy", columnList = "energy_type"),
        @Index(name = "idx_purpose", columnList = "purpose_type")
}, uniqueConstraints = {
        @UniqueConstraint(name = "uk_user_preference", columnNames = {"user_id"})
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class UserPreference {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "preference_id")
    private Long preferenceId;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // ✅ Enum 타입으로 변경
    @Enumerated(EnumType.STRING)
    @Column(name = "energy_type", nullable = false, length = 20)
    private EnergyType energyType;

    @Enumerated(EnumType.STRING)
    @Column(name = "purpose_type", nullable = false, length = 20)
    private PurposeType purposeType;

    @Enumerated(EnumType.STRING)
    @Column(name = "frequency_type", nullable = false, length = 20)
    private FrequencyType frequencyType;

    @Enumerated(EnumType.STRING)
    @Column(name = "location_type", nullable = false, length = 20)
    private LocationType locationType;

    @Enumerated(EnumType.STRING)
    @Column(name = "budget_type", nullable = false, length = 20)
    private BudgetType budgetType;

    @Enumerated(EnumType.STRING)
    @Column(name = "leadership_type", nullable = false, length = 20)
    private LeadershipType leadershipType;

    // ✅ String으로 저장 (여러 개 가능: "MORNING,EVENING")
    @Column(name = "time_preference", nullable = false, length = 50)
    private String timePreference;

    @Column(name = "interests", columnDefinition = "TEXT")
    private String interests;  // JSON 문자열

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public void updatePreference(EnergyType energyType, PurposeType purposeType,
                                 FrequencyType frequencyType, LocationType locationType,
                                 BudgetType budgetType, LeadershipType leadershipType,
                                 String timePreference, String interests) {
        if (energyType != null) this.energyType = energyType;
        if (purposeType != null) this.purposeType = purposeType;
        if (frequencyType != null) this.frequencyType = frequencyType;
        if (locationType != null) this.locationType = locationType;
        if (budgetType != null) this.budgetType = budgetType;
        if (leadershipType != null) this.leadershipType = leadershipType;
        if (timePreference != null) this.timePreference = timePreference;
        if (interests != null) this.interests = interests;
    }
}