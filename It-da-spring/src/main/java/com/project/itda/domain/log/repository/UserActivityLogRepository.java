package com.project.itda.domain.log.repository;

import com.project.itda.domain.log.entity.UserActivityLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface UserActivityLogRepository extends JpaRepository<UserActivityLog, Long> {

    // ❌ 이거 삭제
    // List<UserActivityLog> findByUserId(Long userId);

    // ✅ 이렇게 변경
    List<UserActivityLog> findByUser_UserId(Long userId);

    List<UserActivityLog> findByActivityType(String activityType);

    List<UserActivityLog> findBySessionId(String sessionId);

    List<UserActivityLog> findByCreatedAtBetween(LocalDateTime start, LocalDateTime end);

    // ❌ 이거 삭제
    // List<UserActivityLog> findByUserIdAndActivityType(Long userId, String activityType);

    // ✅ 이렇게 변경
    List<UserActivityLog> findByUser_UserIdAndActivityType(Long userId, String activityType);

    // ❌ 이거 삭제 (에러 원인!)
    // List<UserActivityLog> findTop10ByUserIdOrderByCreatedAtDesc(Long userId);

    // ✅ 이렇게 변경
    List<UserActivityLog> findTop10ByUser_UserIdOrderByCreatedAtDesc(Long userId);
}