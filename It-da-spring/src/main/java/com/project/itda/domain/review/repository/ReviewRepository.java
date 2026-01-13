package com.project.itda.domain.review.repository;

import com.project.itda.domain.review.entity.Review;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * 후기 레포지토리
 */
@Repository
public interface ReviewRepository extends JpaRepository<Review, Long> {

    /**
     * 참여 ID로 후기 존재 여부 확인
     * ✅ @Query 추가!
     */
    @Query("SELECT CASE WHEN COUNT(r) > 0 THEN true ELSE false END " +
            "FROM Review r WHERE r.participation.participationId = :participationId")
    boolean existsByParticipationId(@Param("participationId") Long participationId);

    /**
     * 참여 ID로 후기 조회
     */
    @Query("SELECT r FROM Review r WHERE r.participation.participationId = :participationId")
    Optional<Review> findByParticipationId(@Param("participationId") Long participationId);

    /**
     * 모임 ID로 후기 목록 조회 (공개 후기만)
     */
    @Query("SELECT r FROM Review r " +
            "WHERE r.meeting.meetingId = :meetingId " +
            "AND r.isPublic = true " +
            "AND r.deletedAt IS NULL " +
            "ORDER BY r.createdAt DESC")
    List<Review> findByMeetingIdAndIsPublicTrue(@Param("meetingId") Long meetingId);

    /**
     * 사용자 ID로 작성한 후기 목록 조회
     */
    @Query("SELECT r FROM Review r " +
            "WHERE r.user.userId = :userId " +
            "AND r.deletedAt IS NULL " +
            "ORDER BY r.createdAt DESC")
    List<Review> findByUserId(@Param("userId") Long userId);

    /**
     * 사용자 ID로 리뷰 조회 (AI 추천용)
     */
    List<Review> findByUser_UserId(Long userId);

    /**
     * 모임 ID로 리뷰 조회
     */
    List<Review> findByMeeting_MeetingId(Long meetingId);

    /**
     * 사용자의 평균 평점 조회
     */
    @Query("SELECT AVG(r.rating) FROM Review r " +
            "WHERE r.user.userId = :userId " +
            "AND r.deletedAt IS NULL")
    Double getAvgRatingByUserId(@Param("userId") Long userId);

    /**
     * 사용자의 평점 표준편차 조회
     */
    @Query("SELECT STDDEV(r.rating) FROM Review r " +
            "WHERE r.user.userId = :userId " +
            "AND r.deletedAt IS NULL")
    Double getRatingStdByUserId(@Param("userId") Long userId);

    /**
     * 모임의 평균 평점 조회
     */
    @Query("SELECT AVG(r.rating) FROM Review r " +
            "WHERE r.meeting.meetingId = :meetingId " +
            "AND r.deletedAt IS NULL")
    Double getAvgRatingByMeetingId(@Param("meetingId") Long meetingId);

    /**
     * 모임의 후기 개수 조회
     */
    @Query("SELECT COUNT(r) FROM Review r " +
            "WHERE r.meeting.meetingId = :meetingId " +
            "AND r.deletedAt IS NULL")
    Long countByMeetingId(@Param("meetingId") Long meetingId);

    /**
     * 감성 타입별 후기 개수 조회
     */
    @Query("SELECT COUNT(r) FROM Review r " +
            "WHERE r.user.userId = :userId " +
            "AND r.sentiment = :sentimentType " +
            "AND r.deletedAt IS NULL")
    Long countByUserIdAndSentiment(
            @Param("userId") Long userId,
            @Param("sentimentType") com.project.itda.domain.review.enums.SentimentType sentimentType
    );

    /**
     * 사용자 평균 평점 계산
     */
    @Query("SELECT AVG(r.rating) FROM Review r WHERE r.user.id = :userId")
    Double findAverageRatingByUserId(@Param("userId") Long userId);

    /**
     * 사용자 리뷰 개수
     */
    @Query("SELECT COUNT(r) FROM Review r WHERE r.user.id = :userId")
    Integer countReviewsByUserId(@Param("userId") Long userId);

    /**
     * 사용자 평점 표준편차 계산
     */
    @Query("""
        SELECT SQRT(AVG((r.rating - sub.avg) * (r.rating - sub.avg)))
        FROM Review r,
        (SELECT AVG(r2.rating) as avg FROM Review r2 WHERE r2.user.id = :userId) sub
        WHERE r.user.id = :userId
        """)
    Double findRatingStdByUserId(@Param("userId") Long userId);
}