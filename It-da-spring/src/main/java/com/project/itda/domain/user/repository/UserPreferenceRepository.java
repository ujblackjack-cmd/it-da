package com.project.itda.domain.user.repository;

import com.project.itda.domain.user.entity.UserPreference;
import com.project.itda.domain.user.enums.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserPreferenceRepository extends JpaRepository<UserPreference, Long> {

    Optional<UserPreference> findByUser_UserId(Long userId);

    @Query("SELECT up FROM UserPreference up " +
            "JOIN FETCH up.user " +
            "WHERE up.user.userId = :userId")
    Optional<UserPreference> findByUserIdWithUser(@Param("userId") Long userId);

    // === 성향별 조회 (AI 매칭용) ===

    List<UserPreference> findByEnergyType(EnergyType energyType);

    List<UserPreference> findByPurposeType(PurposeType purposeType);

    @Query("SELECT up FROM UserPreference up " +
            "WHERE up.energyType = :energyType " +
            "AND up.locationType = :locationType")
    List<UserPreference> findByEnergyAndLocation(@Param("energyType") EnergyType energyType,
                                                 @Param("locationType") LocationType locationType);

    // === 관심사 검색 (LIKE 쿼리) ===

    @Query("SELECT up FROM UserPreference up WHERE up.interests LIKE %:interest%")
    List<UserPreference> findByInterest(@Param("interest") String interest);

    // === 통계 쿼리 ===

    long countByEnergyType(EnergyType energyType);

    long countByBudgetType(BudgetType budgetType);

    @Query("SELECT up.energyType, COUNT(up) FROM UserPreference up GROUP BY up.energyType")
    List<Object[]> countByEnergyTypeGrouped();
}