package com.project.itda.domain.user.repository;

import com.project.itda.domain.user.entity.User;
import com.project.itda.domain.user.entity.UserFollow;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserFollowRepository extends JpaRepository<UserFollow, Long> {

    // ✅ 메서드 이름 변경 (오버로딩 문제 해결)
    boolean existsByFollowerAndFollowing(User follower, User following);

    Optional<UserFollow> findByFollowerAndFollowing(User follower, User following);

    @Query("SELECT uf.following FROM UserFollow uf WHERE uf.follower = :user")
    List<User> findAllFollowingsByUser(@Param("user") User user);

    @Query("SELECT uf.follower FROM UserFollow uf WHERE uf.following = :user")
    List<User> findAllFollowersByUser(@Param("user") User user);

    long countByFollower(User follower);

    long countByFollowing(User following);

    void deleteByFollowerAndFollowing(User follower, User following);
}