package com.project.itda.domain.user.repository;

import com.project.itda.domain.user.entity.UserReview; // ✅ 변경
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface UserReviewRepository extends JpaRepository<UserReview, Long> { // ✅ 변경

    List<UserReview> findByUserUserIdOrderByCreatedAtDesc(Long userId);

    boolean existsByUserUserIdAndMeetingMeetingId(Long userId, Long meetingId);

    List<UserReview> findByUserUserIdAndMeetingMeetingIdIn(Long userId, List<Long> meetingIds);
}