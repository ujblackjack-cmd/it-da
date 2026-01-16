package com.project.itda.domain.user.repository;

import com.project.itda.domain.user.entity.FollowRequest;
import com.project.itda.domain.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FollowRequestRepository extends JpaRepository<FollowRequest, Long> {

    boolean existsByRequesterAndTarget(User requester, User target);

    Optional<FollowRequest> findByRequesterAndTarget(User requester, User target);

    List<FollowRequest> findByTargetAndStatus(User target, FollowRequest.RequestStatus status);

    void deleteByRequesterAndTarget(User requester, User target);
}