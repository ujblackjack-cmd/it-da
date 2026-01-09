package com.project.itda.domain.user.repository;

import com.project.itda.domain.user.entity.UserSetting;
import com.project.itda.domain.user.enums.ProfileVisibility;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserSettingRepository extends JpaRepository<UserSetting, Long> {

    Optional<UserSetting> findByUser_UserId(Long userId);

    @Query("SELECT us FROM UserSetting us " +
            "JOIN FETCH us.user " +
            "WHERE us.user.userId = :userId")
    Optional<UserSetting> findByUserIdWithUser(@Param("userId") Long userId);

    // === 알림 설정 조회 ===

    @Query("SELECT us FROM UserSetting us WHERE us.notificationEnabled = true")
    List<UserSetting> findAllWithNotificationEnabled();

    @Query("SELECT us FROM UserSetting us WHERE us.pushNotification = true")
    List<UserSetting> findAllWithPushEnabled();

    @Query("SELECT us FROM UserSetting us " +
            "WHERE us.meetingReminderNotification = true " +
            "AND us.user.userId IN :userIds")
    List<UserSetting> findUsersWithMeetingReminderEnabled(@Param("userIds") List<Long> userIds);

    // === 프라이버시 설정 조회 ===

    List<UserSetting> findByProfileVisibility(ProfileVisibility visibility);

    @Query("SELECT COUNT(us) FROM UserSetting us WHERE us.locationTracking = true")
    long countUsersWithLocationTracking();

    // === 배치 업데이트용 ===

    @Query("SELECT us.user.userId FROM UserSetting us " +
            "WHERE us.systemNotification = true")
    List<Long> findUserIdsWithSystemNotificationEnabled();
}