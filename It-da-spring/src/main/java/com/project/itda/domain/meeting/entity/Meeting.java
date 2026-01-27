package com.project.itda.domain.meeting.entity;

import com.project.itda.domain.meeting.enums.MeetingStatus;
import com.project.itda.domain.meeting.enums.MeetingTimeSlot;
import com.project.itda.domain.social.entity.ChatRoom;
import com.project.itda.domain.user.entity.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.ColumnDefault;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 모임 엔티티 (DB 스키마 완벽 매칭)
 */
@Entity
@Table(
        name = "meetings",
        indexes = {
                @Index(name = "idx_organizer", columnList = "organizer_id"),
                @Index(name = "idx_category", columnList = "category"),
                @Index(name = "idx_subcategory", columnList = "subcategory"),
                @Index(name = "idx_meeting_time", columnList = "meeting_time"),
                @Index(name = "idx_status", columnList = "status"),
                @Index(name = "idx_location", columnList = "latitude,longitude")
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Meeting {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "meeting_id")
    private Long meetingId;

    /**
     * 주최자
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organizer_id", nullable = false)
    private User organizer;

    /**
     * 모임 제목
     */
    @Column(nullable = false, length = 200)
    private String title;

    /**
     * 모임 설명
     */
    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    /**
     * 대분류 (스포츠/맛집/카페...)
     */
    @Column(nullable = false, length = 50)
    private String category;

    /**
     * 소분류 (러닝/한식/카페투어...)
     */
    @Column(nullable = false, length = 50)
    private String subcategory;

    /**
     * 모임 일시
     */
    @Column(name = "meeting_time", nullable = false)
    private LocalDateTime meetingTime;

    /**
     * 장소명
     */
    @Column(name = "location_name", nullable = false, length = 200)
    private String locationName;

    /**
     * 상세 주소
     */
    @Column(name = "location_address", nullable = false, length = 500)
    private String locationAddress;

    /**
     * 위도 (DECIMAL(10,8))
     */
    private Double latitude;

    /**
     * 경도 (DECIMAL(11,8))
     */
    private Double longitude;

    /**
     * 장소 유형 (indoor/outdoor)
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "location_type", nullable = false, length = 20)
    private LocationType locationType;

    /**
     * 분위기 (active/chill/social)
     */
    @Column(nullable = false, length = 50)
    private String vibe;

    /**
     * 시간대 (morning/afternoon/evening)
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "time_slot", nullable = false, length = 20)
    private MeetingTimeSlot timeSlot;

    /**
     * 최대 인원
     */
    @Column(name = "max_participants", nullable = false)
    private Integer maxParticipants;

    /**
     * 현재 인원 (주최자 포함)
     */
    @Column(name = "current_participants", nullable = false)
    @ColumnDefault("1")
    private Integer currentParticipants;

    /**
     * 예상 비용 (원)
     */
    @Column(name = "expected_cost", nullable = false)
    @ColumnDefault("0")
    private Integer expectedCost;

    /**
     * 상태 (RECRUITING/FULL/CANCELLED/COMPLETED)
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @ColumnDefault("'RECRUITING'")
    private MeetingStatus status;

    /**
     * 공개 여부
     */
    @Column(name = "is_public", nullable = false)
    @ColumnDefault("true")
    private Boolean isPublic;

    /**
     * 대표 이미지 URL
     */
    @Column(name = "image_url", length = 500)
    private String imageUrl;

    /**
     * 태그 (JSON 배열)
     */
    @Column(columnDefinition = "TEXT")
    private String tags;

    /**
     * 생성일
     */
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    /**
     * 평균 평점 (후기 기반, AI용)
     */
    @Column(name = "avg_rating")
    private Double avgRating;

    /**
     * 리뷰 개수 (후기 개수)
     */
    @Column(name = "review_count")
    @ColumnDefault("0")
    private Integer reviewCount;

    @OneToOne(fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    @JoinColumn(name = "chat_room_id")
    private ChatRoom chatRoom;

    /**
     * 평균 평점 업데이트 (ReviewService에서 호출)
     */
    public void updateAvgRating(Double avgRating) {
        this.avgRating = avgRating;
    }

    /**
     * 리뷰 개수 업데이트
     */
    public void updateReviewCount(Integer reviewCount) {
        this.reviewCount = reviewCount;
    }

    /**
     * 수정일
     */
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    /**
     * 삭제일 (소프트 삭제)
     */
    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    /**
     * 요일 (동적 계산)
     */
    @Transient
    private String dayOfWeek;

    /**
     * 날짜만 (동적 계산)
     */
    @Transient
    private String meetingDate;

    /**
     * AI 매칭 점수 (동적 할당)
     */
    @Transient
    private Integer matchScore;

    // ========================================
    // 필드 추가
    // ========================================

    @Column(name = "rating_count")
    private Integer ratingCount;  // 평점 개수

    @Transient  // DB에 저장 안 함
    private Double distanceKm;  // 사용자로부터의 거리 (검색 시 계산)

    public void setDistanceKm(double distance) {
        this.distanceKm = distance;
    }

    @Column(name = "avg_sentiment_score")
    private Double avgSentimentScore;

    @Column(name = "positive_review_ratio")
    private Double positiveReviewRatio;

    @Column(name = "negative_review_ratio")
    private Double negativeReviewRatio;

    @Column(name = "review_sentiment_variance")
    private Double reviewSentimentVariance;

    // ========================================
    // Enum 정의
    // ========================================

    public enum LocationType {
        INDOOR,
        OUTDOOR
    }

    // ========================================
    // 생명주기 콜백
    // ========================================

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (this.currentParticipants == null) {
            this.currentParticipants = 1;
        }
        if (this.expectedCost == null) {
            this.expectedCost = 0;
        }
        if (this.status == null) {
            this.status = MeetingStatus.RECRUITING;
        }
        if (this.isPublic == null) {
            this.isPublic = true;
        }
        if (this.reviewCount == null) {
            this.reviewCount = 0;
        }
        if (this.ratingCount == null) {
            this.ratingCount = 0;
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
     * 참가자 추가
     */
    public void addParticipant() {
        if (currentParticipants >= maxParticipants) {
            throw new IllegalStateException("정원이 마감되었습니다");
        }
        this.currentParticipants++;

        if (currentParticipants >= maxParticipants) {
            this.status = MeetingStatus.FULL;
        }
    }

    /**
     * 참가자 감소
     */
    public void removeParticipant() {
        if (currentParticipants > 1) {
            this.currentParticipants--;

            if (status == MeetingStatus.FULL && currentParticipants < maxParticipants) {
                this.status = MeetingStatus.RECRUITING;
            }
        }
    }

    /**
     * 모임 수정
     */
    public void update(
            String title,
            String description,
            LocalDateTime meetingTime,
            String locationName,
            String locationAddress,
            Double latitude,
            Double longitude,
            LocationType locationType,
            String vibe,
            Integer maxParticipants,
            Integer expectedCost,
            String imageUrl,
            String tags
    ) {
        this.title = title;
        this.description = description;
        this.meetingTime = meetingTime;
        this.locationName = locationName;
        this.locationAddress = locationAddress;
        this.latitude = latitude;
        this.longitude = longitude;
        this.locationType = locationType;
        this.vibe = vibe;
        this.maxParticipants = maxParticipants;
        this.expectedCost = expectedCost;
        this.imageUrl = imageUrl;
        this.tags = tags;
    }

    /**
     * 모임 상태 변경
     */
    public void updateStatus(MeetingStatus status) {
        this.status = status;
    }

    /**
     * 모임 취소
     */
    public void cancel() {
        this.status = MeetingStatus.CANCELLED;
    }

    /**
     * 모임 완료
     */
    public void complete() {
        this.status = MeetingStatus.COMPLETED;
    }

    /**
     * 모임 삭제 (소프트 삭제)
     */
    public void delete() {
        this.deletedAt = LocalDateTime.now();
        this.status = MeetingStatus.CANCELLED;
    }

    /**
     * 모임 마감 여부
     */
    public boolean isFull() {
        return currentParticipants >= maxParticipants;
    }

    /**
     * 모임 주최자 확인
     */
    public boolean isOrganizer(Long userId) {
        return this.organizer.getUserId().equals(userId);
    }

    /**
     * 위도 Double 변환 (AI용)
     */
    public Double getLatitudeAsDouble() {
        return latitude != null ? latitude : null;
    }

    /**
     * 경도 Double 변환 (AI용)
     */
    public Double getLongitudeAsDouble() {
        return longitude != null ? longitude : null;
    }

    // Getter에서 동적 계산
    public String getDayOfWeek() {
        if (meetingTime == null) return null;
        return meetingTime.getDayOfWeek().getDisplayName(
                java.time.format.TextStyle.SHORT,
                java.util.Locale.KOREAN
        );
    }

    public String getMeetingDate() {
        if (meetingTime == null) return null;
        return meetingTime.toLocalDate().toString();
    }

    public String updateImageUrl(String imageUrl) {
        return this.imageUrl = imageUrl;
    }

    public void updateLocation(String locationName, String locationAddress, Double latitude, Double longitude) {
        this.locationName = locationName;
        this.locationAddress = locationAddress;
        this.latitude = latitude;
        this.longitude = longitude;
    }
}