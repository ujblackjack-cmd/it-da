package com.project.itda.domain.user.repository;

import com.project.itda.domain.meeting.entity.MeetingParticipation;
import com.project.itda.domain.user.enums.ParticipationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MeetingParticipationRepository extends JpaRepository<MeetingParticipation, Long> {

    // 사용자별 상태별 참여 목록
    List<MeetingParticipation> findByUserUserIdAndStatusOrderByIdDesc(
            Long userId,
            ParticipationStatus status
    );

    // 특정 사용자의 특정 모임 참여 기록
    Optional<MeetingParticipation> findByUserUserIdAndMeetingMeetingId(
            Long userId,
            Long meetingId
    );
}