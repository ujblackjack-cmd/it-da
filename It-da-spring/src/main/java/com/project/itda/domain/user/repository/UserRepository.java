package com.project.itda.domain.user.repository;

import com.project.itda.domain.user.entity.User;
import com.project.itda.domain.user.enums.UserStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    // 이메일로 사용자 조회
    Optional<User> findByEmail(String email);

    // 이메일 중복 체크
    boolean existsByEmail(String email);

    // 전화번호 중복 체크
    boolean existsByPhone(String phone);

    // UserRepository.java
    Optional<User> findByProviderAndProviderId(String provider, String providerId);


    // User + Preference + Setting 한번에 조회 (N+1 방지)
    @Query("SELECT u FROM User u " +
            "LEFT JOIN FETCH u.preference " +
            "LEFT JOIN FETCH u.setting " +
            "WHERE u.userId = :userId")
    Optional<User> findByIdWithAll(@Param("userId") Long userId);

    // 이메일로 User + Preference + Setting 조회
    @Query("SELECT u FROM User u " +
            "LEFT JOIN FETCH u.preference " +
            "LEFT JOIN FETCH u.setting " +
            "WHERE u.email = :email")
    Optional<User> findByEmailWithAll(@Param("email") String email);

    // 근처 사용자 조회 (Haversine 공식)
    @Query("SELECT u FROM User u WHERE u.status = 'ACTIVE' " +
            "AND (6371 * acos(cos(radians(:latitude)) * cos(radians(u.latitude)) " +
            "* cos(radians(u.longitude) - radians(:longitude)) " +
            "+ sin(radians(:latitude)) * sin(radians(u.latitude)))) < :distance")
    List<User> findNearbyUsers(@Param("latitude") Double latitude,
                               @Param("longitude") Double longitude,
                               @Param("distance") Double distance);

    // 상태별 사용자 수 조회
    long countByStatus(UserStatus status);

    // 특정 날짜 이후 가입한 사용자 수
    long countByCreatedAtAfter(LocalDateTime dateTime);
}