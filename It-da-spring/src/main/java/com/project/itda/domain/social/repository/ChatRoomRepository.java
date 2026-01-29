package com.project.itda.domain.social.repository;

import com.project.itda.domain.social.entity.ChatRoom;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface ChatRoomRepository extends JpaRepository<ChatRoom, Long> {

    // 유저 ID를 통해 해당 유저가 참여하고 있는 활성화된 채팅방 목록 조회
    // ChatParticipant와 조인하여 유저의 userId 필드를 참조합니다.
    @Query("SELECT r FROM ChatRoom r JOIN r.participants p WHERE p.user.userId = :userId AND r.isActive = true")
    List<ChatRoom> findAllByUserId(@Param("userId") Long userId);

    // 방 이름으로 채팅방 검색 (필요 시)
    List<ChatRoom> findByRoomNameContaining(String roomName);

    Optional<ChatRoom> findByMeetingId(Long meetingId);
}