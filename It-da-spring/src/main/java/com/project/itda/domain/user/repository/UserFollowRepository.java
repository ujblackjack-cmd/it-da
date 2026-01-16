package com.project.itda.domain.user.repository;

import com.project.itda.domain.user.entity.User;
import com.project.itda.domain.user.entity.UserFollow;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserFollowRepository extends JpaRepository<UserFollow, Long> {

    // ========== User 객체 기반 메서드 ==========

    // 팔로우 관계 존재 여부 확인 (User 객체)
    boolean existsByFollowerAndFollowing(User follower, User following);

    // 특정 팔로우 관계 찾기 (User 객체)
    Optional<UserFollow> findByFollowerAndFollowing(User follower, User following);

    // 내가 팔로우하는 사람들 (팔로잉 목록)
    List<UserFollow> findByFollower(User follower);

    // 나를 팔로우하는 사람들 (팔로워 목록)
    List<UserFollow> findByFollowing(User following);

    // 팔로잉 수 (내가 팔로우하는 사람 수)
    long countByFollower(User follower);

    // 팔로워 수 (나를 팔로우하는 사람 수)
    long countByFollowing(User following);

    // 팔로우 관계 삭제 (User 객체)
    void deleteByFollowerAndFollowing(User follower, User following);

    // ========== Long ID 기반 메서드 (@Query 사용) ==========

    // 팔로우 관계 존재 여부 확인 (ID)
    @Query("SELECT CASE WHEN COUNT(uf) > 0 THEN true ELSE false END FROM UserFollow uf WHERE uf.follower.userId = :followerId AND uf.following.userId = :followingId")
    boolean existsByFollowerIdAndFollowingId(@Param("followerId") Long followerId, @Param("followingId") Long followingId);

    // 특정 팔로우 관계 찾기 (ID)
    @Query("SELECT uf FROM UserFollow uf WHERE uf.follower.userId = :followerId AND uf.following.userId = :followingId")
    Optional<UserFollow> findByFollowerIdAndFollowingId(@Param("followerId") Long followerId, @Param("followingId") Long followingId);

    // 팔로워 수 (나를 팔로우하는 사람 수) - ID
    @Query("SELECT COUNT(uf) FROM UserFollow uf WHERE uf.following.userId = :followingId")
    int countByFollowingId(@Param("followingId") Long followingId);

    // 팔로잉 수 (내가 팔로우하는 사람 수) - ID
    @Query("SELECT COUNT(uf) FROM UserFollow uf WHERE uf.follower.userId = :followerId")
    int countByFollowerId(@Param("followerId") Long followerId);

    // 내 팔로워 목록 (나를 팔로우하는 사람들) - ID
    @Query("SELECT uf FROM UserFollow uf WHERE uf.following.userId = :followingId")
    List<UserFollow> findByFollowingId(@Param("followingId") Long followingId);

    // 내 팔로잉 목록 (내가 팔로우하는 사람들) - ID
    @Query("SELECT uf FROM UserFollow uf WHERE uf.follower.userId = :followerId")
    List<UserFollow> findByFollowerId(@Param("followerId") Long followerId);

    // 팔로우 관계 삭제 - ID
    @Modifying
    @Query("DELETE FROM UserFollow uf WHERE uf.follower.userId = :followerId AND uf.following.userId = :followingId")
    void deleteByFollowerIdAndFollowingId(@Param("followerId") Long followerId, @Param("followingId") Long followingId);
}