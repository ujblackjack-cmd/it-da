package com.project.itda.domain.user.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "user_follow",
        uniqueConstraints = {
                @UniqueConstraint(columnNames = {"follower_id", "following_id"})
        })
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class UserFollow {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_follow_id")
    private Long userFollowId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "follower_id", nullable = false)
    private User follower;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "following_id", nullable = false)
    private User following;
}