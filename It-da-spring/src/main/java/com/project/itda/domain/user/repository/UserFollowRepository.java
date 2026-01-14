package com.project.itda.domain.user.repository;

import com.project.itda.domain.user.entity.User;
import com.project.itda.domain.user.entity.UserFollow;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserFollowRepository extends JpaRepository<UserFollow, Long> {

    boolean existsByFollowerAndFollowing(User follower, User following);

    Optional<UserFollow> findByFollowerAndFollowing(User follower, User following);

    List<UserFollow> findByFollower(User follower);

    List<UserFollow> findByFollowing(User following);

    long countByFollower(User follower);

    long countByFollowing(User following);
}