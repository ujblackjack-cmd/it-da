package com.project.itda.domain.log.repository;

import com.project.itda.domain.log.entity.ApiLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ApiLogRepository extends JpaRepository<ApiLog, Long> {

    List<ApiLog> findByEndpoint(String endpoint);

    List<ApiLog> findByMethod(String method);

    List<ApiLog> findByStatusCode(Integer statusCode);

    // ❌ 이거 삭제
    // List<ApiLog> findByUserId(Long userId);

    // ✅ 이렇게 변경
    List<ApiLog> findByUser_UserId(Long userId);

    List<ApiLog> findByCreatedAtBetween(LocalDateTime start, LocalDateTime end);

    List<ApiLog> findByStatusCodeGreaterThanEqual(Integer statusCode);

    List<ApiLog> findByResponseTimeMsGreaterThan(Integer threshold);

    @Query("SELECT AVG(a.responseTimeMs) FROM ApiLog a WHERE a.endpoint = :endpoint")
    Double getAverageResponseTime(String endpoint);
}