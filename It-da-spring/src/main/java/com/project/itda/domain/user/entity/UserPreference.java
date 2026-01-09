package com.project.itda.domain.user.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_preferences")
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

    @Column(name = "energy_type", nullable = false, length = 20)
    private String energyType;

    @Column(name = "purpose_type", nullable = false, length = 20)
    private String purposeType;

    @Column(name = "frequency_type", nullable = false, length = 20)
    private String frequencyType;

    @Column(name = "location_type", nullable = false, length = 20)
    private String locationType;

    @Column(name = "budget_type", nullable = false, length = 20)
    private String budgetType;

    @Column(name = "leadership_type", nullable = false, length = 20)
    private String leadershipType;

    @Column(name = "time_preference", nullable = false, length = 20)
    private String timePreference;

    @Column(name = "interests", columnDefinition = "TEXT")
    private String interests;  // JSON 문자열 (예: ["스포츠","카페"])

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public void updatePreference(String energyType, String purposeType, String frequencyType,
                                 String locationType, String budgetType, String leadershipType,
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