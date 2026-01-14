package com.project.itda.domain.user.entity;

import com.project.itda.domain.user.enums.UserStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_id")
    private Long userId;

    @Column(nullable = false, unique = true, length = 100)
    private String email;

    @Column(name = "password_hash", nullable = true, length = 255)
    private String passwordHash;

    @Column(nullable = false, length = 50)
    private String username;

    @Column
    private String nickname;

    @Column(length = 20)
    private String phone;

    @Column(length = 255)
    private String address;

    private Double latitude;
    private Double longitude;

    @Column(name = "profile_image_url", length = 500)
    private String profileImageUrl;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    @Builder.Default
    private UserStatus status = UserStatus.ACTIVE;

    @Column(name = "bio", columnDefinition = "TEXT")
    private String bio;

    @Column(name = "mbti", length = 10)
    private String mbti;

    @Column(name = "interests")
    private String interests;

    @Column(name = "is_public")
    @Builder.Default
    private Boolean isPublic = true;

    @Column(name = "email_verified")
    @Builder.Default
    private Boolean emailVerified = false;

    @Column(name = "last_login_at")
    private LocalDateTime lastLoginAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @OneToOne(mappedBy = "user", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private UserPreference preference;

    @OneToOne(mappedBy = "user", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private UserSetting setting;

    @Column(length = 20)
    private String provider;

    @Column(length = 100)
    private String providerId;

    @Column(name = "rating")
    private Double rating;

    @Column(name = "meeting_count")
    private Integer meetingCount;

    @Column(name = "birth_date")
    private LocalDate birthDate;

    @Column(columnDefinition = "ENUM('M','F','N')")
    private String gender;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    public void updateInfo(String username, String phone, String address, Double latitude, Double longitude,
                           String profileImageUrl, String bio, String gender, String mbti, String interests, Boolean isPublic) {
        if (username != null) this.username = username;
        if (phone != null) this.phone = phone;
        if (address != null) this.address = address;
        if (latitude != null) this.latitude = latitude;
        if (longitude != null) this.longitude = longitude;
        if (profileImageUrl != null) this.profileImageUrl = profileImageUrl;
        if (bio != null) this.bio = bio;
        if (gender != null) this.gender = gender;
        if (mbti != null) this.mbti = mbti;
        if (interests != null) this.interests = interests;
        if (isPublic != null) this.isPublic = isPublic;
    }

    public void updateLastLogin() {
        this.lastLoginAt = LocalDateTime.now();
    }

    public User updateSocialInfo(String name, String picture) {
        this.username = name;
        this.profileImageUrl = picture;
        return this;
    }

    public void softDelete() {
        this.deletedAt = LocalDateTime.now();
        this.status = UserStatus.DELETED;
    }
}