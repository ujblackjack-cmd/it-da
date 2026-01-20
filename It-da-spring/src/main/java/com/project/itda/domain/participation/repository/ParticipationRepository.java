package com.project.itda.domain.participation.repository;

import com.project.itda.domain.meeting.entity.Meeting;
import com.project.itda.domain.participation.entity.Participation;
import com.project.itda.domain.participation.enums.ParticipationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * 참여 레포지토리
 */
@Repository
public interface ParticipationRepository extends JpaRepository<Participation, Long> {

    // ========================================
    // 사용자 + 모임 조회
    // ========================================

    /**
     * 사용자 ID + 모임 ID로 참여 정보 조회
     */
    @Query("SELECT p FROM Participation p " +
            "WHERE p.user.userId = :userId " +
            "AND p.meeting.meetingId = :meetingId")
    Optional<Participation> findByUserIdAndMeetingId(
            @Param("userId") Long userId,
            @Param("meetingId") Long meetingId
    );

    /**
     * 사용자 ID + 모임 ID로 참여 존재 여부 확인
     */
    @Query("SELECT CASE WHEN COUNT(p) > 0 THEN true ELSE false END " +
            "FROM Participation p " +
            "WHERE p.user.userId = :userId " +
            "AND p.meeting.meetingId = :meetingId")
    boolean existsByUserIdAndMeetingId(
            @Param("userId") Long userId,
            @Param("meetingId") Long meetingId
    );

    // ========================================
    // 모임 기준 조회
    // ========================================

    /**
     * ✅ 모임 ID + 상태로 참여자 목록 조회 (리마인더용)
     */
    @Query("SELECT p FROM Participation p " +
            "WHERE p.meeting.meetingId = :meetingId " +
            "AND p.status = :status " +
            "ORDER BY p.appliedAt DESC")
    List<Participation> findByMeetingIdAndStatus(
            @Param("meetingId") Long meetingId,
            @Param("status") ParticipationStatus status
    );

    /**
     * 모임의 모든 참여자 조회
     */
    @Query("SELECT p FROM Participation p " +
            "WHERE p.meeting.meetingId = :meetingId " +
            "ORDER BY p.appliedAt DESC")
    List<Participation> findByMeetingId(@Param("meetingId") Long meetingId);

    /**
     * 모임의 특정 상태 참여 개수
     */
    @Query("SELECT COUNT(p) FROM Participation p " +
            "WHERE p.meeting.meetingId = :meetingId " +
            "AND p.status = :status")
    Long countByMeetingIdAndStatus(
            @Param("meetingId") Long meetingId,
            @Param("status") ParticipationStatus status
    );

    // ========================================
    // 사용자 기준 조회
    // ========================================

    /**
     * 사용자의 참여 목록 조회 (특정 상태)
     */
    @Query("SELECT p FROM Participation p " +
            "WHERE p.user.userId = :userId " +
            "AND p.status = :status " +
            "ORDER BY p.appliedAt DESC")
    List<Participation> findByUserIdAndStatus(
            @Param("userId") Long userId,
            @Param("status") ParticipationStatus status
    );

    /**
     * 사용자의 모든 참여 목록 조회
     */
    @Query("SELECT p FROM Participation p " +
            "WHERE p.user.userId = :userId " +
            "ORDER BY p.appliedAt DESC")
    List<Participation> findByUserId(@Param("userId") Long userId);

    /**
     * 사용자의 특정 상태 참여 개수
     */
    @Query("SELECT COUNT(p) FROM Participation p " +
            "WHERE p.user.userId = :userId " +
            "AND p.status = :status")
    Long countByUserIdAndStatus(
            @Param("userId") Long userId,
            @Param("status") ParticipationStatus status
    );

    // ========================================
    // AI 추천용 메서드
    // ========================================

    /**
     * 사용자가 승인된 모든 참여 목록 조회 (AI 추천용)
     */
    @Query("SELECT p FROM Participation p " +
            "WHERE p.user.userId = :userId " +
            "AND p.status = 'APPROVED' " +
            "ORDER BY p.appliedAt DESC")
    List<Participation> findApprovedParticipationsByUserId(@Param("userId") Long userId);

    /**
     * 사용자가 참여 완료한 모임 목록 (리뷰 작성 가능한 모임)
     */
    @Query("SELECT p FROM Participation p " +
            "WHERE p.user.userId = :userId " +
            "AND p.status = 'COMPLETED' " +
            "ORDER BY p.appliedAt DESC")
    List<Participation> findCompletedParticipationsByUserId(@Param("userId") Long userId);

    /**
     * 모임과 상태로 참여 목록 조회
     */
    @Query("SELECT p FROM Participation p WHERE p.meeting = :meeting AND p.status = :status")
    List<Participation> findByMeetingAndStatus(
            @Param("meeting") Meeting meeting,
            @Param("status") ParticipationStatus status
    );
}