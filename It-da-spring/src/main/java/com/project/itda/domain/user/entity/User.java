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

    //소셜 로그인 사용자를 위해 필드가 비어 있을수 있도록 설정
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
    private String provider; // google, kakao, naver

    @Column(length = 100)
    private String providerId;

    // ========================================
// 필드 추가
// ========================================

    @Column(name = "rating")
    private Double rating;  // 주최자 평균 평점

    @Column(name = "meeting_count")
    private Integer meetingCount;  // 주최한 모임 수


    public void updateInfo(String username, String phone, String address, Double latitude, Double longitude) {
        if (username != null) this.username = username;
        if (phone != null) this.phone = phone;
        if (address != null) this.address = address;
        if (latitude != null) this.latitude = latitude;
        if (longitude != null) this.longitude = longitude;
    }

    public void updateLastLogin() {
        this.lastLoginAt = LocalDateTime.now();
    }

    @Column(name = "birth_date")
    private java.time.LocalDate birthDate; // 명세서의 birth_date (DATE) 반영 [cite: 22, 24]

    @Column(columnDefinition = "ENUM('M','F','N')")
    private String gender; // 명세서의 gender ENUM 반영 [cite: 25, 26]

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt; // 명세서의 deleted_at (소프트 삭제용) 반영 [cite: 41, 42]

    public User updateSocialInfo(String name, String picture) {
        this.username = name;
        this.profileImageUrl = picture;
        return this;
    }
}